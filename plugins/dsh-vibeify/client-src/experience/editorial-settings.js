export const EDITORIAL_STORAGE_KEY = "dsh-vibeify.editorial.v1";
export const EDITORIAL_SETTINGS_EVENT = "dsh-vibeify:editorial-settings";
export const EDITORIAL_SETTINGS_VERSION = 1;

const MAX_CUSTOM_DIRECTION = 360;

export const EDITORIAL_PRESETS = Object.freeze({
  open: Object.freeze({
    id: "open",
    label: "Open mix",
    description: "A broad, unpredictable edit spanning culture, useful ideas, sound, images and things worth watching.",
    direction: "Keep the edition broad, curious and unpredictable. Mix culture, useful ideas, sound, images and things worth watching without assuming a demographic profile.",
  }),
  style: Object.freeze({
    id: "style",
    label: "Style & social life",
    description: "Fashion, beauty, popular culture and thoughtful relationship material without stereotypes or diagnosis.",
    direction: "Prioritise fashion, beauty, popular culture and thoughtful non-diagnostic relationship material. Keep the tone contemporary, visually alert and free of gender or age stereotypes.",
  }),
  machines: Object.freeze({
    id: "machines",
    label: "Football, AI & cars",
    description: "Football culture, artificial intelligence, cars, engineering and the people shaping them.",
    direction: "Prioritise football culture, artificial intelligence, cars, engineering and the people shaping them. Balance practical routes with history, design and strong things to watch or hear.",
  }),
  custom: Object.freeze({
    id: "custom",
    label: "Custom direction",
    description: "Your own short brief for subjects, audience, voice and energy.",
    direction: "Use the reader's explicit custom editorial direction without inferring extra personal traits or intent.",
  }),
});

function cleanCustomDirection(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CUSTOM_DIRECTION);
}

export function createEditorialProfile(preset = "open", customDirection = "") {
  const selected = Object.hasOwn(EDITORIAL_PRESETS, preset) ? preset : "open";
  const custom = cleanCustomDirection(customDirection);
  const effectivePreset = selected === "custom" && custom.length === 0 ? "open" : selected;
  const definition = EDITORIAL_PRESETS[effectivePreset];
  const direction = effectivePreset === "custom"
    ? custom
    : `${definition.direction}${custom.length === 0 ? "" : ` Additional editor note: ${custom}`}`;
  return Object.freeze({
    version: EDITORIAL_SETTINGS_VERSION,
    preset: effectivePreset,
    label: definition.label,
    direction,
    customDirection: custom,
  });
}

export function loadEditorialProfile(storage) {
  if (storage === null || storage === undefined || typeof storage.getItem !== "function") return createEditorialProfile();
  try {
    const parsed = JSON.parse(storage.getItem(EDITORIAL_STORAGE_KEY) ?? "null");
    if (parsed === null || typeof parsed !== "object" || parsed.version !== EDITORIAL_SETTINGS_VERSION) return createEditorialProfile();
    return createEditorialProfile(parsed.preset, parsed.customDirection);
  } catch {
    return createEditorialProfile();
  }
}

export function saveEditorialProfile(storage, preset, customDirection = "") {
  const profile = createEditorialProfile(preset, customDirection);
  if (storage === null || storage === undefined || typeof storage.setItem !== "function") return profile;
  try {
    storage.setItem(EDITORIAL_STORAGE_KEY, JSON.stringify({
      version: EDITORIAL_SETTINGS_VERSION,
      preset: profile.preset,
      customDirection: profile.customDirection,
    }));
  } catch {
    // The selected direction still applies for this page through the dispatched event.
  }
  return profile;
}
