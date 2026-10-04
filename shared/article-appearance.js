/** Fixed presentation catalogue. No CSS, URLs or editorial settings from a reader. */
const VIBE_GOSSIP_VOICE = "Keep VIBE's playful, sharp gossip magazine publication voice: warm, witty and conversational, with human detail, lively headlines and sourced public gossip where it adds texture. Keep factual claims and allegations clearly attributed; never invent scandal, motives, quotes or private relationships.";

// A null note keeps the surface's default subtitle; an empty note omits it.
export const WEBSITE_LOOKS = Object.freeze({
  vibe: Object.freeze({
    label: "VIBE magazine",
    note: null,
    defaultPalette: "midnight",
    writingVoice: VIBE_GOSSIP_VOICE,
  }),
  "bbc-news": Object.freeze({
    label: "BBC News inspired",
    note: "",
    defaultPalette: "news",
    writingVoice: "Write as restrained British broadcast-news parody: clear, measured and economical, with neutral headlines, facts before colour, careful attribution and dry understatement used sparingly. Avoid breathless gossip language, clickbait and invented BBC branding or endorsement.",
  }),
});

export const VIBE_MOODS = Object.freeze({
  "lilac-pop": Object.freeze({ label: "Lilac Pop", defaultPalette: "lilac-pop", direction: "Add bright feminine pop confidence and anime-editorial energy: playful scene-setting, expressive but precise language, fashion and visual-culture awareness, and a polished sense of fun. Avoid infantilising readers, flattening Japanese culture into decoration, or imitating a named artist or publication." }),
  "cherry-soda": Object.freeze({ label: "Cherry Soda", defaultPalette: "cherry-soda", direction: "Use nostalgic 1990s and 2000s lifestyle-magazine rhythm: fizzy hooks, tactile cultural detail, confident service copy and affectionate hindsight. Date references accurately, distinguish memory from evidence, and avoid pretending every reader shared the same youth or culture." }),
  "matcha-break": Object.freeze({ label: "Matcha Break", defaultPalette: "matcha-break", direction: "Sound Gen Z-aware, sustainable, healthy and calm: direct, lightly playful, practical and low-pressure, with breathing room and credible choices people can actually use. Avoid wellness certainty, purity culture, diagnosis, greenwashing and forced slang." }),
  "after-dark": Object.freeze({ label: "After Dark", defaultPalette: "after-dark", direction: "Write for adults with flirtatious late-night confidence across romance, nightlife, style and subcultures. Be inclusive of queer, pansexual and furry communities where relevant, centre consent and self-definition, never infer a reader's identity, and keep the copy suggestive rather than sexually explicit." }),
});

export function publicationWritingVoice(look, mood = "lilac-pop") {
  const lookId = Object.hasOwn(WEBSITE_LOOKS, look) ? look : "vibe";
  const moodId = Object.hasOwn(VIBE_MOODS, mood) ? mood : "lilac-pop";
  return Object.freeze({
    id: `${lookId}:${moodId}`,
    label: `${WEBSITE_LOOKS[lookId].label} · ${VIBE_MOODS[moodId].label}`,
    direction: `${WEBSITE_LOOKS[lookId].writingVoice} ${VIBE_MOODS[moodId].direction} The reader's saved editorial lenses and editor note still govern the subject, angle and emphasis; combine the website publication voice and mood coherently without overriding that direction.`,
  });
}

export const MAGAZINE_PALETTES = Object.freeze({
  midnight: Object.freeze({ label: "Midnight", scheme: "dark", colors: Object.freeze({ background: "#080609", surface: "#19121b", ink: "#fffafc", muted: "#c7bac4", accent: "#ff9aba", border: "#58424f" }) }),
  paper: Object.freeze({ label: "Paper", scheme: "light", colors: Object.freeze({ background: "#f4efe5", surface: "#fffdf7", ink: "#29251f", muted: "#60574d", accent: "#963b37", border: "#c8bdae" }) }),
  forest: Object.freeze({ label: "Forest", scheme: "light", colors: Object.freeze({ background: "#eaf0e7", surface: "#f9fcf6", ink: "#18392c", muted: "#496355", accent: "#176648", border: "#b0c8b6" }) }),
  ocean: Object.freeze({ label: "Ocean", scheme: "dark", colors: Object.freeze({ background: "#081b2b", surface: "#102b40", ink: "#f0f9ff", muted: "#b8cfdd", accent: "#7bd8e9", border: "#3d687e" }) }),
  news: Object.freeze({ label: "Newsroom", scheme: "light", colors: Object.freeze({ background: "#ffffff", surface: "#ffffff", ink: "#161616", muted: "#545454", accent: "#b32318", border: "#d4d4d4" }) }),
  "lilac-pop": Object.freeze({ label: "Lilac Pop", scheme: "light", colors: Object.freeze({ background: "#f7efff", surface: "#fff9ff", ink: "#372044", muted: "#765f82", accent: "#b14fd4", border: "#d9bde8" }) }),
  "cherry-soda": Object.freeze({ label: "Cherry Soda", scheme: "light", colors: Object.freeze({ background: "#fff2ed", surface: "#fffaf5", ink: "#401d24", muted: "#805d62", accent: "#d42f45", border: "#e7b7ae" }) }),
  "matcha-break": Object.freeze({ label: "Matcha Break", scheme: "light", colors: Object.freeze({ background: "#eef3dc", surface: "#fbf9ea", ink: "#263322", muted: "#66705a", accent: "#6f873f", border: "#c8d0aa" }) }),
  "after-dark": Object.freeze({ label: "After Dark", scheme: "dark", colors: Object.freeze({ background: "#100914", surface: "#211225", ink: "#fff5f5", muted: "#cbb3c9", accent: "#ff5d8f", border: "#62405f" }) }),
});

/** This is the entire shareable appearance payload, never the local settings object. */
export function cleanArticleAppearance(value) {
  const options = value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
  const look = Object.hasOwn(WEBSITE_LOOKS, options.look) ? options.look : "vibe";
  const mood = Object.hasOwn(VIBE_MOODS, options.mood) ? options.mood : "lilac-pop";
  return Object.freeze({
    look,
    mood,
    palette: Object.hasOwn(MAGAZINE_PALETTES, options.palette) ? options.palette : VIBE_MOODS[mood].defaultPalette,
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
  return `const WEBSITE_LOOKS = ${JSON.stringify(WEBSITE_LOOKS)};\nconst VIBE_MOODS = ${JSON.stringify(VIBE_MOODS)};\nconst MAGAZINE_PALETTES = ${JSON.stringify(MAGAZINE_PALETTES)};\n${cleanArticleAppearance.toString()}`;
}
