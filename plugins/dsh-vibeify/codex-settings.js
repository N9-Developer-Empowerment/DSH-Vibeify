import z from "@deepseek-ai/schemastery";
import {
  CODEX_CAPABILITY_CHOICES,
  CODEX_REASONING_CHOICES,
  DEFAULT_CODEX_RUNTIME_SETTINGS,
  resolveCodexRuntimeSettings,
} from "./codex-capability.js";

export const CODEX_SETTINGS_NAMESPACE = "llm-codex-chatgpt";

export const Config = z.object({
  capabilityLevel: z.union(CODEX_CAPABILITY_CHOICES.map(({ id }) => id)).default(DEFAULT_CODEX_RUNTIME_SETTINGS.capabilityLevel).volatile(),
  model: z.string().default(DEFAULT_CODEX_RUNTIME_SETTINGS.model).volatile(),
  reasoningEffort: z.union(CODEX_REASONING_CHOICES.map(({ id }) => id)).default(DEFAULT_CODEX_RUNTIME_SETTINGS.reasoningEffort).volatile(),
});

function runtimeSettings(value) {
  const read = (field) => typeof field?.get === "function" ? field.get() : field;
  return resolveCodexRuntimeSettings({
    capabilityLevel: read(value.capabilityLevel),
    model: read(value.model),
    reasoningEffort: read(value.reasoningEffort),
  });
}

export function installCodexRuntimeSettings(ctx, entry) {
  const base = entry ?? {};
  let source = () => base;
  ctx.inject(["settings"], (settingsCtx) => {
    if (typeof settingsCtx.settings.installSection !== "function") {
      // DSH 0.1.7 derives editable forms from volatile Config fields. Cordis
      // updates their references in place, preserving the active adapter.
      ctx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber), "dsh-vibeify: Codex settings presentation");
      return;
    }
    settingsCtx.settings.installSection(ctx, CODEX_SETTINGS_NAMESPACE, Config, base, {
      setSource: (next) => {
        source = next;
      },
      onChange: () => {},
      validate: runtimeSettings,
    });
  });
  return () => runtimeSettings(source());
}
