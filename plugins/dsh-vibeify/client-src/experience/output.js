const TONES = Object.freeze({
  connection: Object.freeze({ label: "Connection edit", accent: "#a991ff", words: ["relationship", "conversation", "boundary", "feeling", "say", "friend", "partner"] }),
  glow: Object.freeze({ label: "Glow edit", accent: "#ffad69", words: ["makeup", "make-up", "beauty", "skin", "skincare", "outfit", "style", "look", "shop", "shopping", "wear"] }),
  studio: Object.freeze({ label: "Studio edit", accent: "#5de1d3", words: ["code", "test", "build", "function", "file", "deploy", "refactor", "implementation"] }),
  escape: Object.freeze({ label: "Story edit", accent: "#ff6d9e", words: ["story", "world", "scene", "midnight", "dream", "escape", "character", "journey"] }),
});

export function inferOutputTone(value) {
  const text = typeof value === "string" ? value.toLowerCase() : "";
  const tokens = text.match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? [];
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  let selected = "escape";
  let selectedScore = 0;
  for (const [tone, definition] of Object.entries(TONES)) {
    const score = definition.words.reduce((total, word) => total + (counts.get(word) ?? 0), 0);
    if (score > selectedScore) {
      selected = tone;
      selectedScore = score;
    }
  }
  return selected;
}

function signature(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function createOutputPresentation(value) {
  const text = typeof value === "string" ? value.trim() : "";
  const tone = inferOutputTone(text);
  return Object.freeze({
    id: `vibe-output-${signature(text)}`,
    tone,
    label: TONES[tone].label,
    accent: TONES[tone].accent,
  });
}
