import test from "node:test";
import assert from "node:assert/strict";
import {
  CODEX_CAPABILITY_PRESETS,
  DEFAULT_CODEX_RUNTIME_SETTINGS,
  resolveCodexRuntimeSettings,
  runtimeSettingsFromYaml,
} from "./codex-capability.js";

test("frontier capability preserves the current SOTA Codex lead", () => {
  assert.deepEqual(DEFAULT_CODEX_RUNTIME_SETTINGS, {
    capabilityLevel: "frontier",
    model: "gpt-5.6-sol",
    reasoningEffort: "xhigh",
  });
  assert.deepEqual(CODEX_CAPABILITY_PRESETS.frontier, {
    label: "Frontier (recommended)",
    model: "gpt-5.6-sol",
    reasoningEffort: "xhigh",
    summary: "SOTA Codex lead for planning, judgment, integration, and verification.",
  });
});

test("a named capability resolves model and reasoning as one setting", () => {
  assert.deepEqual(resolveCodexRuntimeSettings({ capabilityLevel: "balanced" }), {
    capabilityLevel: "balanced",
    model: "gpt-5.6-terra",
    reasoningEffort: "high",
  });
  assert.deepEqual(resolveCodexRuntimeSettings({ capabilityLevel: "maximum" }), {
    capabilityLevel: "maximum",
    model: "gpt-5.6-sol",
    reasoningEffort: "max",
  });
});

test("existing exact DSH model settings remain compatible", () => {
  assert.deepEqual(runtimeSettingsFromYaml(`
llm-codex-chatgpt:
  model: gpt-5.6-sol
  reasoningEffort: xhigh
`), DEFAULT_CODEX_RUNTIME_SETTINGS);
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
