import test from "node:test";
import assert from "node:assert/strict";

import { buildChatVibeInstructions } from "./chat-vibe-contract.js";

test("completed Chat answers share one local magazine while explicit updates remain bounded", () => {
  const contract = buildChatVibeInstructions();
  assert.match(contract, /one shared edited Vibe surface/i);
  assert.match(contract, /durably ended as completed/i);
  assert.match(contract, /across DSH threads without reopening, prompting, or resuming them/i);
  assert.match(contract, /Neither route starts an additional AI\/model call/i);
  assert.match(contract, /newest-first/i);
  assert.match(contract, /must never copy the user's raw prompt/i);
  assert.match(contract, /make, create, write, or turn something into a Vibe or Vibe article/i);
  assert.match(contract, /clearest unambiguous instruction/i);
  assert.match(contract, /show, find, discover, browse, or recommend/i);
  assert.match(contract, /commentary/i);
  assert.match(contract, /<vibe-chunk/i);
  assert.match(contract, /complete closed envelope/i);
  assert.match(contract, /questionnaire.*concise invitation.*2–6 separate Markdown bullet options/i);
  assert.match(contract, /self-contained editorial choice of at most 72 characters/i);
  assert.match(contract, /choosing one does not start work/i);
  assert.match(contract, /first bounded complete item.+before researching the whole series/i);
  assert.match(contract, /one envelope per commentary update/i);
  assert.match(contract, /slower research.+continue/i);
  assert.match(contract, /technical answers can therefore appear in Vibe once complete/i);
  assert.match(contract, /private|sensitive/i);
  assert.match(contract, /final answer in Chat/i);
  assert.match(contract, /not required for the completed-answer projection/i);
  assert.match(contract, /must not autonomously refill itself/i);
  assert.match(contract, /pulls down from the top of Vibe or presses Update/i);
  assert.match(contract, /one bounded update turn/i);
  assert.match(contract, /Stop cancels only the dedicated active magazine-update session/i);
});
