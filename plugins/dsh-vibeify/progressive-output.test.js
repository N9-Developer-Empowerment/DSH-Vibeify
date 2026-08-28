import test from "node:test";
import assert from "node:assert/strict";

import {
  reconcileCompletedAnswer,
  streamTurnResult,
} from "./progressive-output.js";

async function* turnEvents(events) {
  for (const event of events) yield event;
}

async function collect(iterable) {
  const values = [];
  for await (const value of iterable) values.push(value);
  return values;
}

test("final-answer deltas become DSH text deltas without waiting for a duplicate completed answer", async () => {
  const events = turnEvents([
    { type: "progress", text: "Checking sources…" },
    { type: "answer", text: "# First section\n\n" },
    { type: "answer", text: "Useful content." },
  ]);
  const output = await collect(streamTurnResult({
    events,
    result: Promise.resolve("# First section\n\nUseful content."),
  }));

  assert.deepEqual(output, [
    { type: "block-start", index: 0, blockType: "reasoning" },
    { type: "reasoning-delta", index: 0, text: "Checking sources…" },
    { type: "block-end", index: 0, block: { type: "reasoning", text: "Checking sources…" } },
    { type: "block-start", index: 1, blockType: "text" },
    { type: "text-delta", index: 1, text: "# First section\n\n" },
    { type: "text-delta", index: 1, text: "Useful content." },
    { type: "block-end", index: 1, block: { type: "text", text: "# First section\n\nUseful content." } },
  ]);
});

test("completed-answer fallback still works when the app server sends no deltas", async () => {
  const output = await collect(streamTurnResult({
    events: turnEvents([{ type: "progress", text: "Working…" }]),
    result: Promise.resolve("Complete answer"),
  }));
  assert.equal(output.filter(({ type }) => type === "text-delta").map(({ text }) => text).join(""), "Complete answer");
});

test("completed app-server text must reconcile with already streamed deltas", () => {
  assert.equal(reconcileCompletedAnswer("Hello", "Hello world"), " world");
  assert.equal(reconcileCompletedAnswer("Hello world", "Hello world"), "");
  assert.throws(() => reconcileCompletedAnswer("Hello there", "Hello world"), /did not match/i);
});
