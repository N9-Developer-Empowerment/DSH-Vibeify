export const LEARNING_STORE_KEY = "dsh-vibeify.learning.v1";
export const LEARNING_STORE_VERSION = 1;
export const LEARNING_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const MAX_LEARNING_EVENTS = 400;

const EVENTS = new Set(["saved", "opened", "played", "answered", "skipped"]);
const KINDS = new Set(["article", "editorial", "recommendation", "image", "music", "video", "questionnaire"]);
const ID = /^[a-z0-9][a-z0-9_.:-]{0,95}$/;
const TRIBE = /^[a-z0-9][a-z0-9-]{0,47}$/;

function cleanText(value, limit) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length === 0 ? null : cleaned.slice(0, limit);
}

function cleanEvent(candidate, now) {
  if (candidate === null || typeof candidate !== "object" || !EVENTS.has(candidate.event)) return null;
  const chunkId = cleanText(candidate.chunkId, 96);
  const kind = KINDS.has(candidate.kind) ? candidate.kind : "article";
  const at = Number(candidate.at);
  if (chunkId === null || !ID.test(chunkId) || !Number.isFinite(at) || at <= 0 || at > now + 5 * 60 * 1000 || now - at > LEARNING_TTL_MS) return null;
  const tribes = [...new Set((Array.isArray(candidate.tribes) ? candidate.tribes : [])
    .filter((value) => typeof value === "string" && TRIBE.test(value)))].slice(0, 8);
  const label = candidate.event === "answered" ? cleanText(candidate.label, 72) : null;
  if (candidate.event === "answered" && label === null) return null;
  return Object.freeze({ event: candidate.event, chunkId, kind, tribes: Object.freeze(tribes), ...(label === null ? {} : { label }), at });
}

function emptyStore() {
  return Object.freeze({ version: LEARNING_STORE_VERSION, events: Object.freeze([]) });
}

function readStore(storage, now = Date.now()) {
  if (storage === null || storage === undefined || typeof storage.getItem !== "function") return emptyStore();
  try {
    const parsed = JSON.parse(storage.getItem(LEARNING_STORE_KEY) ?? "null");
    if (parsed === null || typeof parsed !== "object" || parsed.version !== LEARNING_STORE_VERSION) return emptyStore();
    const events = (Array.isArray(parsed.events) ? parsed.events : []).map((entry) => cleanEvent(entry, now)).filter(Boolean).slice(-MAX_LEARNING_EVENTS);
    return Object.freeze({ version: LEARNING_STORE_VERSION, events: Object.freeze(events) });
  } catch {
    return emptyStore();
  }
}

function writeStore(storage, events) {
  if (storage === null || storage === undefined || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(LEARNING_STORE_KEY, JSON.stringify({ version: LEARNING_STORE_VERSION, events }));
    return true;
  } catch {
    return false;
  }
}

export function appendLearningEvent(storage, candidate, now = Date.now()) {
  const event = cleanEvent({ ...candidate, at: candidate?.at ?? now }, now);
  if (event === null) return false;
  const current = readStore(storage, now).events;
  return writeStore(storage, [...current, event].slice(-MAX_LEARNING_EVENTS));
}

export function getLearningEvents(storage, now = Date.now()) {
  return readStore(storage, now).events;
}

export function resetEditorialLearning(storage) {
  if (storage === null || storage === undefined || typeof storage.removeItem !== "function") return false;
  try { storage.removeItem(LEARNING_STORE_KEY); return true; } catch { return false; }
}

export function summarizeEditorialLearning(events) {
  const rows = Array.isArray(events) ? events : [];
  const eventCounts = new Map();
  const kindCounts = new Map();
  const tribeCounts = new Map();
  const answers = [];
  for (const row of rows.slice(-120)) {
    if (row === null || typeof row !== "object" || !EVENTS.has(row.event)) continue;
    eventCounts.set(row.event, (eventCounts.get(row.event) ?? 0) + 1);
    if (KINDS.has(row.kind)) kindCounts.set(row.kind, (kindCounts.get(row.kind) ?? 0) + (row.event === "skipped" ? -1 : 1));
    for (const tribe of Array.isArray(row.tribes) ? row.tribes : []) tribeCounts.set(tribe, (tribeCounts.get(tribe) ?? 0) + (row.event === "skipped" ? -1 : 1));
    if (row.event === "answered" && typeof row.label === "string") answers.push(row.label);
  }
  const top = (map) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).filter(([, score]) => score > 0).slice(0, 4).map(([id]) => id);
  return Object.freeze({
    eventCounts: Object.freeze(Object.fromEntries(eventCounts)),
    preferredKinds: Object.freeze(top(kindCounts)),
    preferredTribes: Object.freeze(top(tribeCounts)),
    questionnaireAnswers: Object.freeze([...new Set(answers)].slice(-12)),
  });
}
