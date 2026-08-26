export const CODEX_MODEL_CHOICES = Object.freeze([
  { id: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
  { id: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
  { id: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
]);

export const CODEX_REASONING_CHOICES = Object.freeze([
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "xhigh", label: "Extra High" },
  { id: "max", label: "Max" },
]);

export const CODEX_CAPABILITY_PRESETS = Object.freeze({
  efficient: Object.freeze({
    label: "Efficient",
    model: "gpt-5.6-luna",
    reasoningEffort: "high",
    summary: "A lighter Codex governor for routine, highly checkable work.",
  }),
  balanced: Object.freeze({
    label: "Balanced",
    model: "gpt-5.6-terra",
    reasoningEffort: "high",
    summary: "Strong planning and verification with a lighter lead model.",
  }),
  frontier: Object.freeze({
    label: "Frontier (recommended)",
    model: "gpt-5.6-sol",
    reasoningEffort: "xhigh",
    summary: "SOTA Codex lead for planning, judgment, integration, and verification.",
  }),
  maximum: Object.freeze({
    label: "Maximum",
    model: "gpt-5.6-sol",
    reasoningEffort: "max",
    summary: "Maximum supported reasoning for the hardest quality-first work.",
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
  if (!CODEX_MODEL_CHOICES.some(({ id }) => id === model)) {
    throw new Error(`unsupported DSH Codex model ${model}`);
  }
  if (!CODEX_REASONING_CHOICES.some(({ id }) => id === reasoningEffort)) {
    throw new Error(`unsupported DSH Codex reasoning effort ${reasoningEffort}`);
  }
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
