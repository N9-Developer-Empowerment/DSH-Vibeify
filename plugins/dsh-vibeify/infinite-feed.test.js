import test from "node:test";
import assert from "node:assert/strict";

import { createExperienceCatalog } from "./client-src/experience/catalog.js";
import { createEditorialEdition } from "./client-src/experience/editorial.js";
import {
  createBundledStream,
  newestFirst,
  questionnaireOptions,
  visualEpisodeForChunk,
} from "./client-src/experience/feed.js";

const catalog = createEditorialEdition(createExperienceCatalog(), "2026-08-28");

test("the bundled stream is a deterministic substantial first-visit content well", () => {
  const first = createBundledStream(catalog, "2026-08-28", 72);
  const again = createBundledStream(catalog, "2026-08-28", 72);
  assert.deepEqual(first, again);
  assert.equal(first.length, 72);
  assert.equal(new Set(first.map(({ id }) => id)).size, 72);
  assert.ok(first.every(({ title, markdown }) => title.length > 0 && markdown.length > 40));
});

test("instant content mixes articles, images and optional questionnaires without a guide gate", () => {
  const stream = createBundledStream(catalog, "2026-08-28", 36);
  const kinds = new Set(stream.map(({ kind }) => kind));
  assert.ok(kinds.has("article"));
  assert.ok(kinds.has("image"));
  assert.ok(kinds.has("questionnaire"));
  const question = stream.find(({ kind }) => kind === "questionnaire");
  assert.ok(questionnaireOptions(question.markdown).length >= 2);
  for (const chunk of stream.filter(({ topicId }) => topicId !== null)) assert.ok(catalog.byId[chunk.topicId]);
});

test("the feed presents newest arrivals first without mutating append-only storage order", () => {
  const stored = Object.freeze([
    Object.freeze({ id: "oldest" }),
    Object.freeze({ id: "middle" }),
    Object.freeze({ id: "newest" }),
  ]);
  assert.deepEqual(newestFirst(stored).map(({ id }) => id), ["newest", "middle", "oldest"]);
  assert.deepEqual(stored.map(({ id }) => id), ["oldest", "middle", "newest"]);
});

test("every valid stream tile receives a stable locally bundled photograph", () => {
  const stream = createBundledStream(catalog, "2026-08-28", 36);
  const chatChunk = Object.freeze({ id: "chat-result-43", topicId: null });
  for (const chunk of [...stream, chatChunk]) {
    const first = visualEpisodeForChunk(catalog, chunk);
    const again = visualEpisodeForChunk(catalog, chunk);
    assert.ok(first?.photo?.kind === "photograph");
    assert.equal(first, again);
  }
  const topicChunk = stream.find(({ topicId }) => topicId !== null);
  assert.equal(visualEpisodeForChunk(catalog, topicChunk).id, topicChunk.topicId);
});
