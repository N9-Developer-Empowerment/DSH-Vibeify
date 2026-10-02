import { remoteVisualForMarkdown, markdownWithoutLeadVisual } from "./article-image-source.js";
export { commonsSourceUrlsForMarkdown, remoteVisualForMarkdown, remoteVisualsForMarkdown, markdownWithoutLeadVisual, contentLinkForMarkdown } from "./article-image-source.js";
import { illustrationForChunk } from "../../../../shared/editorial-illustrations.js";

export const STREAM_BATCH_SIZE = 8;
export const GENERATED_STREAM_BATCH_SIZE = 6;

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

function hashText(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Spend one locally prepared page immediately when an explicit update starts.
 * They require no provider round trip and therefore guarantee a visual first
 * result while the bounded live lanes build deeper work.
 */
export function createInstantUpdateChunks(catalog, runId, recentTitles = [], publishedAt = Date.now()) {
  if (!Array.isArray(catalog?.episodes) || catalog.episodes.length === 0) throw new TypeError("instant update requires an editorial catalogue");
  if (typeof runId !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(runId)) throw new TypeError("instant update run id is invalid");
  if (!Number.isFinite(publishedAt) || publishedAt <= 0) throw new TypeError("instant update publication time is invalid");
  const recent = new Set((Array.isArray(recentTitles) ? recentTitles : []).map((title) => String(title).trim().toLowerCase()));
  const available = catalog.episodes.filter(({ title }) => !recent.has(title.toLowerCase()));
  const candidates = available.length > 0 ? available : catalog.episodes;
  const episode = candidates[hashText(runId) % candidates.length];
  const note = episode.editorialNotes[hashText(`${runId}:note`) % episode.editorialNotes.length];
  return Object.freeze([
    Object.freeze({
      id: `${runId}-instant-${episode.id}`,
      kind: "image",
      source: "fresh-stream",
      title: episode.title,
      markdown: `${episode.description}\n\n**${note}.**`,
      topicId: episode.id,
      publishedAt,
    }),
  ]);
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

/** Stored chunks stay append-only; presentation reverses arrival order so the latest item is first. */
export function newestFirst(chunks) {
  return Object.freeze(Array.isArray(chunks) ? [...chunks].reverse() : []);
}

/**
 * Give every stream tile a stable local visual without a network or model call.
 * A source-linked topic keeps its own photograph; free-form pages use a unique
 * story-specific editorial cover rather than borrowing an unrelated stock image.
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

const VISUAL_MODES = Object.freeze(["cinema", "poster", "duotone", "close-crop"]);
/** A credited local drawing keeps every story pictorial, even offline. */
export function storyCoverForChunk(chunk) {
  return illustrationForChunk(chunk);
}

/** Resolve a varied, credited visual while keeping media provenance explicit. */
export function visualMediaForChunk(catalog, chunk, { includeLinked = true } = {}) {
  const episode = visualEpisodeForChunk(catalog, chunk);
  if (episode === null) return null;
  const mediaHash = hashText(`${chunk.id}:visual-media`);
  const remote = includeLinked ? remoteVisualForMarkdown(chunk.markdown) : null;
  if (remote !== null) {
    return Object.freeze({
      kind: "fresh-image",
      externalUrl: remote.imageUrl,
      fallbackArtwork: episode.artwork,
      alt: remote.alt,
      focalPoint: "center",
      href: remote.sourceUrl,
      label: remote.credit,
      mode: VISUAL_MODES[mediaHash % VISUAL_MODES.length],
      episode,
    });
  }
  const needsStorySpecificVisual = chunk?.topicId == null
    && chunk?.source !== "bundle"
    && chunk?.source !== "welcome";
  if (needsStorySpecificVisual) return Object.freeze({ ...storyCoverForChunk(chunk), episode });
  const useGraphic = chunk?.kind === "image"
    && episode.graphic !== undefined
    && (chunk?.source === "welcome" || (chunk?.source === "bundle" && mediaHash % 5 === 0));
  if (useGraphic) return Object.freeze({ ...storyCoverForChunk(chunk), episode });
  return Object.freeze({
    kind: episode.photo.kind,
    artwork: episode.artwork,
    alt: episode.photo.alt,
    focalPoint: episode.photo.focalPoint,
    href: episode.photo.sourceUrl,
    label: `Photograph · ${episode.photo.photographer}`,
    mode: VISUAL_MODES[mediaHash % VISUAL_MODES.length],
    episode,
  });
}

/** Keep an editorial rhythm regardless of article length or where it arrived. */
export function panelLayoutForChunk(chunk, index) {
  if (index === 0) return "hero";
  return ["feature", "compact", "standard", "standard", "compact", "feature"][(Math.max(1, index) - 1) % 6];
}

/** Initial display only; remote pictures are selected by resolveArticleImage. */
export const fallbackMediaForChunk = (catalog, chunk) => visualMediaForChunk(catalog, chunk, { includeLinked: false });
