import test from "node:test";
import assert from "node:assert/strict";

import { buildContinuousStreamPrompt } from "./client-src/experience/stream-recipe.js";

test("the generated edition requires complete copy or a useful verified link in every panel", () => {
  const prompt = buildContinuousStreamPrompt({ runId: "refill-links" });
  assert.match(prompt, /every chunk must contain complete useful text/i);
  assert.match(prompt, /complete useful text/i);
  assert.match(prompt, /recommendation, image, music, and video chunks must always include at least one relevant verified link/i);
  assert.match(prompt, /content destination/i);
  assert.match(prompt, /separate from any image URL or visual-credit link/i);
  assert.match(prompt, /Allowed kinds are article, editorial, recommendation, image, music, and video/i);
  assert.doesNotMatch(prompt, /questionnaire/i);
});

test("each explicit update renews the rolling visual catalogue without reusing recent images", () => {
  const oldImage = "https://images.unsplash.com/photo-recently-used";
  const prompt = buildContinuousStreamPrompt({ runId: "refill-fresh-images", recentMediaUrls: [oldImage, oldImage] });
  assert.match(prompt, /renew the rolling image catalogue in every batch/i);
  assert.match(prompt, /at least 18 potential image candidates/i);
  assert.match(prompt, /at least three credible source families/i);
  assert.match(prompt, /exact subject or named-entity match/i);
  assert.match(prompt, /use a verified photograph or openly licensed illustration/i);
  assert.match(prompt, /longer than 500 words.*two or three/i);
  assert.match(prompt, /documentary photography by default/i);
  assert.match(prompt, /latest available ChatGPT image generation capability/i);
  assert.match(prompt, /Only after searching for a relevant reusable web image/i);
  assert.match(prompt, /Label the result Generated illustration/i);
  assert.match(prompt, /bundled CC0 pictorial illustration/i);
  assert.match(prompt, /never present generated imagery as a real photograph/i);
  assert.match(prompt, /Google Images with its Usage rights filter/i);
  assert.match(prompt, /never treat that filter or a search-result label as permission/i);
  assert.match(prompt, /independently verify its exact reusable licence/i);
  assert.match(prompt, /Wikimedia Commons, Openverse.*Flickr Commons/i);
  assert.match(prompt, /CC BY 4\.0/i);
  assert.match(prompt, /Reuse a recent image when it remains the exact relevant subject/i);
  assert.equal(prompt.split(oldImage).length - 1, 1);
});

test("visual freshness checks remember a broad recent pool", () => {
  const recentMediaUrls = Array.from({ length: 90 }, (_, index) => `https://images.unsplash.com/photo-${index}`);
  const prompt = buildContinuousStreamPrompt({ runId: "refill-broad-visual-memory", recentMediaUrls });
  assert.doesNotMatch(prompt, /photo-9(?:\D|$)/);
  assert.match(prompt, /photo-10(?:\D|$)/);
  assert.match(prompt, /photo-89(?:\D|$)/);
});

test("a magazine update follows the editor's direction with sourced human stories", () => {
  const prompt = buildContinuousStreamPrompt({ runId: "refill-human", editorialProfile: { tribes: ["builders-nerds"], customDirection: "Focus on railway workers" } });
  assert.match(prompt, /people involved or affected/i);
  assert.match(prompt, /sourced public opinion or gossip/i);
  assert.match(prompt, /Never invent a quote, motive, feeling, private relationship or scandal/i);
  assert.match(prompt, /Rework or omit generic explainers/);
  assert.match(prompt, /Focus on railway workers/);
  assert.match(prompt, /Keep exact custom wording with the Codex lead/i);
});
