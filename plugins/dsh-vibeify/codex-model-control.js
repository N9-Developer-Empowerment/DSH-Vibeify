import {
  resolveCodexRuntimeSettings, selectableCodexModels,
  validateCodexRuntimeSettingsAgainstCatalog,
} from "./codex-capability.js";
import { CODEX_SETTINGS_NAMESPACE } from "./codex-settings.js";

import { registerLocalRpc } from "./local-rpc.js";
import { CODEX_MODELS_CHANNEL } from "./codex-model-channel.js";
const failure = (code, message) => ({ ok: false, error: { code, message, details: {} } });
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function createCodexModelControl({ settings, getRuntimeSettings, discover, activeSelections = () => [] }) {
  function state(models) {
    const descriptor = settings.describe({ redactSecrets: true }).find(({ ns }) => ns === CODEX_SETTINGS_NAMESPACE);
    if (!descriptor) throw new Error("Codex settings are unavailable.");
    return {
      selection: getRuntimeSettings(), revision: descriptor.revision,
      ...(models ? { models: selectableCodexModels(models) } : {}), active: activeSelections(),
    };
  }
  return async (action, payload, signal) => {
    if (!record(payload)) return failure("invalid-request", "Invalid model settings request.");
    if (!["read", "save", "status"].includes(action)) return failure("not-found", "Unknown model settings action.");
    const allowed = action !== "save" ? [] : ["model", "reasoningEffort", "revision"];
    if (Object.keys(payload).some((key) => !allowed.includes(key))) return failure("invalid-request", "Invalid model settings request.");
    if (action === "save" && (!Number.isSafeInteger(payload.revision) || payload.revision < 0)) {
      return failure("invalid-request", "Reload model settings before saving.");
    }
    try {
      if (action === "status") return { ok: true, value: state() };
      const models = await discover(signal);
      if (action === "save") {
        const next = resolveCodexRuntimeSettings({ capabilityLevel: "custom", model: payload.model, reasoningEffort: payload.reasoningEffort });
        if (typeof payload.model !== "string" || typeof payload.reasoningEffort !== "string") throw new Error("Choose a model and thinking effort.");
        const entry = validateCodexRuntimeSettingsAgainstCatalog(next, models);
        if (entry.hidden === true || !entry.inputModalities?.includes("image")) throw new Error("Choose an available model with image support.");
        // One revision-checked commit prevents partially changed model/effort pairs.
        await settings.update(CODEX_SETTINGS_NAMESPACE, next, payload.revision);
      }
      return { ok: true, value: state(models) };
    } catch (error) {
      if (error?.code === "SETTINGS_CONFLICT") return failure("conflict", "Model settings changed elsewhere. Reload before saving.");
      // Do not forward raw provider diagnostics, account data, or process output.
      return failure(action === "save" ? "save-failed" : "read-failed", action === "save"
        ? "The model choice could not be saved. Reload available models and try again."
        : "Available models could not be loaded. Check your Codex ChatGPT sign-in, then try again.");
    }
  };
}

export function registerCodexModelControl(ctx, control) {
  registerLocalRpc(ctx, CODEX_MODELS_CHANNEL, control);
}
