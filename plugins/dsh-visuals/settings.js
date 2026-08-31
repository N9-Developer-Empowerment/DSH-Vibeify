import z from "@deepseek-ai/schemastery";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";

export const VISUAL_SETTINGS_NAMESPACE = settingsNamespace("dsh-visuals");

export const Config = z.object({
  wikimedia: z.boolean().default(true),
  openverse: z.boolean().default(true),
  pexels: z.boolean().default(true),
  pixabay: z.boolean().default(true),
  pexelsApiKeyEnv: z.string().role("credential-ref").default("PEXELS_API_KEY"),
  pixabayApiKeyEnv: z.string().role("credential-ref").default("PIXABAY_API_KEY"),
});

export function installVisualSettings(ctx, entry) {
  const base = entry ?? {};
  let source = () => base;
  installSettingsSection(ctx, VISUAL_SETTINGS_NAMESPACE, Config, base, {
    setSource: (next) => { source = next; },
    onChange: () => {},
  });
  return () => source();
}
