import test from "node:test";
import assert from "node:assert/strict";

import {
  CONTENT_STORE_KEY,
  CONTENT_STORE_VERSION,
  CONTENT_TTL_MS,
  MAX_STREAM_CHUNKS,
  appendCachedChunks,
  getCachedStream,
  getStreamAnswerLabels,
  saveStreamAnswer,
} from "./client-src/experience/content-store.js";

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function chunk(id, markdown = "Useful content", extra = {}) {
  return { id, kind: "article", source: "fresh-stream", title: `Title ${id}`, markdown, topicId: null, ...extra };
}

test("stream cache appends in reading order and never rewrites an existing chunk", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  assert.equal(appendCachedChunks(storage, [chunk("run-1:first"), chunk("run-1:second")], now).length, 2);
  assert.equal(appendCachedChunks(storage, [chunk("run-1:first", "replacement"), chunk("run-2:third")], now + 1).length, 1);
  const cached = getCachedStream(storage, now + 2);
  assert.deepEqual(cached.chunks.map(({ id }) => id), ["run-1:first", "run-1:second", "run-2:third"]);
  assert.equal(cached.chunks[0].markdown, "Useful content");
});

test("stream cache restores previous content and discards stale or corrupt data", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  appendCachedChunks(storage, [chunk("run-1:first")], now);
  assert.equal(getCachedStream(storage, now + CONTENT_TTL_MS - 1).chunks.length, 1);
  assert.equal(getCachedStream(storage, now + CONTENT_TTL_MS + 1).chunks.length, 0);
  storage.values.set(CONTENT_STORE_KEY, "not json");
  assert.deepEqual(getCachedStream(storage, now), { version: CONTENT_STORE_VERSION, chunks: [], answers: [] });
});

test("stream cache is bounded without changing the order of retained entries", () => {
  const storage = memoryStorage();
  const base = 1_700_000_000_000;
  const chunks = Array.from({ length: MAX_STREAM_CHUNKS + 8 }, (_, index) => chunk(`run:${index}`));
  appendCachedChunks(storage, chunks, base);
  const cached = getCachedStream(storage, base + 1);
  assert.equal(cached.chunks.length, MAX_STREAM_CHUNKS);
  assert.equal(cached.chunks[0].id, "run:8");
  assert.equal(cached.chunks.at(-1).id, `run:${MAX_STREAM_CHUNKS + 7}`);
});

test("only allow-listed content fields survive persistence", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  appendCachedChunks(storage, [{
    ...chunk("safe:one"),
    prompt: "discard",
    session: "discard",
    account: "discard",
    attachment: "discard",
  }], now);
  const cached = getCachedStream(storage, now + 1).chunks[0];
  assert.deepEqual(Object.keys(cached).sort(), ["id", "kind", "markdown", "publishedAt", "source", "title", "topicId", "tribes"]);
});

test("questionnaire answers are bounded visible labels and shape later refills", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  assert.equal(saveStreamAnswer(storage, "bundle:question", "More original creators", now), true);
  assert.equal(saveStreamAnswer(storage, "bundle:question", "A deeper read", now + 1), true);
  assert.deepEqual(getStreamAnswerLabels(storage, now + 2), ["A deeper read"]);
  const raw = JSON.parse(storage.values.get(CONTENT_STORE_KEY));
  assert.deepEqual(Object.keys(raw.answers[0]).sort(), ["answeredAt", "chunkId", "label"]);
});

test("unavailable or quota-failing storage never blocks the in-memory stream", () => {
  assert.equal(appendCachedChunks(null, [chunk("run:first")]).length, 1);
  const quota = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
  assert.equal(appendCachedChunks(quota, [chunk("run:first")]).length, 1);
  assert.equal(saveStreamAnswer(quota, "run:first", "Useful"), false);
});

test("completed Chat answers persist locally with the shared magazine but prompts and session ids are absent", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  const appended = appendCachedChunks(storage, [{
    id: "chat-result-safehash",
    kind: "article",
    source: "chat-directed",
    title: "Finished answer",
    markdown: "Only the rendered assistant answer.",
    topicId: null,
    publishedAt: now,
  }], now);
  assert.equal(appended.length, 1);
  const raw = storage.values.get(CONTENT_STORE_KEY);
  assert.match(raw, /Finished answer/);
  assert.doesNotMatch(raw, /user prompt|session-/i);
  assert.equal(getCachedStream(storage, now + 1).chunks[0].source, "chat-directed");
});

test("legacy worker reports and update summaries are removed from the reader cache", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  storage.values.set(CONTENT_STORE_KEY, JSON.stringify({
    version: 3,
    answers: [],
    chunks: [
      { ...chunk("legacy-worker"), source: "chat-directed", title: "Worker report — three candidates", markdown: "No final copy written (per task)." , publishedAt: now },
      { ...chunk("legacy-update"), source: "chat-directed", title: "VIBE magazine update", markdown: "Update `refill-old` completed with eight items.", publishedAt: now },
      { ...chunk("real-chat"), source: "chat-directed", title: "A finished guide", markdown: "Useful reader-facing material.", publishedAt: now },
    ],
  }));
  assert.deepEqual(getCachedStream(storage, now + 1).chunks.map(({ id }) => id), ["real-chat"]);
});
