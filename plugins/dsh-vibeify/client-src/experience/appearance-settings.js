export const APPEARANCE_STORAGE_KEY = "dsh-vibeify.appearance.v1";
export const APPEARANCE_OPEN_EVENT = "dsh-vibeify:open-appearance-settings";
export const APPEARANCE_SETTINGS_EVENT = "dsh-vibeify:appearance-settings";
export const MAGAZINE_UPDATE_EVENT = "dsh-vibeify:update-magazine";

export { MAGAZINE_PALETTES, WEBSITE_LOOKS } from "../../../../shared/article-appearance.js";
import { cleanArticleAppearance } from "../../../../shared/article-appearance.js";

export function createAppearanceProfile(value = {}) {
  return Object.freeze({ version: 1, ...cleanArticleAppearance(value) });
}

export function loadAppearanceProfile(storage) {
  if (typeof storage?.getItem !== "function") return createAppearanceProfile();
  try {
    const parsed = JSON.parse(storage.getItem(APPEARANCE_STORAGE_KEY) ?? "null");
    return parsed?.version === 1 ? createAppearanceProfile(parsed) : createAppearanceProfile();
  } catch {
    return createAppearanceProfile();
  }
}

export function saveAppearanceProfile(storage, options) {
  const profile = createAppearanceProfile(options);
  try { storage?.setItem?.(APPEARANCE_STORAGE_KEY, JSON.stringify(profile)); } catch { /* Apply for this page even when storage is blocked. */ }
  return profile;
}

export function shouldCloseAppearanceSettingsOnClick(picker, target) {
  return !picker.contains(target) && target?.closest?.(".vfx-settings") == null;
}
