import test from "node:test";
import assert from "node:assert/strict";

import { createOutputPresentation, inferOutputTone } from "./client-src/experience/output.js";

test("rendered answers receive a visual tone without changing their content", () => {
  assert.equal(inferOutputTone("A difficult conversation, a boundary and what to say next"), "connection");
  assert.equal(inferOutputTone("A makeup ritual with a soft-glow look and outfit"), "glow");
  assert.equal(inferOutputTone("Refactor this function, run tests, then ship the build"), "studio");
  assert.equal(inferOutputTone("Walk through a midnight city and follow the story"), "escape");
  assert.equal(inferOutputTone("Skin care products for sensitive skin, with official images and affiliate relationship disclosure"), "glow");
  assert.equal(inferOutputTone("A practical workshop with a history section"), "escape");
});

test("output presentation metadata is deterministic and contains no answer rewrite", () => {
  const text = "Three practical steps with one important decision.";
  const first = createOutputPresentation(text);
  const second = createOutputPresentation(text);
  assert.deepEqual(first, second);
  assert.match(first.id, /^vibe-output-/);
  assert.equal(Object.hasOwn(first, "content"), false);
  assert.ok(first.label.length > 0);
});

test("long answers with the same opening receive distinct presentation ids", () => {
  const prefix = "same ".repeat(900);
  assert.notEqual(createOutputPresentation(`${prefix}ending one`).id, createOutputPresentation(`${prefix}ending two`).id);
});
