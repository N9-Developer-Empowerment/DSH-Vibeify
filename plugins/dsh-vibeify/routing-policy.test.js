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

test("DSH settings select GPT-5.6 Sol with Extra High reasoning", () => {
  assert.deepEqual(DEFAULT_CODEX_RUNTIME_SETTINGS, {
    model: "gpt-5.6-sol",
    reasoningEffort: "xhigh",
  });
  assert.deepEqual(runtimeSettingsFromYaml(`
permission:
  defaultPreset: danger-full-access
llm-codex-chatgpt:
  model: gpt-5.6-sol
  reasoningEffort: xhigh
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
    "GPT-5.6 Sol · Extra High · Full Access");
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
    ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-v4-flash-vision-exp"],
  );
});

test("developer instructions preserve Codex leadership, quota, quality, and billing distinctions", () => {
  const text = buildDeveloperRoutingInstructions(policy);
  assert.match(text, /independently verifiable/);
  assert.match(text, /always remains the lead agent/);
  assert.match(text, /finite Codex plan quota/);
  assert.match(text, /removes OpenAI API keys/);
  assert.match(text, /DeepSeek is separately API-billed/);
  assert.match(text, /Never hand leadership to another model/);
});

test("live catalogue merges registered routes with verified policy", async () => {
  const llm = {
    listProviders: () => [
      { id: "codex-chatgpt", name: "Codex" },
      { id: "deepseek-official", name: "DeepSeek" },
    ],
    listModels: async (provider) => provider === "codex-chatgpt"
      ? [{ id: "chatgpt-account-default", name: "ChatGPT account default", inputModalities: ["text", "image"] }]
      : [{ id: "deepseek-v4-flash", name: "DeepSeek-V4-Flash", inputModalities: ["text"] }],
  };
  const catalog = await liveModelCatalog(llm, policy);
  assert.equal(catalog.models.length, 2);
  assert.equal(catalog.models[0].subagentFromCurrentCodex, false);
  assert.equal(catalog.models[0].leadAllowedByPolicy, true);
  assert.equal(catalog.models[1].subagentFromCurrentCodex, true);
  assert.equal(catalog.models[1].primaryForNewSession, false);
  assert.equal(catalog.models[1].leadAllowedByPolicy, false);
  assert.equal(catalog.models[1].pricing.inputCacheMiss, 0.14);
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
  const estimate = estimateModelCost(policy, "deepseek-official", "deepseek-v4-flash", usage);
  assert.equal(estimate.known, true);
  assert.equal(estimate.amount, 0.4228);
  assert.match(formatCostEstimate(estimate), /\$0\.4228/);
});

test("experimental vision never invents a price", () => {
  const estimate = estimateModelCost(policy, "deepseek-official", "deepseek-v4-flash-vision-exp", {
    inputTokens: 10,
    outputTokens: 10,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reportingSteps: 1,
  });
  assert.equal(estimate.known, false);
  assert.match(formatCostEstimate(estimate), /Official pricing was not found/);
});
