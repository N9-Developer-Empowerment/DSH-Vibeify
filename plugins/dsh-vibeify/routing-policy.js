import { readFileSync } from "node:fs";
export {
  CODEX_CAPABILITY_CHOICES,
  CODEX_CAPABILITY_PRESETS,
  CODEX_MODEL_CHOICES,
  CODEX_REASONING_CHOICES,
  DEFAULT_CODEX_RUNTIME_SETTINGS,
  capabilityLabel,
  modelLabel,
  reasoningLabel,
  resolveCodexRuntimeSettings,
  runtimeSettingsFromYaml,
  runtimeStatus,
} from "./codex-capability.js";

const DEFAULT_POLICY_URL = new URL("./model-routing-policy.json", import.meta.url);

const VALID_SANDBOX_MODES = new Set([
  "read-only",
  "workspace-write",
  "danger-full-access",
]);

export const FULL_ACCESS_APPROVAL_POLICY = Object.freeze({
  granular: Object.freeze({
    sandbox_approval: false,
    rules: false,
    skill_approval: false,
    request_permissions: false,
    mcp_elicitations: true,
  }),
});

export function latestSessionPolicy(events, type, field) {
  for (let index = (events?.length ?? 0) - 1; index >= 0; index -= 1) {
    const event = events[index];
    const value = event?.type === type ? event.data?.[field] : undefined;
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

export function codexAccessPolicy({ sandboxMode, approvalPolicy }) {
  const sandbox = VALID_SANDBOX_MODES.has(sandboxMode) ? sandboxMode : "workspace-write";
  const fullAccessApprovals = approvalPolicy === "never";
  const approval = fullAccessApprovals ? FULL_ACCESS_APPROVAL_POLICY : "on-request";
  const sandboxPolicy = sandbox === "danger-full-access"
    ? { type: "dangerFullAccess" }
    : sandbox === "read-only"
      ? { type: "readOnly", networkAccess: true }
      : {
          type: "workspaceWrite",
          writableRoots: [],
          networkAccess: true,
          excludeTmpdirEnvVar: false,
          excludeSlashTmp: false,
        };
  return {
    sandboxMode: sandbox,
    approvalPolicy: approval,
    sandboxPolicy,
    label: sandbox === "danger-full-access" && fullAccessApprovals
      ? "Full Access"
      : sandbox === "read-only"
        ? "Read Only"
        : "Workspace Access",
  };
}

function schemaValue(schema) {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) return undefined;
  if (Object.hasOwn(schema, "const")) return schema.const;
  if (Object.hasOwn(schema, "default")) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length === 1) return schema.enum[0];
  if (
    Array.isArray(schema.oneOf)
    && schema.oneOf.length === 1
    && schema.oneOf[0] !== null
    && typeof schema.oneOf[0] === "object"
    && Object.hasOwn(schema.oneOf[0], "const")
  ) return schema.oneOf[0].const;
  if (schema.type === "boolean") return true;
  return undefined;
}

export function acceptedElicitationContent(requestedSchema) {
  if (
    requestedSchema === null
    || typeof requestedSchema !== "object"
    || Array.isArray(requestedSchema)
    || requestedSchema.type !== "object"
    || requestedSchema.properties === null
    || typeof requestedSchema.properties !== "object"
    || Array.isArray(requestedSchema.properties)
  ) return undefined;
  const required = requestedSchema.required ?? [];
  if (!Array.isArray(required) || !required.every((name) => typeof name === "string")) {
    return undefined;
  }
  const content = {};
  for (const name of required) {
    const value = schemaValue(requestedSchema.properties[name]);
    if (value === undefined) return undefined;
    content[name] = value;
  }
  return content;
}

function requireObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`model routing policy: ${label} must be an object`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`model routing policy: ${label} must be a non-empty string`);
  }
  return value;
}

function requireNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`model routing policy: ${label} must be a non-negative finite number`);
  }
  return value;
}

function validatePricing(pricing, label) {
  if (pricing === null) return;
  const value = requireObject(pricing, label);
  requireNumber(value.inputCacheHit, `${label}.inputCacheHit`);
  requireNumber(value.inputCacheMiss, `${label}.inputCacheMiss`);
  requireNumber(value.output, `${label}.output`);
}

function validatePolicy(policy) {
  const value = requireObject(policy, "root");
  if (value.schemaVersion !== 2) throw new Error("model routing policy: unsupported schemaVersion");
  requireString(value.verifiedAt, "verifiedAt");
  requireString(value.currency, "currency");
  requireString(value.pricingUnit, "pricingUnit");
  const lead = requireObject(value.lead, "lead");
  requireString(lead.provider, "lead.provider");
  requireString(lead.model, "lead.model");
  const quality = requireObject(value.qualityPolicy, "qualityPolicy");
  requireString(quality.quotaObjective, "qualityPolicy.quotaObjective");
  requireString(quality.leadInvariant, "qualityPolicy.leadInvariant");
  requireString(quality.rule, "qualityPolicy.rule");
  requireString(quality.fallback, "qualityPolicy.fallback");
  requireString(quality.primaryPolicy, "qualityPolicy.primaryPolicy");
  requireString(quality.delegationDefault, "qualityPolicy.delegationDefault");
  requireString(quality.verificationContract, "qualityPolicy.verificationContract");
  if (!Number.isSafeInteger(quality.maximumDelegationsPerTurn) || quality.maximumDelegationsPerTurn < 0) {
    throw new Error("model routing policy: maximumDelegationsPerTurn must be a non-negative safe integer");
  }
  for (const list of ["codexResponsibilities", "workerResponsibilities", "neverDelegate"]) {
    if (!Array.isArray(quality[list]) || quality[list].length === 0) {
      throw new Error(`model routing policy: qualityPolicy.${list} must be a non-empty array`);
    }
    for (const [index, item] of quality[list].entries()) {
      requireString(item, `qualityPolicy.${list}[${index}]`);
    }
  }
  if (!Array.isArray(value.models) || value.models.length === 0) {
    throw new Error("model routing policy: models must be a non-empty array");
  }
  const routes = new Set();
  for (const [index, raw] of value.models.entries()) {
    const model = requireObject(raw, `models[${index}]`);
    const provider = requireString(model.provider, `models[${index}].provider`);
    const id = requireString(model.id, `models[${index}].id`);
    const route = `${provider}/${id}`;
    if (routes.has(route)) throw new Error(`model routing policy: duplicate route ${route}`);
    routes.add(route);
    requireString(model.name, `models[${index}].name`);
    if (!Array.isArray(model.modalities) || model.modalities.length === 0) {
      throw new Error(`model routing policy: ${route} modalities must be non-empty`);
    }
    if (!Number.isSafeInteger(model.delegatedMaxTokensPerStep) || model.delegatedMaxTokensPerStep < 1) {
      throw new Error(`model routing policy: ${route} delegatedMaxTokensPerStep must be positive`);
    }
    validatePricing(model.pricing, `${route}.pricing`);
  }
  return value;
}

export function loadRoutingPolicy(url = DEFAULT_POLICY_URL) {
  return validatePolicy(JSON.parse(readFileSync(url, "utf8")));
}

export function policyModel(policy, provider, model) {
  return policy.models.find((entry) => entry.provider === provider && entry.id === model);
}

export async function liveModelCatalog(llm, policy) {
  const models = [];
  for (const provider of llm.listProviders()) {
    const advertised = await llm.listModels(provider.id);
    for (const entry of advertised) {
      const configured = policyModel(policy, provider.id, entry.id);
      models.push({
        route: `${provider.id}/${entry.id}`,
        provider: provider.id,
        providerName: provider.name,
        id: entry.id,
        name: entry.name ?? entry.id,
        description: entry.description,
        modalities: entry.inputModalities ?? ["text"],
        primaryForNewSession: provider.id === policy.lead.provider && entry.id === policy.lead.model,
        leadAllowedByPolicy: provider.id === policy.lead.provider && entry.id === policy.lead.model,
        subagentFromCurrentCodex: provider.id !== policy.lead.provider,
        credentialCheckedOnUse: true,
        ...(configured === undefined ? {
          pricing: null,
          pricingStatus: "No verified local price policy; do not choose this route for claimed savings.",
        } : {
          tier: configured.tier,
          useFor: configured.useFor,
          avoidFor: configured.avoidFor,
          delegatedMaxTokensPerStep: configured.delegatedMaxTokensPerStep,
          pricing: configured.pricing,
          pricingStatus: configured.pricing === null
            ? "Official pricing was not found; do not choose this model purely on cost."
            : `${policy.currency} ${policy.pricingUnit}; verified ${policy.verifiedAt}`,
        }),
      });
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    pricingVerifiedAt: policy.verifiedAt,
    pricingCurrency: policy.currency,
    pricingUnit: policy.pricingUnit,
    currentLead: policy.lead,
    qualityPolicy: policy.qualityPolicy,
    notes: [
      "This routing policy always keeps ChatGPT Codex as the lead agent.",
      "DeepSeek routes are workers only: Codex delegates bounded work, verifies it, and owns the final answer.",
      "The Codex bridge can delegate only routes marked subagentFromCurrentCodex; do not recommend a worker as the primary model.",
      "Registered catalogue presence does not prove that a provider credential has funds; authentication is checked on use."
    ],
    models,
  };
}

export function catalogForModel(catalog) {
  return JSON.stringify(catalog, null, 2);
}

export function buildDeveloperRoutingInstructions(policy) {
  const names = policy.models.map((model) => `${model.name} (${model.tier})`).join(", ");
  return [
    "DSH DeepSeek-first execution under Codex governance:",
    `- ${policy.qualityPolicy.leadInvariant}`,
    `- ${policy.qualityPolicy.quotaObjective}`,
    `- Available native DeepSeek policy routes: ${names}. Use dsh_model_catalog for the live installed catalogue, exact capabilities, and verified prices before making a cost-based routing decision.`,
    `- ${policy.qualityPolicy.rule}`,
    `- ${policy.qualityPolicy.fallback}`,
    `- ${policy.qualityPolicy.primaryPolicy}`,
    `- ${policy.qualityPolicy.delegationDefault}`,
    `- Before delegation, Codex must define the bounded task, unchanged authority boundary, acceptance criteria, and evidence request. Give them to delegate_to_dsh_model as separate fields.`,
    `- Codex responsibilities: ${policy.qualityPolicy.codexResponsibilities.join("; ")}.`,
    `- DeepSeek worker responsibilities: ${policy.qualityPolicy.workerResponsibilities.join("; ")}.`,
    `- Never delegate: ${policy.qualityPolicy.neverDelegate.join("; ")}.`,
    `- ${policy.qualityPolicy.verificationContract}`,
    `- Prefer DeepSeek-V4-Flash for routine execution packets. Use Pro only when Flash's likely rework or reasoning risk outweighs the price difference. Use the experimental vision route only when the user explicitly asks to forward current images.`,
    `- Keep planning, final synthesis, acceptance, authorization-bearing decisions, and uncertain semantic judgment with Codex. Do not lower tests, review depth, evidence requirements, or safety boundaries to save quota.`,
    `- Delegate at most ${policy.qualityPolicy.maximumDelegationsPerTurn} execution packets per user turn. Decompose clean independent packets, but do not split work merely to manufacture model calls and do not run Flash and Pro gratuitously.`,
    `- This Codex route uses ChatGPT authentication and removes OpenAI API keys. The optimization target is the user's finite Codex plan quota. DeepSeek is separately API-billed, so use it when its low measured API cost and demonstrable quality parity justify moving bounded worker effort away from Codex.`,
    `- Never hand leadership to another model. Use delegate_to_dsh_model for worker tasks, then independently assess the evidence and deliver the answer as Codex lead.`,
    `- Tell the user which model is delegated, why it is suitable, and how its output will be verified. Treat returned cost as an estimate from provider-reported token counts and the dated local price policy.`,
  ].join("\n");
}

export function summarizeTokenUsage(events) {
  const usage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reportingSteps: 0,
  };
  for (const event of events ?? []) {
    if (event?.type !== "assistant/message" || event.data?.usage === undefined) continue;
    const row = event.data.usage;
    usage.inputTokens += Number(row.inputTokens ?? 0);
    usage.outputTokens += Number(row.outputTokens ?? 0);
    usage.cacheReadTokens += Number(row.cacheReadTokens ?? 0);
    usage.cacheWriteTokens += Number(row.cacheWriteTokens ?? 0);
    usage.reportingSteps += 1;
  }
  return usage;
}

export function estimateModelCost(policy, provider, model, usage) {
  const entry = policyModel(policy, provider, model);
  if (entry === undefined || entry.pricing === null) {
    return {
      known: false,
      reason: entry === undefined
        ? "No verified local price policy exists for this route."
        : "Official pricing was not found for this experimental model.",
      usage,
    };
  }
  if (usage.reportingSteps === 0) {
    return { known: false, reason: "The provider returned no token-usage record.", usage };
  }
  const uncached = usage.inputTokens + usage.cacheWriteTokens;
  const cost = (
    uncached * entry.pricing.inputCacheMiss
    + usage.cacheReadTokens * entry.pricing.inputCacheHit
    + usage.outputTokens * entry.pricing.output
  ) / 1_000_000;
  return {
    known: true,
    currency: policy.currency,
    amount: cost,
    verifiedAt: policy.verifiedAt,
    pricing: entry.pricing,
    usage,
  };
}

function money(amount) {
  if (amount === 0) return "0.00000000";
  return amount.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatCostEstimate(estimate) {
  if (!estimate.known) return `Estimated model cost unavailable: ${estimate.reason}`;
  const usage = estimate.usage;
  return [
    `Estimated DeepSeek API cost: ${estimate.currency} $${money(estimate.amount)}`,
    `(input ${usage.inputTokens}, cache read ${usage.cacheReadTokens}, cache write ${usage.cacheWriteTokens}, output ${usage.outputTokens} tokens; rates verified ${estimate.verifiedAt}).`,
  ].join(" ");
}
