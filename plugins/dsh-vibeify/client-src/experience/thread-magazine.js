import { appendCachedChunks } from "./content-store.js";
import { freshStreamChunksFromEvents } from "./live-stream-collector.js";
import { readUpdateSessionId } from "./update-session.js";
import { isBackgroundSession } from "./background-session.js";
import {
  stripDuplicatedLeadTitle,
  VIBE_CHAT_RESULT_EVENT,
  VIBE_STREAM_CHUNKS_EVENT,
} from "./vibe-result.js";

const MAX_HISTORY_MESSAGES = 50;
const MAX_CONCURRENT_HISTORY_READS = 4;
const MAX_TITLE = 180;
const MAX_MARKDOWN = 16_000;

function digest(value) {
  let first = 2166136261;
  let second = 2246822507;
  for (const character of String(value)) {
    const point = character.codePointAt(0);
    first = Math.imul(first ^ point, 16777619);
    second = Math.imul(second ^ point, 3266489909);
  }
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

function safeStorage() {
  try { return window.localStorage; } catch { return null; }
}

function messageBlocks(event, types) {
  const content = Array.isArray(event?.data?.message?.content) ? event.data.message.content : [];
  return content
    .filter((block) => block !== null && typeof block === "object" && types.has(block.type) && typeof block.text === "string")
    .map(({ text }) => text.trim())
    .filter(Boolean);
}

function titleFromMarkdown(markdown) {
  const heading = markdown.match(/^#{1,3}\s+(.+)$/m)?.[1]
    ?? markdown.match(/^\*\*([^*]+)\*\*/m)?.[1]
    ?? markdown.split(/\n/).find((line) => line.trim().length > 0)
    ?? "From Chat";
  const plain = heading
    .replace(/\[([^\]]+)\]\([^\s)]+\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (plain || "From Chat").slice(0, MAX_TITLE);
}

function completedTurns(events) {
  const completed = new Map();
  for (const event of events) {
    if (event?.type !== "turn/end" || event.data?.reason?.kind !== "completed") continue;
    completed.set(event.data.turn, event);
  }
  return completed;
}

function eligibleAssistantMessages(events, turn, endSeq) {
  return events.filter((event) => event?.type === "assistant/message"
    && event.data?.turn === turn
    && event.seq < endSeq
    && event.data?.interrupted !== true
    && event.data?.message?.role === "assistant");
}

function chatChunk(sessionId, event, publishedAt) {
  if (event === null || event === undefined) return null;
  const blocks = messageBlocks(event, new Set(["text"]));
  const hasToolCall = Array.isArray(event?.data?.message?.content)
    && event.data.message.content.some((block) => block?.type === "tool-call");
  const originalMarkdown = blocks.join("\n\n").trim().slice(0, MAX_MARKDOWN);
  if (hasToolCall || originalMarkdown.length === 0) return null;
  const title = titleFromMarkdown(originalMarkdown);
  const markdown = stripDuplicatedLeadTitle(originalMarkdown, title);
  if (markdown.length === 0) return null;
  const messageId = event.data?.message?.id ?? `${event.data?.turn}:${event.data?.step}:${event.seq}`;
  const recommendation = /\[[^\]]+\]\(https?:\/\//i.test(markdown) || /^[-*]\s+/m.test(markdown);
  return Object.freeze({
    id: `chat-result-${digest(`${sessionId}:${messageId}`)}`,
    kind: recommendation ? "recommendation" : "article",
    source: "chat-directed",
    title,
    markdown,
    topicId: null,
    publishedAt,
  });
}

function streamChunks(_sessionId, messages, publishedAt) {
  return freshStreamChunksFromEvents(messages, null, publishedAt);
}

/** Project only completed assistant output; prompts and incomplete work are never copied. */
export function completedHistoryMagazineChunks(sessionId, entries, { allowChatFallback = true } = {}) {
  if (typeof sessionId !== "string" || !Array.isArray(entries)) return Object.freeze([]);
  const events = entries.map((entry) => entry?.event ?? entry).filter((event) => event !== null && typeof event === "object");
  const completed = completedTurns(events);
  const chunks = [];
  const seen = new Set();
  for (const [turn, end] of completed) {
    const messages = eligibleAssistantMessages(events, turn, end.seq);
    const published = streamChunks(sessionId, messages, end.time);
    const candidates = published.length > 0
      ? published
      : allowChatFallback
        ? [chatChunk(sessionId, [...messages].reverse().find((message) => messageBlocks(message, new Set(["text"])).length > 0), end.time)].filter(Boolean)
        : [];
    for (const chunk of candidates) {
      if (seen.has(chunk.id)) continue;
      seen.add(chunk.id);
      chunks.push(chunk);
    }
  }
  return Object.freeze(chunks);
}

export function sessionNeedsMagazineScan(summary, scanned) {
  if (summary === null || typeof summary !== "object" || summary.running === true || summary.blank === true) return false;
  if (summary.origin === "subagent") return false;
  if (typeof summary.id !== "string" || !Number.isFinite(summary.updatedAt)) return false;
  return scanned.get(summary.id) !== summary.updatedAt;
}

/** Read every local history page without opening, resuming, or prompting the session. */
export async function readCompleteSessionHistory(api, sessionId) {
  const pages = [];
  let beforeSeq;
  let previousBoundary = Number.POSITIVE_INFINITY;
  while (true) {
    let response;
    try {
      response = await api.sessions.history({
        sessionId,
        maxMessages: MAX_HISTORY_MESSAGES,
        ...(beforeSeq === undefined ? {} : { beforeSeq }),
      });
    } catch {
      return null;
    }
    if (!response?.result?.ok) return null;
    const entries = Array.isArray(response.result.value.events) ? response.result.value.events : [];
    pages.unshift(entries);
    if (response.result.value.hasMore !== true) break;
    const boundary = Math.min(...entries
      .map((entry) => entry?.event?.seq ?? entry?.seq)
      .filter(Number.isFinite));
    if (!Number.isFinite(boundary) || boundary >= previousBoundary) return null;
    previousBoundary = boundary;
    beforeSeq = boundary;
  }
  const seen = new Set();
  return pages.flat().filter((entry) => {
    const seq = entry?.event?.seq ?? entry?.seq;
    if (!Number.isFinite(seq) || seen.has(seq)) return false;
    seen.add(seq);
    return true;
  });
}

/** Read all idle local DSH histories and maintain one magazine across sessions. */
export function installThreadMagazineBridge(ctx) {
  const connection = ctx.get("connection");
  const sessions = ctx.get("sessions");
  ctx.effect(() => {
    let disposed = false;
    let scheduled = false;
    const scanned = new Map();
    const inFlight = new Set();
    const pending = new Map();
    let pump = () => {};

    const scan = async (summary) => {
      if (disposed || inFlight.has(summary.id) || isBackgroundSession(summary, safeStorage()) || !sessionNeedsMagazineScan(summary, scanned)) return;
      inFlight.add(summary.id);
      try {
        const entries = await readCompleteSessionHistory(connection.api, summary.id);
        if (entries === null || disposed) return;
        const updateSessionId = readUpdateSessionId(safeStorage());
        const chunks = completedHistoryMagazineChunks(summary.id, entries, {
          allowChatFallback: summary.id !== updateSessionId,
        });
        scanned.set(summary.id, summary.updatedAt);
        if (chunks.length === 0) return;
        appendCachedChunks(safeStorage(), chunks);
        const chatChunks = chunks.filter(({ source }) => source === "chat-directed");
        const streamChunksFound = chunks.filter(({ source }) => source === "fresh-stream");
        for (const chunk of chatChunks) {
          window.dispatchEvent(new CustomEvent(VIBE_CHAT_RESULT_EVENT, { detail: { chunk } }));
        }
        if (streamChunksFound.length > 0) {
          window.dispatchEvent(new CustomEvent(VIBE_STREAM_CHUNKS_EVENT, {
            detail: { runId: "manual", chunks: streamChunksFound, durationMs: 0 },
          }));
        }
      } finally {
        inFlight.delete(summary.id);
        pump();
      }
    };

    pump = () => {
      while (!disposed && inFlight.size < MAX_CONCURRENT_HISTORY_READS) {
        const next = [...pending.entries()].find(([id]) => !inFlight.has(id));
        if (next === undefined) return;
        const [id, summary] = next;
        pending.delete(id);
        void scan(summary);
      }
    };

    const scanAll = () => {
      scheduled = false;
      const snapshot = sessions.list.getSnapshot();
      for (const id of snapshot.ids ?? []) {
        const summary = snapshot.byId?.[id];
        if (!isBackgroundSession(summary, safeStorage()) && sessionNeedsMagazineScan(summary, scanned)) pending.set(id, summary);
      }
      pump();
    };
    const schedule = () => {
      if (disposed || scheduled) return;
      scheduled = true;
      queueMicrotask(scanAll);
    };
    const unsubscribe = sessions.list.subscribe(schedule);
    schedule();
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, "dsh-vibeify: completed threads to one local magazine");
}
