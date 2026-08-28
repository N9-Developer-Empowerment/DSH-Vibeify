import test from "node:test";
import assert from "node:assert/strict";

import { buildContinuousStreamPrompt } from "./client-src/experience/stream-recipe.js";

test("the generated edition requires complete copy or a useful verified link in every panel", () => {
  const prompt = buildContinuousStreamPrompt({ runId: "refill-links" });
  assert.match(prompt, /every non-questionnaire chunk/i);
  assert.match(prompt, /complete useful text/i);
  assert.match(prompt, /recommendation, image, music, and video chunks must always include at least one relevant verified link/i);
});

test("each explicit update renews the rolling visual catalogue without reusing recent images", () => {
  const oldImage = "https://images.unsplash.com/photo-recently-used";
  const prompt = buildContinuousStreamPrompt({ runId: "refill-fresh-images", recentMediaUrls: [oldImage, oldImage] });
  assert.match(prompt, /renew the rolling image catalogue in every batch/i);
  assert.match(prompt, /at least two generated chunks must begin with a fresh verified public image/i);
  assert.match(prompt, /images\.unsplash\.com, images\.pexels\.com, upload\.wikimedia\.org, or cdn\.pixabay\.com/i);
  assert.match(prompt, /never reuse a recent image URL/i);
  assert.equal(prompt.split(oldImage).length - 1, 1);
});
