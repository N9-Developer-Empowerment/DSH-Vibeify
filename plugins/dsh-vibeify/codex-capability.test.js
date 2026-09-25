import test from "node:test";
import assert from "node:assert/strict";
import {
  CODEX_CAPABILITY_PRESETS,
  CODEX_MODEL_CHOICES,
  DEFAULT_CODEX_RUNTIME_SETTINGS,
  listCodexModels,
  resolveCodexRuntimeSettings,
  runtimeSettingsFromYaml,
  validateCodexRuntimeSettingsAgainstCatalog,
} from "./codex-capability.js";

test("frontier capability defaults to Luna Max and keeps GPT-6 models exact", () => {
  assert.deepEqual(DEFAULT_CODEX_RUNTIME_SETTINGS, {
    capabilityLevel: "frontier",
    model: "gpt-6-luna",
    reasoningEffort: "max",
  });
  assert.deepEqual(CODEX_CAPABILITY_PRESETS.frontier, {
    label: "Luna Max (recommended)",
    model: "gpt-6-luna",
    reasoningEffort: "max",
    summary: "GPT-6 Luna at Max for planning, judgment, integration, and verification.",
  });
  assert.deepEqual(CODEX_MODEL_CHOICES.slice(0, 4).map(({ id }) => id), [
    "gpt-6-luna",
    "gpt-6-sol",
    "gpt-6-astra",
    "gpt-5.6-terra",
  ]);
});

test("a named capability resolves model and reasoning as one setting", () => {
  assert.deepEqual(resolveCodexRuntimeSettings({ capabilityLevel: "balanced" }), {
    capabilityLevel: "balanced",
    model: "gpt-6-luna",
    reasoningEffort: "high",
  });
  assert.deepEqual(resolveCodexRuntimeSettings({ capabilityLevel: "maximum" }), {
    capabilityLevel: "maximum",
    model: "gpt-6-luna",
    reasoningEffort: "max",
  });
});

test("existing exact DSH model settings remain compatible", () => {
  assert.deepEqual(runtimeSettingsFromYaml(`
llm-codex-chatgpt:
  model: gpt-5.6-sol
  reasoningEffort: xhigh
`), {
    capabilityLevel: "custom",
    model: "gpt-5.6-sol",
    reasoningEffort: "xhigh",
  });
  assert.deepEqual(runtimeSettingsFromYaml(`
llm-codex-chatgpt:
  capabilityLevel: custom
  model: gpt-5.6-luna
  reasoningEffort: medium
`), {
    capabilityLevel: "custom",
    model: "gpt-5.6-luna",
    reasoningEffort: "medium",
  });
});

test("unsupported capability settings fail before a Codex process starts", () => {
  assert.throws(
    () => resolveCodexRuntimeSettings({ capabilityLevel: "magic" }),
    /unsupported DSH Codex capability level magic/,
  );
  assert.throws(
    () => resolveCodexRuntimeSettings({
      capabilityLevel: "custom",
      model: "gpt-4",
      reasoningEffort: "medium",
    }),
    /unsupported DSH Codex model gpt-4/,
  );
});

test("authenticated model capabilities validate each model's own reasoning effort", () => {
  const models = [
    {
      id: "gpt-6-luna",
      model: "gpt-6-luna",
      supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max"].map((reasoningEffort) => ({ reasoningEffort })),
    },
    {
      id: "gpt-6-astra",
      model: "gpt-6-astra",
      supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max", "ultra"].map((reasoningEffort) => ({ reasoningEffort })),
    },
  ];
  assert.equal(validateCodexRuntimeSettingsAgainstCatalog(DEFAULT_CODEX_RUNTIME_SETTINGS, models), models[0]);
  assert.equal(validateCodexRuntimeSettingsAgainstCatalog({
    capabilityLevel: "custom",
    model: "gpt-6-astra",
    reasoningEffort: "ultra",
  }, models), models[1]);
  assert.throws(() => validateCodexRuntimeSettingsAgainstCatalog({
    capabilityLevel: "custom",
    model: "gpt-6-luna",
    reasoningEffort: "ultra",
  }, models), /gpt-6-luna does not support reasoning effort ultra/);
  assert.throws(() => validateCodexRuntimeSettingsAgainstCatalog({
    capabilityLevel: "custom",
    model: "gpt-6-astra",
    reasoningEffort: "none",
  }, models), /gpt-6-astra does not support reasoning effort none/);
});

test("authenticated model discovery follows cursors and requests visible models only", async () => {
  const calls = [];
  const models = await listCodexModels(async (params) => {
    calls.push(params);
    if (params.cursor === undefined) {
      return {
        data: [{ id: "gpt-6-luna", model: "gpt-6-luna" }],
        nextCursor: "page-2",
      };
    }
    return {
      data: [{ id: "gpt-6-sol", model: "gpt-6-sol" }],
      nextCursor: null,
    };
  }, { limit: 1 });
  assert.deepEqual(calls, [
    { limit: 1, includeHidden: false },
    { limit: 1, includeHidden: false, cursor: "page-2" },
  ]);
  assert.deepEqual(models.map(({ model }) => model), ["gpt-6-luna", "gpt-6-sol"]);
});

test("authenticated model discovery rejects repeated cursors and runaway pagination", async () => {
  await assert.rejects(() => listCodexModels(async (params) => ({
    data: [],
    nextCursor: params.cursor ?? "stuck",
  })), /invalid or repeated pagination cursor/);
  let page = 0;
  await assert.rejects(() => listCodexModels(async () => ({
    data: [],
    nextCursor: `page-${page++}`,
  }), { maxPages: 2 }), /exceeded the 2 page safety limit/);
  await assert.rejects(() => listCodexModels(async (params) => ({
    data: [{ id: "gpt-6-luna", model: "gpt-6-luna" }],
    nextCursor: params.cursor === undefined ? "page-2" : null,
  })), /duplicate model gpt-6-luna/);
});
