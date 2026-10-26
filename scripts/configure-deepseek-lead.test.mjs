import assert from "node:assert/strict";
import test from "node:test";
import { deepseekLeadProfile, deepseekLeadPatches, restoreLeadPatches } from "./configure-deepseek-lead.mjs";

test("native leadership migrates only owned model settings and keeps protected settings", () => {
  const patches = [
    { id: "permission", config: { defaultPreset: "ask", secret: "fixture-only" } },
    { id: "llm-codex-chatgpt", config: { model: "gpt-6.1-sol" } },
    { id: "agent-default-model", config: { provider: "codex-chatgpt", model: "chatgpt-account-default" } },
    { id: "agent-preset-registry", config: { default: "standard", selectedDefault: "custom", unrelated: true } },
  ];
  const result = deepseekLeadPatches(patches);
  assert.deepEqual(result.find(x => x.id === "permission"), patches[0]);
  assert.equal(result.some(x => x.id === "llm-codex-chatgpt"), false);
  assert.deepEqual(result.find(x => x.id === "agent-default-model").config, { provider: "deepseek-official", model: "deepseek-flash" });
  assert.deepEqual(result.find(x => x.id === "agent-preset-registry").config, { default: "vibeify-deepseek", selectedDefault: "vibeify-deepseek", unrelated: true });
  assert.deepEqual(deepseekLeadPatches(result), result);
  assert.equal(patches[2].config.provider, "codex-chatgpt");
});

test("worker runtime is pinned without touching unrelated overrides or credentials", () => {
  const profile = { dependencies: { private: "1.0.0" }, pnpm: { overrides: { unrelated: "2.0.0" } }, dsh: { privateSetting: "fixture-only" } };
  const result = deepseekLeadProfile(profile, "0.164.0");
  assert.equal(result.pnpm.overrides["@deepseek-ai/dsh-subagent-codex>@openai/codex"], "0.164.0");
  assert.equal(result.pnpm.overrides.unrelated, "2.0.0");
  assert.deepEqual(result.dsh, profile.dsh);
  assert.deepEqual(result.dependencies, profile.dependencies);
  assert.throws(() => deepseekLeadProfile(profile, "latest"), /exact/);
});

test("switching out of DeepSeek-led mode restores owned defaults without reverting later permission changes", () => {
  const backup = [{ id: "permission", config: { defaultPreset: "ask" } }, { id: "llm-codex-chatgpt", config: { model: "gpt-6.1-sol" } }];
  const current = deepseekLeadPatches(backup);
  current[0].config.defaultPreset = "custom";
  const restored = restoreLeadPatches(current, backup, "chatgpt");
  assert.equal(restored.find(x => x.id === "permission").config.defaultPreset, "custom");
  assert.equal(restored.some(x => x.id === "agent-default-model"), false);
  assert.equal(restored.find(x => x.id === "agent-preset-registry").config.default, "standard");
  assert.deepEqual(restored.find(x => x.id === "llm-codex-chatgpt"), backup[1]);
  assert.equal(restoreLeadPatches(current, backup, "deepseek").some(x => x.id === "llm-codex-chatgpt"), false);
});
