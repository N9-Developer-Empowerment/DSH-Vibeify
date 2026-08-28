export const EDITORIAL_STORAGE_KEY = "dsh-vibeify.editorial.v1";
export const EDITORIAL_SETTINGS_EVENT = "dsh-vibeify:editorial-settings";
export const EDITORIAL_SETTINGS_VERSION = 2;
export const MAX_DEEPSEEK_DAILY_BUDGET_USD = 2;
export const BACKGROUND_ACTIVITY_WINDOW_MS = 24 * 60 * 60 * 1000;

const MAX_CUSTOM_DIRECTION = 360;
const DEFAULT_SERENDIPITY = 0.2;

export const EDITORIAL_TRIBES = Object.freeze({
  "global-curious": Object.freeze({ id: "global-curious", label: "Global & curious", description: "The important, surprising and magazine-worthy things moving across the world." }),
  "gen-z": Object.freeze({ id: "gen-z", label: "Gen Z", description: "Youth culture, new language, work, identity, entertainment and emerging behaviour." }),
  "creators-influencers": Object.freeze({ id: "creators-influencers", label: "Creators & influencers", description: "Original creators, online culture, audiences and the craft behind public attention." }),
  "builders-nerds": Object.freeze({ id: "builders-nerds", label: "Builders & nerds", description: "Science, technology, engineering, open systems and people who make things work." }),
  entrepreneurs: Object.freeze({ id: "entrepreneurs", label: "Entrepreneurs", description: "Founders, business, useful ambition, new markets and lessons from making something real." }),
  "self-development": Object.freeze({ id: "self-development", label: "Self-development", description: "Practical growth, learning and wellbeing without diagnosis, hustle worship or false certainty." }),
  "parents-families": Object.freeze({ id: "parents-families", label: "Parents & families", description: "Family life, education, care, play and the systems surrounding everyday households." }),
  "life-experienced": Object.freeze({ id: "life-experienced", label: "Life-experienced", description: "Long views, later-life reinvention, history, continuity and experience without patronising age labels." }),
  "culture-arts": Object.freeze({ id: "culture-arts", label: "Culture & arts", description: "Books, visual art, film, television, fashion, design and the people making culture." }),
  "music-communities": Object.freeze({ id: "music-communities", label: "Music communities", description: "New sound, scenes, back catalogues, live culture and routes to listen." }),
  gamers: Object.freeze({ id: "gamers", label: "Gamers", description: "Games, play, studios, communities, interactive storytelling and the culture around them." }),
  "sports-communities": Object.freeze({ id: "sports-communities", label: "Sports communities", description: "Sport as competition, identity, design, business, ritual and shared culture." }),
  sustainability: Object.freeze({ id: "sustainability", label: "Sustainability", description: "Climate, energy, nature, materials and credible routes to a liveable future." }),
  "politics-society": Object.freeze({ id: "politics-society", label: "Politics & society", description: "Power, public life, justice and difficult stories with context rather than outrage bait." }),
  "local-life": Object.freeze({ id: "local-life", label: "Local life", description: "Places, communities, transport, homes, independent culture and useful civic life." }),
});

// Compatibility surface for already generated 0.12 clients while the UI moves
// from topic presets to explicit multi-select editorial lenses.
export const EDITORIAL_PRESETS = Object.freeze({
  open: Object.freeze({ id: "open", label: "Global & curious", description: EDITORIAL_TRIBES["global-curious"].description }),
  custom: Object.freeze({ id: "custom", label: "Custom direction", description: "A short editor's note can refine the selected audience lenses and voice." }),
});

function cleanCustomDirection(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_CUSTOM_DIRECTION);
}

function selectedTribes(value) {
  const requested = Array.isArray(value) ? value : [];
  const selected = [...new Set(requested.filter((id) => Object.hasOwn(EDITORIAL_TRIBES, id)))].slice(0, 10);
  return Object.freeze(selected.length === 0 ? ["global-curious"] : selected);
}

function boundedBudget(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return MAX_DEEPSEEK_DAILY_BUDGET_USD;
  return Math.round(Math.max(0, Math.min(MAX_DEEPSEEK_DAILY_BUDGET_USD, numeric)) * 100) / 100;
}

function boundedSerendipity(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0.1, Math.min(0.4, numeric)) : DEFAULT_SERENDIPITY;
}

function legacyOptions(preset, customDirection) {
  const custom = cleanCustomDirection(customDirection);
  const mapping = {
    style: ["creators-influencers", "culture-arts"],
    machines: ["builders-nerds", "sports-communities", "entrepreneurs"],
  };
  return { preset: preset === "custom" && custom.length > 0 ? "custom" : "open", tribes: mapping[preset] ?? ["global-curious"], customDirection: custom };
}

export function createEditorialProfile(presetOrOptions = "open", customDirection = "") {
  const options = presetOrOptions !== null && typeof presetOrOptions === "object" && !Array.isArray(presetOrOptions)
    ? presetOrOptions
    : legacyOptions(presetOrOptions, customDirection);
  const tribes = selectedTribes(options.tribes ?? options.selectedTribes);
  const custom = cleanCustomDirection(options.customDirection ?? customDirection);
  const labels = tribes.map((id) => EDITORIAL_TRIBES[id].label);
  const lensCopy = tribes.map((id) => `${EDITORIAL_TRIBES[id].label}: ${EDITORIAL_TRIBES[id].description}`).join(" ");
  const serendipity = boundedSerendipity(options.serendipity);
  const direction = [
    "Act as one witty magazine editor: entertain, educate and inform; espouse freedom, creativity and humour; never optimise for anger, conflict or distress.",
    "Lead with genuinely global magazine-worthy subjects, then strong English-language perspectives from the UK, US, Canada, Australia and India, plus major-power coverage including China without excluding other regions.",
    `Selected editorial lenses: ${lensCopy}`,
    `Keep roughly ${Math.round(serendipity * 100)}% of the edition as useful serendipity outside those lenses.`,
    "Include politics, crime, celebrity and difficult stories when editorially worthwhile, using restrained context notes and non-graphic lead media.",
    custom.length === 0 ? "" : `Additional editor note: ${custom}`,
  ].filter(Boolean).join(" ");
  return Object.freeze({
    version: EDITORIAL_SETTINGS_VERSION,
    preset: custom.length > 0 && options.preset === "custom" ? "custom" : "open",
    label: labels.length === 1 ? labels[0] : `${labels.length} editorial lenses`,
    direction,
    tribes,
    customDirection: custom,
    serendipity,
    backgroundEditor: options.backgroundEditor !== false,
    dailyBudgetUsd: boundedBudget(options.dailyBudgetUsd),
    contentNotes: options.contentNotes !== false,
    clickToLoadMedia: options.clickToLoadMedia !== false,
  });
}

export function loadEditorialProfile(storage) {
  if (storage === null || storage === undefined || typeof storage.getItem !== "function") return createEditorialProfile();
  try {
    const parsed = JSON.parse(storage.getItem(EDITORIAL_STORAGE_KEY) ?? "null");
    if (parsed === null || typeof parsed !== "object") return createEditorialProfile();
    if (parsed.version === 1) return createEditorialProfile(legacyOptions(parsed.preset, parsed.customDirection));
    if (parsed.version !== EDITORIAL_SETTINGS_VERSION) return createEditorialProfile();
    return createEditorialProfile(parsed);
  } catch {
    return createEditorialProfile();
  }
}

export function saveEditorialProfile(storage, presetOrOptions = "open", customDirection = "") {
  const profile = createEditorialProfile(presetOrOptions, customDirection);
  if (storage === null || storage === undefined || typeof storage.setItem !== "function") return profile;
  try {
    storage.setItem(EDITORIAL_STORAGE_KEY, JSON.stringify({
      version: profile.version,
      preset: profile.preset,
      tribes: profile.tribes,
      customDirection: profile.customDirection,
      serendipity: profile.serendipity,
      backgroundEditor: profile.backgroundEditor,
      dailyBudgetUsd: profile.dailyBudgetUsd,
      contentNotes: profile.contentNotes,
      clickToLoadMedia: profile.clickToLoadMedia,
    }));
  } catch {
    // The selected direction still applies for this page through the dispatched event.
  }
  return profile;
}
