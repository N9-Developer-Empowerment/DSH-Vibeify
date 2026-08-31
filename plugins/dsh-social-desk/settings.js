import z from "@deepseek-ai/schemastery";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";

export const SOCIAL_DESK_SETTINGS_NAMESPACE = settingsNamespace("dsh-social-desk");

const credential = (fallback) => z.string().role("credential-ref").default(fallback);

export const Config = z.object({
  timezone: z.string().default("Europe/London"),
  staleAfterMinutes: z.number().default(60),
  defaultChannels: z.array(z.string()).default(["x", "bluesky", "threads", "facebook-page", "instagram", "reddit", "discord", "youtube-community"]),

  xEnabled: z.boolean().default(false),
  xUsername: z.string().default(""),
  xTokenRef: credential("X_USER_ACCESS_TOKEN"),

  blueskyEnabled: z.boolean().default(false),
  blueskyHandle: z.string().default(""),
  blueskyAppPasswordRef: credential("BLUESKY_APP_PASSWORD"),

  threadsEnabled: z.boolean().default(false),
  threadsUserId: z.string().default(""),
  threadsTokenRef: credential("THREADS_ACCESS_TOKEN"),

  facebookPageEnabled: z.boolean().default(false),
  facebookPagePageId: z.string().default(""),
  facebookPageTokenRef: credential("FACEBOOK_PAGE_ACCESS_TOKEN"),

  instagramEnabled: z.boolean().default(false),
  instagramUserId: z.string().default(""),
  instagramTokenRef: credential("INSTAGRAM_ACCESS_TOKEN"),
});

export function installSocialDeskSettings(ctx, entry) {
  const base = entry ?? {};
  let source = () => base;
  installSettingsSection(ctx, SOCIAL_DESK_SETTINGS_NAMESPACE, Config, base, {
    setSource: (next) => { source = next; },
    onChange: () => {},
  });
  return () => source();
}

