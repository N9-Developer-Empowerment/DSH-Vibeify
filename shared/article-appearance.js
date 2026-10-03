/** Fixed presentation catalogue. No CSS, URLs or editorial settings from a reader. */
// A null note keeps the surface's default subtitle; an empty note omits it.
export const WEBSITE_LOOKS = Object.freeze({
  vibe: Object.freeze({
    label: "VIBE magazine",
    note: null,
    defaultPalette: "midnight",
    writingVoice: "Write like a playful, sharp gossip magazine: warm, witty and conversational, with human detail, lively headlines and sourced public gossip where it adds texture. Keep factual claims and allegations clearly attributed; never invent scandal, motives, quotes or private relationships.",
  }),
  "bbc-news": Object.freeze({
    label: "BBC News inspired",
    note: "",
    defaultPalette: "news",
    writingVoice: "Write as restrained British broadcast-news parody: clear, measured and economical, with neutral headlines, facts before colour, careful attribution and dry understatement used sparingly. Avoid breathless gossip language, clickbait and invented BBC branding or endorsement.",
  }),
});

export function publicationWritingVoice(look) {
  const id = Object.hasOwn(WEBSITE_LOOKS, look) ? look : "vibe";
  return Object.freeze({ id, label: WEBSITE_LOOKS[id].label, direction: WEBSITE_LOOKS[id].writingVoice });
}

export const MAGAZINE_PALETTES = Object.freeze({
  midnight: Object.freeze({ label: "Midnight", scheme: "dark", colors: Object.freeze({ background: "#080609", surface: "#19121b", ink: "#fffafc", muted: "#c7bac4", accent: "#ff9aba", border: "#58424f" }) }),
  paper: Object.freeze({ label: "Paper", scheme: "light", colors: Object.freeze({ background: "#f4efe5", surface: "#fffdf7", ink: "#29251f", muted: "#60574d", accent: "#963b37", border: "#c8bdae" }) }),
  forest: Object.freeze({ label: "Forest", scheme: "light", colors: Object.freeze({ background: "#eaf0e7", surface: "#f9fcf6", ink: "#18392c", muted: "#496355", accent: "#176648", border: "#b0c8b6" }) }),
  ocean: Object.freeze({ label: "Ocean", scheme: "dark", colors: Object.freeze({ background: "#081b2b", surface: "#102b40", ink: "#f0f9ff", muted: "#b8cfdd", accent: "#7bd8e9", border: "#3d687e" }) }),
  news: Object.freeze({ label: "Newsroom", scheme: "light", colors: Object.freeze({ background: "#ffffff", surface: "#ffffff", ink: "#161616", muted: "#545454", accent: "#b32318", border: "#d4d4d4" }) }),
});

/** This is the entire shareable appearance payload, never the local settings object. */
export function cleanArticleAppearance(value) {
  const options = value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
  const look = Object.hasOwn(WEBSITE_LOOKS, options.look) ? options.look : "vibe";
  return Object.freeze({
    look,
    palette: Object.hasOwn(MAGAZINE_PALETTES, options.palette) ? options.palette : WEBSITE_LOOKS[look].defaultPalette,
    textSize: options.textSize === "large" ? "large" : "standard",
    spacing: options.spacing === "roomy" ? "roomy" : "standard",
  });
}

/** Generate tokens for either surface from the same palette catalogue. */
export function appearancePaletteStyles(scope) {
  return Object.entries(MAGAZINE_PALETTES).map(([id, { colors, scheme }]) =>
    `${scope}[data-palette="${id}"]{--page:${colors.background};--surface:${colors.surface};--ink:${colors.ink};--muted:${colors.muted};--accent:${colors.accent};--edge:${colors.border};--wash:color-mix(in srgb,var(--ink) 5%,transparent);color-scheme:${scheme};}`
  ).join("\n");
}

export function articleAppearanceRuntimeSource() {
  return `const WEBSITE_LOOKS = ${JSON.stringify(WEBSITE_LOOKS)};\nconst MAGAZINE_PALETTES = ${JSON.stringify(MAGAZINE_PALETTES)};\n${cleanArticleAppearance.toString()}`;
}
