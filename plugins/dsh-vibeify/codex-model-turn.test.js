import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { CodexWire, CodexChatGptAdapter } from "./index.js";
import { codexAccessPolicy } from "./routing-policy.js";

test("a running turn retains its model while the next turn uses the new selection on the same wire", async () => {
  let saved = { capabilityLevel: "custom", model: "gpt-6-luna", reasoningEffort: "max" };
  const adapter = new CodexChatGptAdapter({}, () => saved);
  const source = adapter.runtimeSettingsSource(undefined, undefined);
  const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stdin: new PassThrough(), stderr: new PassThrough() });
  const wire = new CodexWire(child, "/tmp", "", () => {}, () => {}, () => {}, () => {}, () => wire.activeRuntime ?? source(), () => {}, () => codexAccessPolicy({}), {}, false);
  wire.threadId = "test-thread";
  wire.codexModels = ["gpt-6-luna", "gpt-6.1-sol"].map((model) => ({ model, inputModalities: ["image"], supportedReasoningEfforts: ["high", "max"].map((reasoningEffort) => ({ reasoningEffort })) }));
  const sent = [];
  const startGate = Promise.withResolvers();
  wire.transport = { request: async (_method, params) => { sent.push(params); if (sent.length === 1) await startGate.promise; return { turn: { id: `turn-${sent.length}` } }; } };
  adapter.wires.add(wire);
  const first = wire.runTurn([], new AbortController().signal);
  saved = { capabilityLevel: "custom", model: "gpt-6.1-sol", reasoningEffort: "high" };
  assert.deepEqual(adapter.activeSelections(), [{ model: "gpt-6-luna", reasoningEffort: "max" }]);
  startGate.resolve();
  wire.lastFinalAnswer = "first answer";
  wire.turnCompleted.resolve({ turn: { status: "completed" } });
  assert.equal(await first, "first answer");
  assert.deepEqual(adapter.activeSelections(), []);
  const second = wire.runTurn([], new AbortController().signal);
  wire.lastFinalAnswer = "second answer";
  wire.turnCompleted.resolve({ turn: { status: "completed" } });
  assert.equal(await second, "second answer");
  assert.deepEqual(sent.map(({ model, effort }) => ({ model, effort })), [
    { model: "gpt-6-luna", effort: "max" }, { model: "gpt-6.1-sol", effort: "high" },
  ]);
});
