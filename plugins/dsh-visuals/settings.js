import z from "@deepseek-ai/schemastery";

export const VISUAL_SETTINGS_NAMESPACE = "dsh-visuals";

export const Config = z.object({
  wikimedia: z.boolean().default(true).volatile(),
  openverse: z.boolean().default(true).volatile(),
  pexels: z.boolean().default(true).volatile(),
  pixabay: z.boolean().default(true).volatile(),
  pexelsApiKeyEnv: z.string().role("credential-ref").default("PEXELS_API_KEY").volatile(),
  pixabayApiKeyEnv: z.string().role("credential-ref").default("PIXABAY_API_KEY").volatile(),
});

export function installVisualSettings(ctx, entry) {
  const base = entry ?? {};
  let source = () => base;
  ctx.inject(["settings"], (settingsCtx) => {
    if (typeof settingsCtx.settings.installSection !== "function") {
      // DSH 0.1.7 derives forms from volatile Config fields and updates their
      // references in place. The Images page owns the presentation.
      ctx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber), "dsh-visuals: image settings presentation");
      return;
    }
    settingsCtx.settings.installSection(ctx, VISUAL_SETTINGS_NAMESPACE, Config, base, {
      setSource: (next) => { source = next; },
      onChange: () => {},
    });
  });
  return () => {
    const value = source();
    if (!Object.values(value).some((field) => typeof field?.get === "function")) return value;
    return Object.fromEntries(Object.entries(value).map(([key, field]) => [key, typeof field?.get === "function" ? field.get() : field]));
  };
}
