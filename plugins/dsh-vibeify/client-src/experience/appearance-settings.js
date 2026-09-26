export const APPEARANCE_STORAGE_KEY = "dsh-vibeify.appearance.v1";
export const APPEARANCE_OPEN_EVENT = "dsh-vibeify:open-appearance-settings";
export const APPEARANCE_SETTINGS_EVENT = "dsh-vibeify:appearance-settings";
export const MAGAZINE_UPDATE_EVENT = "dsh-vibeify:update-magazine";

export const MAGAZINE_PALETTES = Object.freeze({
  midnight: Object.freeze({ label: "Midnight", colors: Object.freeze({ background: "#080609", surface: "#19121b", ink: "#fffafc", muted: "#c7bac4", accent: "#ff9aba", border: "#58424f" }) }),
  paper: Object.freeze({ label: "Paper", colors: Object.freeze({ background: "#f4efe5", surface: "#fffdf7", ink: "#29251f", muted: "#60574d", accent: "#963b37", border: "#c8bdae" }) }),
  forest: Object.freeze({ label: "Forest", colors: Object.freeze({ background: "#eaf0e7", surface: "#f9fcf6", ink: "#18392c", muted: "#496355", accent: "#176648", border: "#b0c8b6" }) }),
  ocean: Object.freeze({ label: "Ocean", colors: Object.freeze({ background: "#081b2b", surface: "#102b40", ink: "#f0f9ff", muted: "#b8cfdd", accent: "#7bd8e9", border: "#3d687e" }) }),
});

const TEXT_SIZES = new Set(["standard", "large"]);
const SPACING = new Set(["standard", "roomy"]);

export function createAppearanceProfile(value = {}) {
  const options = value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.freeze({
    version: 1,
    palette: Object.hasOwn(MAGAZINE_PALETTES, options.palette) ? options.palette : "midnight",
    textSize: TEXT_SIZES.has(options.textSize) ? options.textSize : "standard",
    spacing: SPACING.has(options.spacing) ? options.spacing : "standard",
  });
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
