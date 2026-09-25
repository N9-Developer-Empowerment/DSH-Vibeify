import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CODEX_RUNTIME_SETTINGS,
  FULL_ACCESS_APPROVAL_POLICY,
  acceptedElicitationContent,
  buildDeveloperRoutingInstructions,
  codexAccessPolicy,
  estimateModelCost,
  formatCostEstimate,
  latestSessionPolicy,
  liveModelCatalog,
  loadRoutingPolicy,
  runtimeSettingsFromYaml,
  runtimeStatus,
  summarizeTokenUsage,
} from "./routing-policy.js";

const policy = loadRoutingPolicy();

test("DSH settings select GPT-6 Luna Max by default", () => {
  assert.deepEqual(DEFAULT_CODEX_RUNTIME_SETTINGS, {
    capabilityLevel: "frontier",
    model: "gpt-6-luna",
    reasoningEffort: "max",
  });
  assert.deepEqual(runtimeSettingsFromYaml(`
permission:
  defaultPreset: danger-full-access
llm-codex-chatgpt:
  model: gpt-6-luna
  reasoningEffort: max
agent-presets:
  default: chatgpt-agent
`), DEFAULT_CODEX_RUNTIME_SETTINGS);
});

test("DSH Full Access suppresses command prompts but retains app confirmations", () => {
  const access = codexAccessPolicy({
    sandboxMode: "danger-full-access",
    approvalPolicy: "never",
  });
  assert.deepEqual(access, {
    sandboxMode: "danger-full-access",
    approvalPolicy: FULL_ACCESS_APPROVAL_POLICY,
    sandboxPolicy: { type: "dangerFullAccess" },
    label: "Full Access",
  });
  assert.equal(runtimeStatus({ ...DEFAULT_CODEX_RUNTIME_SETTINGS, access }),
    "Luna Max (recommended) · GPT-6 Luna · Max · Full Access");
});

test("connected-app confirmations accept only deterministic form values", () => {
  assert.deepEqual(acceptedElicitationContent({
    type: "object",
    properties: {},
  }), {});
  assert.deepEqual(acceptedElicitationContent({
    type: "object",
    properties: {
      confirmed: { type: "boolean" },
      scope: { type: "string", default: "once" },
      action: { type: "string", enum: ["send"] },
    },
    required: ["confirmed", "scope", "action"],
  }), { confirmed: true, scope: "once", action: "send" });
  assert.equal(acceptedElicitationContent({
    type: "object",
    properties: { recipient: { type: "string" } },
    required: ["recipient"],
  }), undefined);
});

test("workspace access preserves Codex approvals and protected networking", () => {
  assert.deepEqual(codexAccessPolicy({
    sandboxMode: "workspace-write",
    approvalPolicy: "ask",
  }), {
    sandboxMode: "workspace-write",
    approvalPolicy: "on-request",
    sandboxPolicy: {
      type: "workspaceWrite",
      writableRoots: [],
      networkAccess: true,
      excludeTmpdirEnvVar: false,
      excludeSlashTmp: false,
    },
    label: "Workspace Access",
  });
});

test("the newest DSH session permission event wins", () => {
  const events = [
    { type: "sandbox/mode", data: { mode: "workspace-write" } },
    { type: "sandbox/mode", data: { mode: "danger-full-access" } },
  ];
  assert.equal(latestSessionPolicy(events, "sandbox/mode", "mode"), "danger-full-access");
});

test("policy contains every installed native DeepSeek route", () => {
  assert.deepEqual(
    policy.models.map((model) => model.id),
    ["deepseek-flash", "deepseek-v4-pro"],
  );
  assert.equal(policy.models[0].name, "DeepSeek V4.1 Flash");
  assert.deepEqual(policy.models[0].modalities, ["text", "image"]);
  assert.deepEqual(policy.models[0].pricing, {
    inputCacheHit: 0.006,
    inputCacheMiss: 0.30,
    output: 1.20,
  });
  assert.deepEqual(policy.models[0].offPeakPricing, {
    inputCacheHit: 0.003,
    inputCacheMiss: 0.15,
    output: 0.60,
  });
  assert.deepEqual(policy.models[1].pricing, {
    inputCacheHit: 0.044,
    inputCacheMiss: 1.32,
    output: 3.96,
  });
});

test("developer instructions preserve Codex leadership, quota, quality, and billing distinctions", () => {
  const text = buildDeveloperRoutingInstructions(policy);
  assert.match(text, /DeepSeek-first execution under Codex governance/);
  assert.match(text, /Use a bounded DeepSeek worker for eligible execution by default/);
  assert.match(text, /A worker's prose is not acceptance/);
  assert.match(text, /Passing work should be reused/);
  assert.match(text, /always remains the lead agent/);
  assert.match(text, /finite Codex plan quota/);
  assert.match(text, /removes OpenAI API keys/);
  assert.match(text, /DeepSeek is separately API-billed/);
  assert.match(text, /Never hand leadership to another model/);
  assert.match(text, /Prefer deepseek-flash \(DeepSeek V4.1 Flash\)/);
  assert.match(text, /at most 2 execution packets per user turn/);
  assert.match(text, /use peak rates unless the provider confirms the exact pricing window/i);
});

test("live catalogue uses authenticated Codex models and verified DeepSeek routes", async () => {
  const llm = {
    listProviders: () => [
      { id: "codex-chatgpt", name: "Codex" },
      { id: "deepseek-official", name: "DeepSeek" },
    ],
    listModels: async () => [{
      id: "deepseek-flash",
      name: "DeepSeek V4.1 Flash",
      inputModalities: ["text", "image"],
    }],
  };
  const codexModels = ["gpt-6-luna", "gpt-6-sol", "gpt-6-astra", "gpt-5.6-terra"].map((model) => ({
    id: model,
    model,
    displayName: model,
    inputModalities: ["text", "image"],
    defaultReasoningEffort: model === "gpt-6-luna" ? "max" : "high",
    supportedReasoningEfforts: ["high", "max", "ultra"].map((reasoningEffort) => ({
      reasoningEffort,
      description: reasoningEffort,
    })),
  }));
  const catalog = await liveModelCatalog(llm, policy, {
    codexModels,
    leadSettings: DEFAULT_CODEX_RUNTIME_SETTINGS,
  });
  assert.equal(catalog.models.length, 5);
  assert.equal(catalog.models[0].subagentFromCurrentCodex, false);
  assert.equal(catalog.models[0].leadAllowedByPolicy, true);
  assert.equal(catalog.models[0].route, "codex-chatgpt/gpt-6-luna");
  assert.equal(catalog.models[0].defaultReasoningEffort, "max");
  assert.deepEqual(catalog.models.slice(1, 4).map((model) => model.subagentFromCurrentCodex), [true, true, true]);
  assert.equal(catalog.models[1].primaryForNewSession, false);
  assert.equal(catalog.models[1].leadAllowedByPolicy, false);
  assert.equal(catalog.models[4].subagentFromCurrentCodex, true);
  assert.equal(catalog.models[4].pricing.inputCacheMiss, 0.30);
  assert.deepEqual(catalog.models[4].offPeakPricing, policy.models[0].offPeakPricing);
});

test("reported usage produces the official Flash estimate", () => {
  const usage = summarizeTokenUsage([{
    type: "assistant/message",
    data: { usage: {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 0,
    } },
  }]);
  const estimate = estimateModelCost(policy, "deepseek-official", "deepseek-flash", usage);
  assert.equal(estimate.known, true);
  assert.equal(estimate.amount, 1.506);
  assert.match(formatCostEstimate(estimate), /conservative peak rates/);
  assert.match(formatCostEstimate(estimate), /\$1\.506/);
});

test("DeepSeek Pro fallback uses verified conservative peak rates", () => {
  const estimate = estimateModelCost(policy, "deepseek-official", "deepseek-v4-pro", {
    inputTokens: 10,
    outputTokens: 10,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reportingSteps: 1,
  });
  assert.equal(estimate.known, true);
  assert.equal(estimate.amount, 0.0000528);
  assert.match(formatCostEstimate(estimate), /peak rates/);
});
