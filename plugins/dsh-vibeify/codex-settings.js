import z from "@deepseek-ai/schemastery";
import {
  CODEX_CAPABILITY_CHOICES,
  CODEX_MODEL_CHOICES,
  CODEX_REASONING_CHOICES,
  DEFAULT_CODEX_RUNTIME_SETTINGS,
  resolveCodexRuntimeSettings,
} from "./codex-capability.js";

export const CODEX_SETTINGS_NAMESPACE = "llm-codex-chatgpt";

export const Config = z.object({
  capabilityLevel: z.union(CODEX_CAPABILITY_CHOICES.map(({ id }) => id)).default(DEFAULT_CODEX_RUNTIME_SETTINGS.capabilityLevel),
  model: z.union(CODEX_MODEL_CHOICES.map(({ id }) => id)).default(DEFAULT_CODEX_RUNTIME_SETTINGS.model),
  reasoningEffort: z.union(CODEX_REASONING_CHOICES.map(({ id }) => id)).default(DEFAULT_CODEX_RUNTIME_SETTINGS.reasoningEffort),
});

export function installCodexRuntimeSettings(ctx, entry) {
  const base = entry ?? {};
  let source = () => base;
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.installSection(ctx, CODEX_SETTINGS_NAMESPACE, Config, base, {
      setSource: (next) => {
        source = next;
      },
      onChange: () => {},
    });
  });
  return () => resolveCodexRuntimeSettings(source());
}
