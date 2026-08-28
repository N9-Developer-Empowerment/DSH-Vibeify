import test from "node:test";
import assert from "node:assert/strict";

import { CONTENT_RECIPES } from "./client-src/experience/recipes.js";

test("legacy source recipes remain detailed but are no longer shipped in the feed catalogue", () => {
  for (const recipe of Object.values(CONTENT_RECIPES)) {
    assert.ok(recipe.prompt.length >= 1800);
    assert.match(recipe.prompt, /Do not begin by asking questions/i);
    assert.match(recipe.prompt, /browse current public sources/i);
    assert.match(recipe.prompt, /image.*link/i);
    assert.match(recipe.prompt, /video.*link/i);
    assert.match(recipe.prompt, /## Output contract/);
    assert.match(recipe.prompt, /<vibe-section id=/);
    assert.match(recipe.prompt, /local overview is already on screen/i);
    assert.match(recipe.prompt, /host's concurrency and cost policy/i);
    assert.match(recipe.prompt, /do not hold a ready early section behind the slowest research lane/i);
    assert.match(recipe.prompt, /only after.*source.*check/i);
    assert.match(recipe.prompt, /Do not purchase/i);
  }
});

test("skin-care recipe is useful without guessing medical or personal facts", () => {
  const skincare = CONTENT_RECIPES.skincare.prompt;
  assert.match(skincare, /not diagnosis or medical treatment/i);
  assert.match(skincare, /patch-testing/i);
  assert.match(skincare, /Do not infer skin type/i);
  assert.match(skincare, /official product link/i);
  assert.match(skincare, /credible evidence or expert-context link/i);
});

test("shopping and media recipes retain protected, legal actions", () => {
  assert.match(CONTENT_RECIPES.style.prompt, /Do not add anything to a basket or purchase/i);
  assert.match(CONTENT_RECIPES.anime.prompt, /Never link piracy/i);
});
