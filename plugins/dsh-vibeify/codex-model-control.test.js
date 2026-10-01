import { rpcHarness, callRpc } from "./rpc-test-harness.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createCodexModelControl, registerCodexModelControl } from "./codex-model-control.js";
import { DEFAULT_CODEX_RUNTIME_SETTINGS, resolveCodexRuntimeSettings } from "./codex-capability.js";
import { Config, CODEX_SETTINGS_NAMESPACE } from "./codex-settings.js";
import SettingsForms from "@deepseek-ai/dsh-settings";
import { Context } from "@deepseek-ai/cordis";
import { updateVolatile } from "@deepseek-ai/cosmokit";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const model = (id, efforts = ["high", "max"], extra = {}) => ({
  model: id, displayName: id, inputModalities: ["text", "image"],
  supportedReasoningEfforts: efforts.map((reasoningEffort) => ({ reasoningEffort })), ...extra,
});
const models = [model("gpt-6-luna"), model("gpt-6.1-sol", ["high"]), model("hidden", ["high"], { hidden: true }), model("text-only", ["high"], { inputModalities: ["text"] })];

function fixture() {
  const parse = (value) => Object.fromEntries(Object.entries(Config(value)).map(([key, field]) => [key, field.get()]));
  let value = parse({});
  let revision = 0;
  let discoveries = 0;
  const updates = [];
  const settings = {
    describe: () => [{ ns: CODEX_SETTINGS_NAMESPACE, revision }],
    async update(ns, patch, expected) {
      if (expected !== revision) throw Object.assign(new Error("conflict"), { code: "SETTINGS_CONFLICT" });
      const candidate = parse({ ...value, ...patch });
      resolveCodexRuntimeSettings(candidate);
      updates.push({ ns, patch }); value = candidate; revision++;
    },
  };
  const control = createCodexModelControl({ settings, getRuntimeSettings: () => resolveCodexRuntimeSettings(value), discover: async () => { discoveries++; return models; }, activeSelections: () => [{ model: "gpt-6-luna", reasoningEffort: "max" }] });
  return { control, updates, get discoveries() { return discoveries; } };
}

test("current DSH settings persist the pair and update the same live references", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vibe-model-settings-"));
  try {
    const fields = Config({});
    const entry = { id: "codex-entry", options: { id: CODEX_SETTINGS_NAMESPACE, config: {} }, fiber: {
      uid: 1, state: 2, runtime: { Config }, config: fields, ctx: new Context(),
    } };
    const settings = Object.assign(Object.create(SettingsForms.prototype), {
      revisions: new Map(), presentations: new Map(), ownerContext: {
        emit() {}, configEditor: {
          entries: () => [entry],
          configuration: () => [{ entry, inherited: {}, override: entry.options.config }],
          async edit(target, change) {
            const next = change(target.options.config, {});
            const resolved = Config(next);
            await writeFile(join(directory, "profile.json"), JSON.stringify(next));
            for (const key of Object.keys(fields)) updateVolatile(fields[key], resolved[key]);
            target.options.config = next;
          },
        },
      },
    });
    const getRuntimeSettings = () => resolveCodexRuntimeSettings(Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.get()])));
    const control = createCodexModelControl({ settings, getRuntimeSettings, discover: async () => models });
    const before = await control("read", {});
    assert.equal(before.ok, true);
    const result = await control("save", { model: "gpt-6.1-sol", reasoningEffort: "high", revision: before.value.revision });
    assert.equal(result.ok, true);
    const persisted = JSON.parse(await readFile(join(directory, "profile.json"), "utf8"));
    assert.deepEqual(persisted, { capabilityLevel: "custom", model: "gpt-6.1-sol", reasoningEffort: "high" });
    assert.deepEqual(getRuntimeSettings(), persisted);
    const conflict = await control("save", { model: "gpt-6-luna", reasoningEffort: "max", revision: before.value.revision });
    assert.equal(conflict.error.code, "conflict");
    assert.deepEqual(getRuntimeSettings(), persisted);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("catalogue includes only visible image-capable signed-in models and their own efforts", async () => {
  const { control } = fixture();
  const result = await control("read", {});
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.models.map(({ model }) => model), ["gpt-6-luna", "gpt-6.1-sol"]);
  assert.deepEqual(result.value.models[1].efforts.map(({ id }) => id), ["high"]);
  assert.deepEqual(result.value.selection, DEFAULT_CODEX_RUNTIME_SETTINGS);
});

test("one revision-checked commit saves the whole pair and removes a preset override", async () => {
  const { control, updates } = fixture();
  const saved = await control("save", { model: "gpt-6.1-sol", reasoningEffort: "high", revision: 0 });
  assert.equal(saved.ok, true);
  assert.deepEqual(updates, [{ ns: CODEX_SETTINGS_NAMESPACE, patch: { capabilityLevel: "custom", model: "gpt-6.1-sol", reasoningEffort: "high" } }]);
  const reloaded = await control("read", {});
  assert.deepEqual(reloaded.value.selection, saved.value.selection);
  assert.equal(reloaded.value.revision, 1);
  assert.equal(reloaded.value.active[0].model, "gpt-6-luna");
  const stale = await control("save", { model: "gpt-6-luna", reasoningEffort: "max", revision: 0 });
  assert.equal(stale.error.code, "conflict"); assert.equal(updates.length, 1);
});

test("unavailable models and unsupported efforts never persist; status does not discover", async () => {
  const f = fixture();
  for (const [id, effort] of [["gpt-6.1-sol", "max"], ["not-listed", "high"], ["hidden", "high"], ["text-only", "high"]]) {
    assert.equal((await f.control("save", { model: id, reasoningEffort: effort, revision: 0 })).ok, false);
  }
  assert.equal(f.updates.length, 0);
  const before = f.discoveries;
  assert.equal((await f.control("status", {})).ok, true);
  assert.equal(f.discoveries, before);
});

test("malformed requests fail before discovery and provider diagnostics stay private", async () => {
  const f = fixture();
  for (const payload of [null, [], { unexpected: true }, { model: "gpt-6-luna", reasoningEffort: "max" }]) {
    assert.equal((await f.control("save", payload)).ok, false);
  }
  assert.equal(f.discoveries, 0);
  const control = createCodexModelControl({ discover: async () => { throw new Error("SECRET account/provider output"); } });
  assert.doesNotMatch(JSON.stringify(await control("read", {})), /SECRET/);
});

test("model settings RPC is registered on the authenticated local host route", async () => {
  const harness = rpcHarness();
  registerCodexModelControl(harness.ctx, fixture().control);
  assert.equal(harness.route.path, "/vibeify-codex-models");
  assert.equal((await callRpc(harness.route, "status", {})).result.ok, true);
});
