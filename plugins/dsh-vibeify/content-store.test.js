import test from "node:test";
import assert from "node:assert/strict";

import {
  CONTENT_STORE_KEY,
  CONTENT_STORE_VERSION,
  CONTENT_TTL_MS,
  MAX_CHAT_VIBE_RESERVE,
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

test("legacy preference questionnaires are discarded from the persisted magazine", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  storage.values.set(CONTENT_STORE_KEY, JSON.stringify({
    version: CONTENT_STORE_VERSION,
    answers: [],
    chunks: [
      { ...chunk("legacy-question"), kind: "questionnaire", title: "Choose the next direction", markdown: "Choose.\n\n- More music\n- More films", publishedAt: now },
      { ...chunk("current-article"), publishedAt: now },
    ],
  }));
  assert.deepEqual(getCachedStream(storage, now + 1).chunks.map(({ id }) => id), ["current-article"]);
  assert.deepEqual(appendCachedChunks(storage, [{ ...chunk("new-question"), kind: "questionnaire" }], now + 2), []);
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

test("editorial refills cannot evict the protected reserve of Chat-made Vibes", () => {
  const storage = memoryStorage();
  const base = 1_700_000_000_000;
  const chat = Array.from({ length: MAX_CHAT_VIBE_RESERVE + 12 }, (_, index) => chunk(`chat:${index}`, "Chat-made Vibe", {
    source: "chat-directed",
    publishedAt: base + index,
  }));
  const editorial = Array.from({ length: MAX_STREAM_CHUNKS + 20 }, (_, index) => chunk(`update:${index}`, "Editorial refill", {
    source: "fresh-stream",
    publishedAt: base + 1_000 + index,
  }));

  appendCachedChunks(storage, [...chat, ...editorial], base + 2_000);
  const cached = getCachedStream(storage, base + 2_001).chunks;
  const retainedChat = cached.filter(({ source }) => source === "chat-directed");
  assert.equal(cached.length, MAX_STREAM_CHUNKS);
  assert.equal(retainedChat.length, MAX_CHAT_VIBE_RESERVE);
  assert.equal(retainedChat[0].id, "chat:12");
  assert.equal(retainedChat.at(-1).id, `chat:${MAX_CHAT_VIBE_RESERVE + 11}`);
});

test("closed Chat Vibe envelopes restored from history share the protected Chat reserve", () => {
  const storage = memoryStorage();
  const base = 1_700_000_000_000;
  const musicVibes = Array.from({ length: 20 }, (_, index) => chunk(`stream:chat-music-${index}`, `Listen on [SoundCloud](https://soundcloud.com/example/track-${index}).`, {
    kind: "music",
    source: "fresh-stream",
    publishedAt: base + index,
  }));
  const editorial = Array.from({ length: MAX_STREAM_CHUNKS + 20 }, (_, index) => chunk(`stream:refill-${index}`, "Editorial refill", {
    source: "fresh-stream",
    publishedAt: base + 1_000 + index,
  }));

  appendCachedChunks(storage, [...musicVibes, ...editorial], base + 2_000);
  const cached = getCachedStream(storage, base + 2_001).chunks;
  assert.equal(cached.length, MAX_STREAM_CHUNKS);
  assert.deepEqual(
    cached.filter(({ id }) => id.startsWith("stream:chat-music-")).map(({ id }) => id),
    musicVibes.map(({ id }) => id),
  );
  assert.match(cached.find(({ id }) => id === "stream:chat-music-19").markdown, /soundcloud\.com/);
});

test("cold history scans retain the newest Chat Vibes even when older sessions finish scanning later", () => {
  const storage = memoryStorage();
  const base = 1_700_000_000_000;
  const recentMusic = Array.from({ length: 20 }, (_, index) => chunk(`stream:chat-recent-music-${index}`, "A recent song.", {
    kind: "music",
    source: "fresh-stream",
    publishedAt: base + 10_000 + index,
  }));
  const olderChat = Array.from({ length: MAX_CHAT_VIBE_RESERVE }, (_, index) => chunk(`stream:chat-older-${index}`, "An older Chat Vibe.", {
    source: "fresh-stream",
    publishedAt: base + index,
  }));
  const editorial = Array.from({ length: MAX_STREAM_CHUNKS }, (_, index) => chunk(`stream:refill-cold-${index}`, "Editorial refill", {
    source: "fresh-stream",
    publishedAt: base + 20_000 + index,
  }));

  // Session history reads complete concurrently, so append order cannot be
  // treated as publication order after a relaunch.
  appendCachedChunks(storage, [...recentMusic, ...editorial, ...olderChat], base + 30_000);
  const cached = getCachedStream(storage, base + 30_001).chunks;
  assert.deepEqual(
    cached.filter(({ id }) => id.startsWith("stream:chat-recent-music-")).map(({ id }) => id),
    recentMusic.map(({ id }) => id),
  );
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

test("legacy answer storage stays bounded for backward compatibility", () => {
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

test("deterministic welcome and bundled pages are rebuilt from the active plugin rather than persisted", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  const appended = appendCachedChunks(storage, [
    { ...chunk("welcome:one"), source: "welcome" },
    { ...chunk("bundle:one"), source: "bundle" },
    { ...chunk("chat:one"), source: "chat-directed" },
  ], now);
  assert.deepEqual(appended.map(({ id }) => id), ["chat:one"]);

  storage.values.set(CONTENT_STORE_KEY, JSON.stringify({
    version: 5,
    answers: [],
    chunks: [
      { ...chunk("old-bundle"), source: "bundle", publishedAt: now },
      { ...chunk("old-chat"), source: "chat-directed", publishedAt: now },
    ],
  }));
  assert.deepEqual(getCachedStream(storage, now + 1).chunks.map(({ id }) => id), ["old-chat"]);
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

test("legacy background-editor envelopes cannot survive as one raw Content note card", () => {
  const storage = memoryStorage();
  const now = 1_700_000_000_000;
  storage.values.set(CONTENT_STORE_KEY, JSON.stringify({
    version: 4,
    answers: [],
    chunks: [
      {
        ...chunk("leaked-background"),
        source: "chat-directed",
        title: "Content note:",
        markdown: '<vibe-chunk id="reserve-one" kind="article" title="First">First body.</vibe-chunk> <vibe-chunk id="reserve-two" kind="questionnaire" title="Second">- One\n- Two</vibe-chunk>',
        publishedAt: now,
      },
      { ...chunk("real-article"), source: "chat-directed", title: "A finished article", markdown: "Useful reader-facing material.", publishedAt: now },
    ],
  }));
  assert.deepEqual(getCachedStream(storage, now + 1).chunks.map(({ id }) => id), ["real-article"]);
});

test("completed Chat article repairs a same-ID progressive card without replacing other cards", async () => {
  const { reconcileCompletedChatChunks } = await import("./client-src/experience/content-store.js");
  const storage = memoryStorage(), now = 1_700_000_000_000;
  appendCachedChunks(storage, [chunk("stream:chat-sone-example", "early", {owner:"sone"}), chunk("run:other", "original")], now);
  reconcileCompletedChatChunks(storage, [chunk("stream:chat-sone-example", "final with image", {publishedAt:now,owner:"sone"}), chunk("run:other", "changed", {publishedAt:now})], now);
  assert.deepEqual(getCachedStream(storage, now).chunks.map(({markdown}) => markdown), ["final with image", "original"]);
});

test("completed reconciliation leaves legacy and other-owner cards intact", async () => {
  const { reconcileCompletedChatChunks } = await import("./client-src/experience/content-store.js");
  const storage = memoryStorage(), now = 1_700_000_000_000;
  appendCachedChunks(storage, [chunk("stream:chat-legacy", "legacy"), chunk("stream:chat-sa-same", "A", {owner:"sa"}), chunk("stream:chat-sb-same", "B", {owner:"sb"})], now);
  reconcileCompletedChatChunks(storage, [chunk("stream:chat-legacy", "wrong", {publishedAt:now}), chunk("stream:chat-sa-same", "new A", {owner:"sa",publishedAt:now}), chunk("stream:chat-sb-same", "wrong B", {owner:"sa",publishedAt:now})], now);
  assert.deepEqual(getCachedStream(storage, now).chunks.map(({markdown})=>markdown), ["legacy", "new A", "B"]);
});

test('completed replacement preserves all unrelated and legacy cards', async () => {
  const { replaceOwnedChatCopies } = await import('./client-src/experience/content-store.js');
  const legacy = chunk('stream:chat-legacy', 'legacy');
  const unrelated = chunk('run:other', 'other');
  const original = chunk('stream:chat-sa-same', 'old', {owner:'sa'});
  const updated = chunk('stream:chat-sa-same', 'new', {owner:'sa'});
  assert.deepEqual(replaceOwnedChatCopies([legacy, unrelated, original], [updated]), [legacy, unrelated, updated]);
  assert.deepEqual(replaceOwnedChatCopies([legacy, unrelated, original], []), [legacy, unrelated, original]);
  assert.deepEqual(replaceOwnedChatCopies([legacy], [chunk('stream:chat-legacy', 'bad')]), [legacy]);
});

test('placeholder-only cards are hidden while stored data and feedback survive writes', () => {
  const storage = memoryStorage(), now = 1700000000000;
  const placeholder = {...chunk('stream:chat-legacy','...markdown...'),publishedAt:now};
  storage.setItem(CONTENT_STORE_KEY, JSON.stringify({version:CONTENT_STORE_VERSION,chunks:[placeholder],answers:[]}));
  assert.equal(getCachedStream(storage,now).chunks.length,0);
  appendCachedChunks(storage,[chunk('run:new','Normal ...markdown... in prose')],now);
  const raw = JSON.parse(storage.getItem(CONTENT_STORE_KEY));
  assert.equal(raw.chunks[0].markdown,'...markdown...');
  assert.equal(getCachedStream(storage,now).chunks[0].markdown,'Normal ...markdown... in prose');
});

test('long articles survive persistence and rehydration intact', () => {
  const storage = memoryStorage(), now = 1_700_000_000_000;
  const markdown = 'Full paragraph.\n\n'.repeat(2000) + 'Final method note.';
  appendCachedChunks(storage, [chunk('long:article', markdown)], now);
  assert.equal(getCachedStream(storage, now + 1).chunks[0].markdown, markdown);
});

test('new oversized articles are rejected without erasing oversized existing entries', () => {
  const storage = memoryStorage(), now = 1_700_000_000_000;
  const oversized = 'x'.repeat(100_001);
  storage.values.set(CONTENT_STORE_KEY, JSON.stringify({version: CONTENT_STORE_VERSION, chunks: [{...chunk('old:long', oversized), publishedAt: now}], answers: []}));
  assert.deepEqual(appendCachedChunks(storage, [chunk('new:long', oversized)], now), []);
  appendCachedChunks(storage, [chunk('new:short')], now);
  assert.equal(getCachedStream(storage, now).chunks[0].markdown, oversized);
});

test('quota failure keeps the new article in memory, reports failure, and leaves stored content untouched', () => {
  const previousWindow = globalThis.window;
  const events = [];
  globalThis.window = {dispatchEvent: event => events.push(event.type)};
  try {
    const now = 1_700_000_000_000, prior = JSON.stringify({version:CONTENT_STORE_VERSION,chunks:[{...chunk('old:one'),publishedAt:now}],answers:[]});
    const storage = {getItem: () => prior, setItem: () => {throw new Error('quota');}};
    const result = appendCachedChunks(storage, [chunk('new:one')], now);
    assert.equal(result[0].markdown, 'Useful content');
    assert.deepEqual(events, ['dsh-vibeify:persistence-failure']);
    assert.equal(storage.getItem(CONTENT_STORE_KEY), prior);
  } finally { globalThis.window = previousWindow; }
});
