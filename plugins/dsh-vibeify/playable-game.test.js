import assert from "node:assert/strict";
import test from "node:test";

import {
  hasMochiMeadowBlock,
  isMochiStartEvent,
  playableGameAnchorId,
  splitPlayableGameBlocks,
} from "./client-src/experience/playable-game-contract.js";

test("the exact Mochi Meadow block becomes one playable segment between article copy", () => {
  const markdown = "Before the round.\n\n:::vibe-game mochi-meadow\n:::\n\nAfter the round.";
  assert.deepEqual(splitPlayableGameBlocks(markdown), [
    { type: "markdown", value: "Before the round.\n" },
    { type: "game", gameId: "mochi-meadow" },
    { type: "markdown", value: "\nAfter the round." },
  ]);
  assert.equal(hasMochiMeadowBlock(markdown), true);
});

test("game-like text in fenced examples and malformed blocks stay ordinary Markdown", () => {
  const fenced = "```md\n:::vibe-game mochi-meadow\n:::\n```";
  const malformed = ":::vibe-game unknown\n:::\n:::vibe-game mochi-meadow\nnot closed";
  assert.equal(hasMochiMeadowBlock(fenced), false);
  assert.deepEqual(splitPlayableGameBlocks(fenced), [{ type: "markdown", value: fenced }]);
  assert.equal(hasMochiMeadowBlock(malformed), false);
  assert.deepEqual(splitPlayableGameBlocks(malformed), [{ type: "markdown", value: malformed }]);
});

test("the game anchor is stable and strips unsafe id characters", () => {
  assert.equal(playableGameAnchorId("chat-mochi meadow/1"), "vfx-game-chat-mochimeadow1");
  assert.equal(playableGameAnchorId("☁"), "vfx-game-article");
});

test("Mochi start signals accept only the mounted game frame", () => {
  const frame = {};
  assert.equal(isMochiStartEvent({source:frame,data:{type:"vibe-mochi-start"}}, frame), true);
  assert.equal(isMochiStartEvent({source:{},data:{type:"vibe-mochi-start"}}, frame), false);
  assert.equal(isMochiStartEvent({source:frame,data:{type:"other"}}, frame), false);
  assert.equal(isMochiStartEvent({source:null,data:{type:"vibe-mochi-start"}}, null), false);
});
