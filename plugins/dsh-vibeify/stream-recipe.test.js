import test from "node:test";
import assert from "node:assert/strict";

import { buildContinuousStreamPrompt } from "./client-src/experience/stream-recipe.js";

test("the generated edition requires complete copy or a useful verified link in every panel", () => {
  const prompt = buildContinuousStreamPrompt({ runId: "refill-links" });
  assert.match(prompt, /every non-questionnaire chunk/i);
  assert.match(prompt, /complete useful text/i);
  assert.match(prompt, /recommendation, image, music, and video chunks must always include at least one relevant verified link/i);
  assert.match(prompt, /content destination/i);
  assert.match(prompt, /separate from any image URL or visual-credit link/i);
});

test("each explicit update renews the rolling visual catalogue without reusing recent images", () => {
  const oldImage = "https://images.unsplash.com/photo-recently-used";
  const prompt = buildContinuousStreamPrompt({ runId: "refill-fresh-images", recentMediaUrls: [oldImage, oldImage] });
  assert.match(prompt, /renew the rolling image catalogue in every batch/i);
  assert.match(prompt, /at least 18 potential image candidates/i);
  assert.match(prompt, /at least three credible source families/i);
  assert.match(prompt, /exact subject or named-entity match/i);
  assert.match(prompt, /at least two generated chunks must begin with a fresh verified public image/i);
  assert.match(prompt, /images\.unsplash\.com, images\.pexels\.com, upload\.wikimedia\.org, or cdn\.pixabay\.com/i);
  assert.match(prompt, /never reuse a recent image URL/i);
  assert.equal(prompt.split(oldImage).length - 1, 1);
});

test("visual freshness checks remember a broad recent pool", () => {
  const recentMediaUrls = Array.from({ length: 90 }, (_, index) => `https://images.unsplash.com/photo-${index}`);
  const prompt = buildContinuousStreamPrompt({ runId: "refill-broad-visual-memory", recentMediaUrls });
  assert.doesNotMatch(prompt, /photo-9(?:\D|$)/);
  assert.match(prompt, /photo-10(?:\D|$)/);
  assert.match(prompt, /photo-89(?:\D|$)/);
});
