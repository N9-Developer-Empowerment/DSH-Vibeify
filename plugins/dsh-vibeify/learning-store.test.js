import assert from "node:assert/strict";
import test from "node:test";

import { appendLearningEvent, getLearningEvents, resetEditorialLearning, summarizeEditorialLearning } from "./client-src/experience/learning-store.js";

function storage() { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }; }
const NOW = Date.parse("2026-08-28T20:00:00Z");

test("explicit local interactions and questionnaire answers shape a bounded summary", () => {
  const local = storage();
  assert.equal(appendLearningEvent(local, { event: "saved", chunkId: "card-one", kind: "music", tribes: ["music-communities"] }, NOW), true);
  appendLearningEvent(local, { event: "answered", chunkId: "question-one", kind: "questionnaire", tribes: [], label: "More original creators" }, NOW + 1);
  appendLearningEvent(local, { event: "skipped", chunkId: "card-two", kind: "video", tribes: ["gamers"] }, NOW + 2);
  const summary = summarizeEditorialLearning(getLearningEvents(local, NOW + 3));
  assert.deepEqual(summary.preferredKinds, ["music", "questionnaire"]);
  assert.deepEqual(summary.preferredTribes, ["music-communities"]);
  assert.deepEqual(summary.questionnaireAnswers, ["More original creators"]);
  assert.equal(JSON.stringify(summary).includes("session"), false);
});

test("learning can be reset locally and rejects arbitrary event data", () => {
  const local = storage();
  assert.equal(appendLearningEvent(local, { event: "clicked-ad", chunkId: "x", kind: "article" }, NOW), false);
  appendLearningEvent(local, { event: "opened", chunkId: "card-one", kind: "article" }, NOW);
  assert.equal(resetEditorialLearning(local), true);
  assert.deepEqual(getLearningEvents(local, NOW), []);
});
