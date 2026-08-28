export const STREAM_HIGH_WATER = 64;
export const STREAM_LOW_WATER = 14;
export const STREAM_BATCH_SIZE = 8;
export const MAX_AUTO_RUNS_PER_VISIT = 6;

const QUESTIONNAIRES = Object.freeze([
  Object.freeze({
    id: "direction",
    title: "Where should this edition wander next?",
    markdown: "Pick the thread that sounds good right now. The stream keeps moving whether you answer or not.\n\n- Something to watch\n- A practical idea to try\n- Music and visual culture\n- Surprise me completely",
  }),
  Object.freeze({
    id: "depth",
    title: "What earns your attention today?",
    markdown: "This shapes later pages, not the material already in front of you.\n\n- A quick useful hit\n- A properly deep read\n- More images and video\n- More people and original creators",
  }),
  Object.freeze({
    id: "energy",
    title: "Choose the pace, if you feel like it",
    markdown: "There is no form to finish. One tap is enough.\n\n- Calm and unhurried\n- Bright and surprising\n- Practical and direct\n- Keep the mix unpredictable",
  }),
]);

const ANGLES = Object.freeze([
  Object.freeze({
    kind: "editorial",
    title: "The editor's opening thought",
    copy: (episode) => `${episode.description}\n\nThis is an opening hunch rather than a claim to know you: **${episode.editorialNote}**. Keep scrolling; later pages can take this thought somewhere deeper without erasing the beginning.`,
  }),
  Object.freeze({
    kind: "recommendation",
    title: "A useful route in",
    copy: (episode) => `Start with the part that feels easiest to enter. A strong route through this subject includes ${episode.resultFeatures.map((feature) => feature.toLowerCase()).join(", ")}. The useful idea is simple: **choose by mood and attention, not by the size of the internet**.`,
  }),
  Object.freeze({
    kind: "article",
    title: "Why this made the opening edit",
    copy: (episode) => `${episode.editorialNote}. The deeper edition is designed to keep the humans behind the work visible: ${episode.creatorLine.toLowerCase()}.\n\n> The stream can become more specific as you read and respond; it does not need a profile before it gives you something worth considering.`,
  }),
  Object.freeze({
    kind: "image",
    title: "A visual pause",
    copy: (episode) => `${episode.photo.alt}.\n\nThe photograph is credited to [${episode.photo.photographer}](${episode.photo.sourceUrl}); VIBE's contribution is the editorial framing and graphic treatment, not the photograph itself.`,
  }),
]);

function isoDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError("edition key must be an ISO calendar date");
  return value;
}

/** A substantial synchronous first-visit well. It is editorial copy, not a freshness claim. */
export function createBundledStream(catalog, editionKey, count = 36) {
  if (catalog === null || typeof catalog !== "object" || !Array.isArray(catalog.episodes) || catalog.episodes.length < 3) {
    throw new TypeError("stream requires a validated editorial catalogue");
  }
  if (!Number.isInteger(count) || count < 12 || count > 96) throw new TypeError("bundled stream count must be between 12 and 96");
  const day = isoDay(editionKey);
  const chunks = [];
  for (let index = 0; index < count; index += 1) {
    const position = index % 9;
    if (position === 3 || position === 7) {
      const question = QUESTIONNAIRES[(Math.floor(index / 4) + day.charCodeAt(day.length - 1)) % QUESTIONNAIRES.length];
      chunks.push(Object.freeze({
        id: `bundle-${day}-question-${index}-${question.id}`,
        kind: "questionnaire",
        source: "bundle",
        title: question.title,
        markdown: question.markdown,
        topicId: null,
      }));
      continue;
    }
    const episode = catalog.episodes[(index * 5 + day.charCodeAt(day.length - 2)) % catalog.episodes.length];
    const angle = ANGLES[(index + Math.floor(index / catalog.episodes.length)) % ANGLES.length];
    chunks.push(Object.freeze({
      id: `bundle-${day}-${index}-${episode.id}`,
      kind: index === 0 ? "image" : angle.kind,
      source: "bundle",
      title: index === 0 ? episode.title : `${angle.title} · ${episode.title}`,
      markdown: index === 0
        ? `${episode.description}\n\n**${episode.editorialNote}.** This edition begins instantly and keeps unfolding beneath it.`
        : angle.copy(episode),
      topicId: episode.id,
    }));
  }
  return Object.freeze(chunks);
}

export function questionnaireOptions(markdown) {
  if (typeof markdown !== "string") return Object.freeze([]);
  return Object.freeze(markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^[-*]\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean)
    .slice(0, 6));
}

export function questionnaireIntroduction(markdown) {
  if (typeof markdown !== "string") return "";
  return markdown.split(/\r?\n/).filter((line) => !/^[-*]\s+/.test(line)).join(" ").trim();
}

/** Stored chunks stay append-only; presentation reverses arrival order so the latest item is first. */
export function newestFirst(chunks) {
  return Object.freeze(Array.isArray(chunks) ? [...chunks].reverse() : []);
}

/**
 * Give every stream tile a stable local visual without a network or model call.
 * A source-linked topic keeps its own photograph; free-form and questionnaire
 * chunks receive a deterministic catalogue fallback derived from their id.
 */
export function visualEpisodeForChunk(catalog, chunk) {
  if (!Array.isArray(catalog?.episodes) || catalog.episodes.length === 0 || typeof chunk?.id !== "string") return null;
  const exact = typeof chunk.topicId === "string" ? catalog.byId?.[chunk.topicId] : null;
  if (exact !== null && exact !== undefined) return exact;
  let hash = 2166136261;
  for (const character of chunk.id) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return catalog.episodes[(hash >>> 0) % catalog.episodes.length];
}

/** Start once per visit, then refill when the amount ahead falls below the low-water mark. */
export function shouldStartStreamRun({ totalChunks, consumedChunks, active, runsStarted }) {
  if (![totalChunks, consumedChunks, runsStarted].every(Number.isInteger)) return false;
  if (totalChunks < 0 || consumedChunks < 0 || runsStarted < 0 || active || runsStarted >= MAX_AUTO_RUNS_PER_VISIT) return false;
  if (runsStarted === 0) return true;
  const remaining = Math.max(0, totalChunks - consumedChunks);
  return totalChunks < STREAM_HIGH_WATER || remaining < STREAM_LOW_WATER;
}
