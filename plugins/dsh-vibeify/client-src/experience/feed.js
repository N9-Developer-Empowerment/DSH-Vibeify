export const STREAM_BATCH_SIZE = 8;
export const GENERATED_STREAM_BATCH_SIZE = 6;

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

function hashText(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Spend two locally prepared pages immediately when an explicit update starts.
 * They require no provider round trip and therefore guarantee a visual first
 * result plus a questionnaire while the bounded live lanes build deeper work.
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
  const question = QUESTIONNAIRES[hashText(`${runId}:question`) % QUESTIONNAIRES.length];
  return Object.freeze([
    Object.freeze({
      id: `${runId}-instant-question-${question.id}`,
      kind: "questionnaire",
      source: "fresh-stream",
      title: question.title,
      markdown: question.markdown,
      topicId: null,
      publishedAt,
    }),
    Object.freeze({
      id: `${runId}-instant-${episode.id}`,
      kind: "image",
      source: "fresh-stream",
      title: episode.title,
      markdown: `${episode.description}\n\n**${note}.**`,
      topicId: episode.id,
      publishedAt: publishedAt + 1,
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

const VISUAL_MODES = Object.freeze(["cinema", "poster", "duotone", "close-crop"]);
const REMOTE_IMAGE_HOSTS = Object.freeze(new Set([
  "images.unsplash.com",
  "images.pexels.com",
  "upload.wikimedia.org",
  "cdn.pixabay.com",
]));
const REMOTE_IMAGE_QUERY_KEYS = Object.freeze(new Set(["auto", "crop", "cs", "dpr", "fit", "fm", "h", "q", "w"]));
const LEAD_IMAGE_PATTERN = /!\[([^\]]{1,240})\]\((https:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/i;
const SOURCE_LINK_PATTERN = /\[([^\]]{1,120})\]\((https:\/\/[^\s)]+)\)/i;
const MARKDOWN_LINK_PATTERN = /(?<!!)\[([^\]]{1,200})\]\((https:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/gi;
const VISUAL_CREDIT_LABEL = /^(?:visual|image|photo|photograph|graphic)(?:\s+(?:source|credit))?\b|^credit\b/i;
const IMAGE_FILE_PATH = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const TRACKING_QUERY_KEY = /^(?:utm_.+|fbclid|gclid|dclid|mc_cid|mc_eid)$/i;

function allowedImageUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !REMOTE_IMAGE_HOSTS.has(url.hostname.toLowerCase()) || url.username !== "" || url.password !== "") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (!REMOTE_IMAGE_QUERY_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return null;
  }
}

/** A generated page can contribute one verified public image to the rolling catalogue. */
export function remoteVisualForMarkdown(markdown) {
  if (typeof markdown !== "string") return null;
  const image = markdown.match(LEAD_IMAGE_PATTERN);
  if (image === null) return null;
  const imageUrl = allowedImageUrl(image[2]);
  if (imageUrl === null) return null;
  const following = markdown.slice((image.index ?? 0) + image[0].length);
  const source = following.match(SOURCE_LINK_PATTERN);
  if (source === null) return null;
  let sourceUrl;
  try {
    const parsed = new URL(source[2]);
    if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") return null;
    parsed.hash = "";
    sourceUrl = parsed.href;
  } catch {
    return null;
  }
  return Object.freeze({
    imageUrl,
    sourceUrl,
    alt: image[1].replace(/\s+/g, " ").trim(),
    credit: source[1].replace(/\s+/g, " ").trim(),
  });
}

function contentUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
    if (REMOTE_IMAGE_HOSTS.has(url.hostname.toLowerCase()) || IMAGE_FILE_PATH.test(url.pathname)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_QUERY_KEY.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return null;
  }
}

function isVisualCreditPage(url) {
  const host = url.hostname.toLowerCase();
  return ((host === "unsplash.com" || host === "www.unsplash.com") && url.pathname.startsWith("/photos/"))
    || ((host === "pexels.com" || host === "www.pexels.com") && url.pathname.startsWith("/photo/"))
    || ((host === "pixabay.com" || host === "www.pixabay.com") && url.pathname.startsWith("/photos/"));
}

/**
 * Find the first reader-facing destination in the copy. Image bytes and visual
 * credit pages remain available from the figure caption, but never masquerade
 * as the article's source or next step.
 */
export function contentLinkForMarkdown(markdown) {
  if (typeof markdown !== "string") return null;
  const visual = remoteVisualForMarkdown(markdown);
  for (const match of markdown.matchAll(MARKDOWN_LINK_PATTERN)) {
    const href = contentUrl(match[2]);
    if (href === null || href === visual?.sourceUrl) continue;
    const parsed = new URL(href);
    const label = match[1].replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
    if (label.length === 0 || VISUAL_CREDIT_LABEL.test(label) || isVisualCreditPage(parsed)) continue;
    return Object.freeze({ href, label: label.slice(0, 120) });
  }
  return null;
}

export function markdownWithoutLeadVisual(markdown) {
  if (typeof markdown !== "string") return "";
  const visual = remoteVisualForMarkdown(markdown);
  let removedCredit = false;
  return markdown
    .replace(LEAD_IMAGE_PATTERN, "")
    .replace(MARKDOWN_LINK_PATTERN, (match, _label, value) => {
      if (removedCredit || visual === null) return match;
      try {
        const url = new URL(value);
        url.hash = "";
        if (url.href !== visual.sourceUrl) return match;
        removedCredit = true;
        return "";
      } catch {
        return match;
      }
    })
    .replace(/^\s+/, "");
}

/** Resolve a varied, credited visual while keeping media provenance explicit. */
export function visualMediaForChunk(catalog, chunk) {
  const episode = visualEpisodeForChunk(catalog, chunk);
  if (episode === null) return null;
  const mediaHash = hashText(`${chunk.id}:visual-media`);
  const remote = remoteVisualForMarkdown(chunk.markdown);
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
  const useGraphic = episode.graphic !== undefined && mediaHash % 2 === 0;
  if (useGraphic) {
    return Object.freeze({
      kind: episode.graphic.kind,
      artwork: episode.graphic.artwork,
      alt: episode.graphic.alt,
      focalPoint: episode.graphic.focalPoint,
      href: episode.graphic.provenanceUrl,
      label: "AI-assisted graphic · VIBE",
      mode: VISUAL_MODES[mediaHash % VISUAL_MODES.length],
      episode,
    });
  }
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

/** Stable editorial spans let CSS pack the page without fragile nth-child rules. */
export function panelLayoutForChunk(chunk, index) {
  if (index === 0 && chunk?.source !== "chat-directed") return "hero";
  if (chunk?.source === "chat-directed" || chunk?.kind === "questionnaire") return "wide";
  if (typeof chunk?.markdown === "string" && chunk.markdown.length > 900) return "wide";
  if (chunk?.kind === "image") return "compact";
  return index % 2 === 1 ? "feature" : "compact";
}
