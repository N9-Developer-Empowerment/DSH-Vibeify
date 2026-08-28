import test from "node:test";
import assert from "node:assert/strict";

import { createExperienceCatalog } from "./client-src/experience/catalog.js";
import { CONTENT_RECIPES } from "./client-src/experience/recipes.js";
import { buildContinuousStreamPrompt } from "./client-src/experience/stream-recipe.js";
import { createRecipeEnvelope, createStreamEnvelope } from "./client-src/experience/recipe-runner.js";

test("one-click runner receives a complete immutable recipe envelope", () => {
  const episode = { ...createExperienceCatalog().byId["mirror-minute"], studioPrompt: CONTENT_RECIPES.skincare.prompt };
  const envelope = createRecipeEnvelope(episode);
  assert.deepEqual(Object.keys(envelope), ["id", "title", "prompt", "preview", "preferences"]);
  assert.equal(envelope.id, "mirror-minute");
  assert.equal(envelope.title, "Skin Care, Beautifully Sorted");
  assert.ok(envelope.prompt.length >= 1800);
  assert.equal(envelope.preview.description, episode.description);
  assert.deepEqual(envelope.preview.features, episode.resultFeatures);
  assert.equal(Object.isFrozen(envelope), true);
});

test("stored preference labels shape a later refresh without blocking the first edition", () => {
  const episode = { ...createExperienceCatalog().byId["neon-rain"], studioPrompt: CONTENT_RECIPES.anime.prompt };
  const envelope = createRecipeEnvelope(episode, ["  Short episodes ", "Dreamy", "Dreamy"]);
  assert.deepEqual(envelope.preferences, ["Short episodes", "Dreamy"]);
  assert.match(envelope.prompt, /User-selected refresh priorities/);
  assert.match(envelope.prompt, /Short episodes, Dreamy/);
});

test("runner rejects a shallow prompt before touching the DSH composer", () => {
  assert.throws(() => createRecipeEnvelope({ id: "x", title: "x", studioPrompt: "write something" }), /not detailed enough/);
});

test("manual magazine update envelope is immutable and shaped by earlier questionnaire content", () => {
  const prompt = buildContinuousStreamPrompt({
    runId: "refill-one",
    batchSize: 8,
    answerLabels: ["  More original creators ", "A deeper read", "A deeper read"],
    recentTitles: ["Opening page"],
    chatTopics: ["How football analytics changed scouting"],
    editorialProfile: { preset: "machines" },
  });
  const envelope = createStreamEnvelope({ id: "refill-one", prompt, batchSize: 8, answerLabels: ["More original creators", "A deeper read"] });
  assert.equal(envelope.title, "VIBE magazine update");
  assert.equal(envelope.mode, "manual-stream-update");
  assert.equal(envelope.batchSize, 8);
  assert.deepEqual(envelope.answers, ["More original creators", "A deeper read"]);
  assert.match(envelope.prompt, /append-only/i);
  assert.match(envelope.prompt, /top of that same edition/i);
  assert.match(envelope.prompt, /Football, AI & cars/i);
  assert.match(envelope.prompt, /not as evidence of identity or protected traits/i);
  assert.match(envelope.prompt, /Recent completed Chat answer topics: How football analytics changed scouting/);
  assert.match(envelope.prompt, /not a demographic profile or permission to expose the reader's prompt/);
  assert.match(envelope.prompt, /<vibe-chunk/);
  assert.match(envelope.prompt, /music or audio route/i);
  assert.match(envelope.prompt, /questionnaire/i);
  assert.match(envelope.prompt, /two locally prepared pages/i);
  assert.match(envelope.prompt, /at least three useful bounded lanes concurrently/i);
  assert.match(envelope.prompt, /Never publish a worker report/i);
  assert.match(envelope.prompt, /60–140 words/i);
  assert.match(envelope.prompt, /More original creators/);
  assert.match(envelope.prompt, /Codex remains lead/i);
  assert.match(envelope.prompt, /exactly one user-requested update/i);
  assert.match(envelope.prompt, /do not start or schedule another update/i);
  assert.match(envelope.prompt, /End the turn after this single batch/i);
  assert.equal(Object.isFrozen(envelope), true);
});
