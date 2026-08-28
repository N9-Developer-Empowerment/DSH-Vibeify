export const STREAM_METRICS_KEY = "dsh-vibeify.stream-metrics.v1";
export const MAX_STREAM_METRICS = 200;
export const STREAM_METRIC_EVENTS = Object.freeze([
  "home-first-frame",
  "feed-restored",
  "chunk-appended",
  "questionnaire-answered",
  "editorial-direction-changed",
  "buffer-run-started",
  "buffer-run-complete",
  "buffer-low-water",
]);
export const STREAM_METRIC_SOURCES = Object.freeze(["bundle", "local-cache", "fresh-stream", "user"]);

const EVENT_SET = new Set(STREAM_METRIC_EVENTS);
const SOURCE_SET = new Set(STREAM_METRIC_SOURCES);
const TOKEN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

function cleanRecord(candidate, fallbackTimestamp) {
  if (candidate === null || typeof candidate !== "object") return null;
  const timestamp = candidate.timestamp === undefined ? fallbackTimestamp : candidate.timestamp;
  if (!EVENT_SET.has(candidate.event) || !SOURCE_SET.has(candidate.source)) return null;
  if (typeof candidate.recipeId !== "string" || !TOKEN.test(candidate.recipeId)) return null;
  if (!Number.isFinite(candidate.durationMs) || candidate.durationMs < 0 || candidate.durationMs > MAX_DURATION_MS) return null;
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return Object.freeze({
    event: candidate.event,
    recipeId: candidate.recipeId,
    durationMs: Math.round(candidate.durationMs * 10) / 10,
    source: candidate.source,
    timestamp,
  });
}

export function readStreamMetrics(storage) {
  if (storage === null || storage === undefined || typeof storage.getItem !== "function") return Object.freeze([]);
  try {
    const parsed = JSON.parse(storage.getItem(STREAM_METRICS_KEY) ?? "null");
    if (parsed === null || parsed.version !== 1 || !Array.isArray(parsed.records)) return Object.freeze([]);
    return Object.freeze(parsed.records.map((record) => cleanRecord(record, NaN)).filter(Boolean).slice(-MAX_STREAM_METRICS));
  } catch {
    return Object.freeze([]);
  }
}

/** Appends one content-free duration record. Unknown fields are never persisted. */
export function appendStreamMetric(storage, candidate, timestamp = Date.now()) {
  const record = cleanRecord(candidate, timestamp);
  if (record === null || storage === null || storage === undefined || typeof storage.setItem !== "function") return false;
  const records = [...readStreamMetrics(storage), record].slice(-MAX_STREAM_METRICS);
  try {
    storage.setItem(STREAM_METRICS_KEY, JSON.stringify({ version: 1, records }));
    return true;
  } catch {
    return false;
  }
}

export function formatStreamDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "";
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  if (milliseconds < 10_000) return `${(milliseconds / 1000).toFixed(1)} s`;
  return `${Math.round(milliseconds / 1000)} s`;
}
