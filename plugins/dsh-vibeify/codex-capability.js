export const CODEX_MODEL_CHOICES = Object.freeze([
  { id: "gpt-6-luna", label: "GPT-6 Luna" },
  { id: "gpt-6.1-sol", label: "GPT-6.1 Sol" },
  { id: "gpt-6-sol", label: "GPT-6 Sol" },
  { id: "gpt-6-astra", label: "GPT-6 Astra" },
  { id: "gpt-5.6-terra", label: "GPT-5.6 Terra (specialist)" },
  { id: "gpt-5.6-sol", label: "GPT-5.6 Sol (compatibility)" },
  { id: "gpt-5.6-luna", label: "GPT-5.6 Luna (compatibility)" },
]);

export const CODEX_SPECIALIST_MODEL_IDS = Object.freeze([
  "gpt-5.6-terra",
  "gpt-6-sol",
  "gpt-6-astra",
]);

export const CODEX_REASONING_CHOICES = Object.freeze([
  { id: "none", label: "None" },
  { id: "minimal", label: "Minimal" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "xhigh", label: "Extra High" },
  { id: "max", label: "Max" },
  { id: "ultra", label: "Ultra (model-specific)" },
]);

export const CODEX_CAPABILITY_PRESETS = Object.freeze({
  efficient: Object.freeze({
    label: "Efficient",
    model: "gpt-6-luna",
    reasoningEffort: "low",
    summary: "A lighter Codex governor for routine, highly checkable work.",
  }),
  balanced: Object.freeze({
    label: "Balanced",
    model: "gpt-6-luna",
    reasoningEffort: "high",
    summary: "A moderate Luna setting for planning and verification.",
  }),
  frontier: Object.freeze({
    label: "Luna Max (recommended)",
    model: "gpt-6-luna",
    reasoningEffort: "max",
    summary: "GPT-6 Luna at Max for planning, judgment, integration, and verification.",
  }),
  maximum: Object.freeze({
    label: "Maximum",
    model: "gpt-6-luna",
    reasoningEffort: "max",
    summary: "Maximum supported reasoning on the Luna lead.",
  }),
});

export const CODEX_CAPABILITY_CHOICES = Object.freeze([
  ...Object.entries(CODEX_CAPABILITY_PRESETS).map(([id, preset]) => ({
    id,
    label: preset.label,
    summary: preset.summary,
  })),
  {
    id: "custom",
    label: "Custom",
    summary: "Use the exact model and reasoning effort stored in DSH settings.",
  },
]);

export const DEFAULT_CODEX_RUNTIME_SETTINGS = Object.freeze({
  capabilityLevel: "frontier",
  model: CODEX_CAPABILITY_PRESETS.frontier.model,
  reasoningEffort: CODEX_CAPABILITY_PRESETS.frontier.reasoningEffort,
});

export function codexModelId(entry) {
  return entry?.model ?? entry?.id;
}

export function supportedReasoningEfforts(entry) {
  return Array.isArray(entry?.supportedReasoningEfforts)
    ? entry.supportedReasoningEfforts
      .map((effort) => effort?.reasoningEffort)
      .filter((effort) => typeof effort === "string" && effort.length > 0)
    : [];
}

export function validateCodexRuntimeSettingsAgainstCatalog(value, models) {
  const runtime = resolveCodexRuntimeSettings(value);
  if (!Array.isArray(models)) {
    throw new Error("codex-chatgpt: authenticated model catalogue is invalid");
  }
  const selected = models.find((entry) => codexModelId(entry) === runtime.model);
  if (selected === undefined) {
    throw new Error(`codex-chatgpt: configured model ${runtime.model} is not available in the authenticated Codex catalogue`);
  }
  const efforts = supportedReasoningEfforts(selected);
  if (!efforts.includes(runtime.reasoningEffort)) {
    throw new Error(
      efforts.length === 0
        ? `codex-chatgpt: ${runtime.model} did not advertise supported reasoning efforts`
        : `codex-chatgpt: ${runtime.model} does not support reasoning effort ${runtime.reasoningEffort}`,
    );
  }
  return selected;
}

const MAX_MODEL_LIST_PAGES = 100;
const MAX_MODELS = 10_000;

export async function listCodexModels(requestPage, { limit = 100, maxPages = MAX_MODEL_LIST_PAGES } = {}) {
  if (typeof requestPage !== "function") throw new TypeError("Codex model list requires a page requester");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
    throw new RangeError("Codex model page size must be between 1 and 1000");
  }
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > MAX_MODEL_LIST_PAGES) {
    throw new RangeError(`Codex model list is limited to ${MAX_MODEL_LIST_PAGES} pages`);
  }

  const models = [];
  const modelIds = new Set();
  const cursors = new Set();
  let cursor;
  for (let page = 0; page < maxPages; page += 1) {
    const response = await requestPage({
      limit,
      includeHidden: false,
      ...(cursor === undefined ? {} : { cursor }),
    });
    if (response === null || typeof response !== "object" || Array.isArray(response)) {
      throw new Error("codex-chatgpt: model/list returned an invalid page");
    }
    if (!Array.isArray(response.data)) {
      throw new Error("codex-chatgpt: model/list response did not contain model data");
    }
    for (const entry of response.data) {
      if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error("codex-chatgpt: model/list returned an invalid model entry");
      }
      if (typeof codexModelId(entry) !== "string" || codexModelId(entry).length === 0) {
        throw new Error("codex-chatgpt: model/list returned a model without an id");
      }
      if (modelIds.has(codexModelId(entry))) {
        throw new Error(`codex-chatgpt: model/list returned duplicate model ${codexModelId(entry)}`);
      }
      modelIds.add(codexModelId(entry));
      models.push(entry);
      if (models.length > MAX_MODELS) {
        throw new Error(`codex-chatgpt: model/list exceeded the ${MAX_MODELS} model safety limit`);
      }
    }
    const nextCursor = response.nextCursor;
    if (nextCursor === undefined || nextCursor === null) return models;
    if (typeof nextCursor !== "string" || nextCursor.length === 0 || cursors.has(nextCursor)) {
      throw new Error("codex-chatgpt: model/list returned an invalid or repeated pagination cursor");
    }
    cursors.add(nextCursor);
    cursor = nextCursor;
  }
  throw new Error(`codex-chatgpt: model/list exceeded the ${maxPages} page safety limit`);
}

function choiceLabel(choices, id) {
  return choices.find((choice) => choice.id === id)?.label ?? id;
}

export function capabilityLabel(capabilityLevel) {
  return choiceLabel(CODEX_CAPABILITY_CHOICES, capabilityLevel);
}

export function modelLabel(model) {
  return choiceLabel(CODEX_MODEL_CHOICES, model);
}

export function reasoningLabel(reasoningEffort) {
  return choiceLabel(CODEX_REASONING_CHOICES, reasoningEffort);
}

function validateExact(model, reasoningEffort) {
  // Availability belongs to the signed-in catalogue, not this display-label list.
  if (typeof model !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/u.test(model)) {
    throw new Error(`unsupported DSH Codex model ${model}`);
  }
  if (!CODEX_REASONING_CHOICES.some(({ id }) => id === reasoningEffort)) {
    throw new Error(`unsupported DSH Codex reasoning effort ${reasoningEffort}`);
  }
}

export function selectableCodexModels(models) {
  return models.filter((entry) => entry.hidden !== true
    && entry.inputModalities?.includes("image")
    && supportedReasoningEfforts(entry).length > 0).map((entry) => ({
    model: codexModelId(entry),
    label: entry.displayName || modelLabel(codexModelId(entry)),
    efforts: supportedReasoningEfforts(entry).map((effort) => ({
      id: effort, label: reasoningLabel(effort),
    })),
    defaultEffort: entry.defaultReasoningEffort,
  }));
}

function inferredCapability(model, reasoningEffort) {
  for (const [id, preset] of Object.entries(CODEX_CAPABILITY_PRESETS)) {
    if (preset.model === model && preset.reasoningEffort === reasoningEffort) return id;
  }
  return "custom";
}

export function resolveCodexRuntimeSettings(value = {}) {
  const capabilityLevel = value.capabilityLevel
    ?? inferredCapability(
      value.model ?? DEFAULT_CODEX_RUNTIME_SETTINGS.model,
      value.reasoningEffort ?? DEFAULT_CODEX_RUNTIME_SETTINGS.reasoningEffort,
    );
  if (capabilityLevel === "custom") {
    const model = value.model ?? DEFAULT_CODEX_RUNTIME_SETTINGS.model;
    const reasoningEffort = value.reasoningEffort ?? DEFAULT_CODEX_RUNTIME_SETTINGS.reasoningEffort;
    validateExact(model, reasoningEffort);
    return { capabilityLevel, model, reasoningEffort };
  }
  const preset = CODEX_CAPABILITY_PRESETS[capabilityLevel];
  if (preset === undefined) {
    throw new Error(`unsupported DSH Codex capability level ${String(capabilityLevel)}`);
  }
  return {
    capabilityLevel,
    model: preset.model,
    reasoningEffort: preset.reasoningEffort,
  };
}

function scalar(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2
    && ((trimmed.startsWith('"') && trimmed.endsWith('"'))
      || (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) return trimmed.slice(1, -1);
  return trimmed;
}

export function runtimeSettingsFromYaml(document) {
  const configured = {};
  let inSection = false;
  for (const line of document.split(/\r?\n/u)) {
    if (/^\S/u.test(line)) {
      inSection = line.trim() === "llm-codex-chatgpt:";
      continue;
    }
    if (!inSection) continue;
    const match = /^\s{2}(capabilityLevel|model|reasoningEffort):\s*(.+?)\s*$/u.exec(line);
    if (match !== null) configured[match[1]] = scalar(match[2]);
  }
  return resolveCodexRuntimeSettings(configured);
}

export function runtimeStatus({ capabilityLevel, model, reasoningEffort, access }) {
  return `${capabilityLabel(capabilityLevel)} · ${modelLabel(model)} · ${reasoningLabel(reasoningEffort)} · ${access.label}`;
}
