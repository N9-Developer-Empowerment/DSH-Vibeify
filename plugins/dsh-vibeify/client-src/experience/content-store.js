export const CONTENT_STORE_KEY = "dsh-vibeify.feed.v2";
export const CONTENT_STORE_VERSION = 2;
export const CONTENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_STREAM_CHUNKS = 160;
export const MAX_STREAM_ANSWERS = 32;

const MAX_MARKDOWN = 16_000;
const MAX_TITLE = 180;
const MAX_LABEL = 72;
const ID = /^[a-z0-9][a-z0-9_.:-]{0,95}$/;
const TOKEN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const KINDS = new Set(["article", "editorial", "recommendation", "image", "music", "video", "questionnaire"]);
const SOURCES = new Set(["bundle", "fresh-stream"]);

function cleanText(value, limit, multiline = false) {
  if (typeof value !== "string") return null;
  const control = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g;
  const cleaned = value
    .replace(control, multiline ? "" : " ")
    .replace(multiline ? /[ \t]+\n/g : /\s+/g, multiline ? "\n" : " ")
    .trim();
  return cleaned.length === 0 ? null : cleaned.slice(0, limit);
}

function cleanId(value) {
  const id = cleanText(value, 96);
  return id !== null && ID.test(id) ? id : null;
}

function cleanToken(value) {
  const token = cleanText(value, 64);
  return token !== null && TOKEN.test(token) ? token : null;
}

function cleanChunk(candidate, now) {
  if (candidate === null || typeof candidate !== "object") return null;
  const id = cleanId(candidate.id);
  const kind = KINDS.has(candidate.kind) ? candidate.kind : null;
  const source = SOURCES.has(candidate.source) ? candidate.source : null;
  const title = cleanText(candidate.title, MAX_TITLE);
  const markdown = cleanText(candidate.markdown, MAX_MARKDOWN, true);
  const topicId = candidate.topicId === undefined ? null : cleanToken(candidate.topicId);
  const publishedAt = Number(candidate.publishedAt);
  if (id === null || kind === null || source === null || title === null || markdown === null) return null;
  if (!Number.isFinite(publishedAt) || publishedAt <= 0 || publishedAt > now + 5 * 60 * 1000) return null;
  if (now - publishedAt > CONTENT_TTL_MS) return null;
  return Object.freeze({ id, kind, source, title, markdown, topicId, publishedAt });
}

function cleanAnswer(candidate, now) {
  if (candidate === null || typeof candidate !== "object") return null;
  const chunkId = cleanId(candidate.chunkId);
  const label = cleanText(candidate.label, MAX_LABEL);
  const answeredAt = Number(candidate.answeredAt);
  if (chunkId === null || label === null || !Number.isFinite(answeredAt) || answeredAt <= 0) return null;
  if (answeredAt > now + 5 * 60 * 1000 || now - answeredAt > CONTENT_TTL_MS) return null;
  return Object.freeze({ chunkId, label, answeredAt });
}

function emptyStore() {
  return Object.freeze({ version: CONTENT_STORE_VERSION, chunks: Object.freeze([]), answers: Object.freeze([]) });
}

function readStore(storage, now = Date.now()) {
  if (storage === null || storage === undefined || typeof storage.getItem !== "function") return emptyStore();
  try {
    const parsed = JSON.parse(storage.getItem(CONTENT_STORE_KEY) ?? "null");
    if (parsed === null || typeof parsed !== "object" || parsed.version !== CONTENT_STORE_VERSION) return emptyStore();
    const chunks = [];
    const seen = new Set();
    for (const candidate of Array.isArray(parsed.chunks) ? parsed.chunks : []) {
      const chunk = cleanChunk(candidate, now);
      if (chunk === null || seen.has(chunk.id)) continue;
      seen.add(chunk.id);
      chunks.push(chunk);
    }
    const answers = new Map();
    for (const candidate of Array.isArray(parsed.answers) ? parsed.answers : []) {
      const answer = cleanAnswer(candidate, now);
      if (answer !== null) answers.set(answer.chunkId, answer);
    }
    return Object.freeze({
      version: CONTENT_STORE_VERSION,
      chunks: Object.freeze(chunks.slice(-MAX_STREAM_CHUNKS)),
      answers: Object.freeze([...answers.values()].slice(-MAX_STREAM_ANSWERS)),
    });
  } catch {
    return emptyStore();
  }
}

function writeStore(storage, store) {
  if (storage === null || storage === undefined || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(CONTENT_STORE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function getCachedStream(storage, now = Date.now()) {
  return readStore(storage, now);
}

/** Append-only by id: an existing entry is retained and is never rewritten in place. */
export function appendCachedChunks(storage, candidates, now = Date.now()) {
  if (!Array.isArray(candidates) || !Number.isFinite(now) || now <= 0) return Object.freeze([]);
  const current = readStore(storage, now);
  const chunks = [...current.chunks];
  const seen = new Set(chunks.map(({ id }) => id));
  const appended = [];
  for (const candidate of candidates) {
    const chunk = cleanChunk({ ...candidate, publishedAt: candidate?.publishedAt ?? now }, now);
    if (chunk === null || seen.has(chunk.id)) continue;
    seen.add(chunk.id);
    chunks.push(chunk);
    appended.push(chunk);
  }
  if (appended.length === 0) return Object.freeze([]);
  const bounded = chunks.slice(-MAX_STREAM_CHUNKS);
  writeStore(storage, { version: CONTENT_STORE_VERSION, chunks: bounded, answers: current.answers });
  return Object.freeze(appended.filter(({ id }) => bounded.some((chunk) => chunk.id === id)));
}

/** Stores one short visible answer label. Prompts, sessions, accounts and arbitrary form data are rejected. */
export function saveStreamAnswer(storage, chunkId, label, now = Date.now()) {
  const answer = cleanAnswer({ chunkId, label, answeredAt: now }, now);
  if (answer === null) return false;
  const current = readStore(storage, now);
  const answers = current.answers.filter((entry) => entry.chunkId !== answer.chunkId);
  answers.push(answer);
  return writeStore(storage, {
    version: CONTENT_STORE_VERSION,
    chunks: current.chunks,
    answers: answers.slice(-MAX_STREAM_ANSWERS),
  });
}

export function getStreamAnswerLabels(storage, now = Date.now()) {
  return Object.freeze(readStore(storage, now).answers.map(({ label }) => label));
}
