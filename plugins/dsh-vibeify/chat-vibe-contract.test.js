import test from "node:test";
import assert from "node:assert/strict";

import { buildChatVibeInstructions } from "./chat-vibe-contract.js";

test("completed Chat answers project automatically while public editorial requests retain the richer envelope route", () => {
  const contract = buildChatVibeInstructions();
  assert.match(contract, /Every completed assistant answer is automatically projected/i);
  assert.match(contract, /newest-first/i);
  assert.match(contract, /must never copy the user's raw prompt/i);
  assert.match(contract, /show, find, discover, browse, or recommend/i);
  assert.match(contract, /commentary/i);
  assert.match(contract, /<vibe-chunk/i);
  assert.match(contract, /complete closed envelope/i);
  assert.match(contract, /technical answers can therefore appear in Vibe once complete/i);
  assert.match(contract, /private|sensitive/i);
  assert.match(contract, /final answer in Chat/i);
  assert.match(contract, /not required for the automatic completed-answer projection/i);
});
