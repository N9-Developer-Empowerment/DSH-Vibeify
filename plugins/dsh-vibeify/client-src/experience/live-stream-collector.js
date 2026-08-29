import { extractPublishedChunks } from "./vibe-result.js";

const MAX_LIVE_TEXT = 96_000;
const SUBSCRIBE_TIMEOUT_MS = 1_500;

function textFromMessage(event) {
  if (event?.type !== "assistant/message") return "";
  const content = Array.isArray(event.data?.message?.content) ? event.data.message.content : [];
  return content
    .filter((block) => (block?.type === "text" || block?.type === "reasoning") && typeof block.text === "string")
    .map(({ text }) => text)
    .join("\n");
}

function textFromFrame(frame) {
  if (frame?.type !== "session/event") return "";
  const event = frame.event;
  if (event?.type === "assistant/chunk") {
    const chunk = event.data?.chunk;
    if ((chunk?.type === "text-delta" || chunk?.type === "reasoning-delta") && typeof chunk.text === "string") {
      return chunk.text;
    }
  }
  return textFromMessage(event);
}

export function freshStreamChunk(chunk, publishedAt = Date.now()) {
  if (chunk === null || typeof chunk !== "object" || !Number.isFinite(publishedAt) || publishedAt <= 0) return null;
  return Object.freeze({
    id: `stream:${chunk.id}`,
    kind: chunk.kind,
    source: "fresh-stream",
    title: chunk.title,
    markdown: chunk.markdown,
    topicId: null,
    publishedAt,
  });
}

export function extractRunChunks(text, runId, publishedAt = Date.now()) {
  if (runId !== null && (typeof runId !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(runId))) return Object.freeze([]);
  return Object.freeze(extractPublishedChunks(text)
    .filter(({ id }) => runId === null ? id.startsWith("chat-") : id.startsWith(`${runId}-`))
    .map((chunk) => freshStreamChunk(chunk, publishedAt))
    .filter(Boolean));
}

export function freshStreamChunksFromEvents(entries, runId = null, publishedAt = Date.now()) {
  const source = (Array.isArray(entries) ? entries : [])
    .map((entry) => entry?.event ?? entry)
    .map(textFromMessage)
    .filter(Boolean)
    .join("\n");
  const chunks = extractPublishedChunks(source)
    .filter(({ id }) => runId === null ? id.startsWith("refill-") || id.startsWith("chat-") : id.startsWith(`${runId}-`))
    .map((chunk) => freshStreamChunk(chunk, publishedAt))
    .filter(Boolean);
  return Object.freeze(chunks);
}

export function createLiveChunkCollector({ runId, now = Date.now }) {
  let text = "";
  const seen = new Set();
  return Object.freeze({
    push(frame) {
      const delta = textFromFrame(frame);
      if (delta.length === 0) return Object.freeze([]);
      text = `${text}${delta}`.slice(-MAX_LIVE_TEXT);
      const ready = extractRunChunks(text, runId, now()).filter(({ id }) => !seen.has(id));
      for (const chunk of ready) seen.add(chunk.id);
      return Object.freeze(ready);
    },
  });
}

function muxUrl() {
  const url = new URL("/api/events.mux", window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url;
}

function frameFromMessage(event) {
  if (typeof event?.data !== "string") return null;
  try {
    const envelope = JSON.parse(event.data);
    return envelope?.payload !== null && typeof envelope?.payload === "object" ? envelope.payload : null;
  } catch {
    return null;
  }
}

function unavailableStream() {
  return Object.freeze({ ready: Promise.resolve(false), close() {} });
}

function openMuxStream({ onFrame, readyWhen = null, readyOnOpen = false }) {
  if (typeof WebSocket !== "function"
    || typeof onFrame !== "function"
    || typeof window === "undefined"
    || typeof window.location?.origin !== "string"
    || typeof window.setTimeout !== "function"
    || typeof window.clearTimeout !== "function") return unavailableStream();
  let socket;
  let closed = false;
  let resolveReady;
  let readyDone = false;
  let timeout = null;
  const ready = new Promise((resolve) => { resolveReady = resolve; });
  const settleReady = (value) => {
    if (readyDone) return;
    readyDone = true;
    if (timeout !== null) window.clearTimeout(timeout);
    resolveReady(value);
  };
  timeout = window.setTimeout(() => settleReady(false), SUBSCRIBE_TIMEOUT_MS);
  try {
    socket = new WebSocket(muxUrl());
  } catch {
    settleReady(false);
    return Object.freeze({ ready, close() {} });
  }
  socket.addEventListener("message", (event) => {
    const frame = frameFromMessage(event);
    if (frame === null) return;
    if (typeof readyWhen === "function" && readyWhen(frame)) settleReady(true);
    onFrame(frame);
  });
  socket.addEventListener("open", () => { if (readyOnOpen) settleReady(true); });
  socket.addEventListener("error", () => settleReady(false));
  socket.addEventListener("close", () => settleReady(false));
  return Object.freeze({
    ready,
    close() {
      if (closed) return;
      closed = true;
      settleReady(false);
      if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) socket.close();
    },
  });
}

/**
 * Listen to the existing DSH mux protocol without selecting or rendering the
 * dedicated update session. Complete closed envelopes are released as soon as
 * their final delimiter arrives; partial prose and worker output are ignored.
 */
export function openLiveChunkStream({ sessionId, runId, onChunks }) {
  if (typeof onChunks !== "function") return unavailableStream();
  const collector = createLiveChunkCollector({ runId });
  return openMuxStream({
    readyWhen: (frame) => frame?.type === "session/subscribed" && frame.sessionId === sessionId,
    onFrame(frame) {
      if (frame?.type !== "session/event" || frame.sessionId !== sessionId) return;
      const chunks = collector.push(frame);
      if (chunks.length > 0) onChunks(chunks);
    },
  });
}

/**
 * Passively follow all ordinary Chat sessions on the existing mux. Only a
 * complete `chat-` envelope crosses this boundary; partial prose and the
 * dedicated update namespace are ignored.
 */
export function openLiveChatChunkStream({ acceptSession, onChunks }) {
  if (typeof acceptSession !== "function" || typeof onChunks !== "function") return unavailableStream();
  const collectors = new Map();
  return openMuxStream({
    readyOnOpen: true,
    onFrame(frame) {
      if (frame?.type !== "session/event" || typeof frame.sessionId !== "string") return;
      if (frame.event?.type === "turn/end") {
        collectors.delete(frame.sessionId);
        return;
      }
      if (!acceptSession(frame.sessionId)) return;
      let collector = collectors.get(frame.sessionId);
      if (collector === undefined) {
        collector = createLiveChunkCollector({ runId: null });
        collectors.set(frame.sessionId, collector);
      }
      const chunks = collector.push(frame);
      if (chunks.length > 0) onChunks(frame.sessionId, chunks);
    },
  });
}
