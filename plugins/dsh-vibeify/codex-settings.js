import z from "@deepseek-ai/schemastery";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import {
  CODEX_CAPABILITY_CHOICES,
  CODEX_MODEL_CHOICES,
  CODEX_REASONING_CHOICES,
  resolveCodexRuntimeSettings,
} from "./codex-capability.js";

export const CODEX_SETTINGS_NAMESPACE = settingsNamespace("llm-codex-chatgpt");

export const Config = z.object({
  capabilityLevel: z.union(CODEX_CAPABILITY_CHOICES.map(({ id }) => id)),
  model: z.union(CODEX_MODEL_CHOICES.map(({ id }) => id)).default("gpt-5.6-sol"),
  reasoningEffort: z.union(CODEX_REASONING_CHOICES.map(({ id }) => id)).default("xhigh"),
});

export function installCodexRuntimeSettings(ctx, entry) {
  const base = entry ?? {};
  let source = () => base;
  installSettingsSection(ctx, CODEX_SETTINGS_NAMESPACE, Config, base, {
    setSource: (next) => {
      source = next;
    },
    onChange: () => {},
  });
  return () => resolveCodexRuntimeSettings(source());
}
