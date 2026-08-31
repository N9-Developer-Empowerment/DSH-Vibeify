import { questionnaireParts } from "./questionnaire.js";

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
  return Object.freeze(questionnaireParts(markdown).options.slice(0, 6));
}

export function questionnaireIntroduction(markdown) {
  return markdownWithoutLeadVisual(questionnaireParts(markdown).introduction).trim();
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
const REMOTE_IMAGE_HOSTS = Object.freeze(new Set([
  "images.unsplash.com",
  "images.pexels.com",
  "cdn.pixabay.com",
]));
const REUSABLE_IMAGE_FAMILIES = Object.freeze([
  Object.freeze({ image: /^(?:upload\.)?wikimedia\.org$/, source: /^(?:commons\.)?wikimedia\.org$/, licence: /\b(?:CC0|CC BY(?:-SA)?(?: \d(?:\.\d)?)?|public domain)\b/i }),
  Object.freeze({ image: /^live\.staticflickr\.com$/, source: /^(?:www\.)?flickr\.com$/, licence: /\b(?:CC0|CC BY(?:-SA)?(?!-)(?: \d(?:\.\d)?)?|no known copyright restrictions|public domain)\b/i }),
  Object.freeze({ image: /^images-assets\.nasa\.gov$/, source: /^images\.nasa\.gov$/, licence: /\b(?:NASA|public domain)\b/i }),
  Object.freeze({ image: /^tile\.loc\.gov$/, source: /^(?:www\.)?loc\.gov$/, licence: /\b(?:no known copyright restrictions|public domain)\b/i }),
  Object.freeze({ image: /^ids\.si\.edu$/, source: /^(?:www\.)?si\.edu$/, licence: /\b(?:CC0|CC BY(?:-SA)?|public domain)\b/i }),
]);
const REMOTE_IMAGE_QUERY_KEYS = Object.freeze(new Set(["auto", "crop", "cs", "dpr", "fit", "fm", "h", "q", "w"]));
const IMAGE_PATTERN = /!\[([^\]]{1,240})\]\((https:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/gi;
const SOURCE_LINK_PATTERN = /\[([^\]]{1,120})\]\((https:\/\/[^\s)]+)\)/i;
const MARKDOWN_LINK_PATTERN = /(?<!!)\[([^\]]{1,200})\]\((https:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/gi;
const VISUAL_CREDIT_LABEL = /^(?:visual|image|photo|photograph|graphic)(?:\s+(?:source|credit))?\b|^credit\b/i;
const IMAGE_FILE_PATH = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const TRACKING_QUERY_KEY = /^(?:utm_.+|fbclid|gclid|dclid|mc_cid|mc_eid)$/i;

function reusableImageFamily(imageHost, sourceHost, credit = "") {
  return REUSABLE_IMAGE_FAMILIES.some((family) => family.image.test(imageHost)
    && family.source.test(sourceHost)
    && family.licence.test(credit));
}

function allowedImageUrl(value, sourceValue = null, credit = "") {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
    const host = url.hostname.toLowerCase();
    const reviewedHost = REMOTE_IMAGE_HOSTS.has(host);
    let firstParty = false;
    let reusableFamily = false;
    if (typeof sourceValue === "string") {
      const source = new URL(sourceValue);
      firstParty = source.protocol === "https:"
        && source.username === ""
        && source.password === ""
        && source.hostname.toLowerCase() === host
        && !IMAGE_FILE_PATH.test(source.pathname);
      reusableFamily = source.protocol === "https:"
        && source.username === ""
        && source.password === ""
        && reusableImageFamily(host, source.hostname.toLowerCase(), credit);
    }
    if (!reviewedHost && !reusableFamily && (!firstParty || !IMAGE_FILE_PATH.test(url.pathname))) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (!REMOTE_IMAGE_QUERY_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return null;
  }
}

function visualSource(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") return null;
    parsed.hash = "";
    return parsed.href;
  } catch {
    return null;
  }
}

/** A generated page can contribute several verified public images to the rolling catalogue. */
export function remoteVisualsForMarkdown(markdown) {
  if (typeof markdown !== "string") return null;
  const images = [...markdown.matchAll(IMAGE_PATTERN)];
  const visuals = [];
  const seen = new Set();
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const start = (image.index ?? 0) + image[0].length;
    const end = images[index + 1]?.index ?? markdown.length;
    const source = markdown.slice(start, end).match(SOURCE_LINK_PATTERN);
    const sourceUrl = source === null ? null : visualSource(source[2]);
    if (source === null || sourceUrl === null) continue;
    const credit = source[1].replace(/\s+/g, " ").trim();
    const imageUrl = allowedImageUrl(image[2], sourceUrl, credit);
    if (imageUrl === null || seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    visuals.push(Object.freeze({
      imageUrl,
      sourceUrl,
      alt: image[1].replace(/\s+/g, " ").trim(),
      credit,
    }));
  }
  return Object.freeze(visuals);
}

export function remoteVisualForMarkdown(markdown) {
  return remoteVisualsForMarkdown(markdown)?.[0] ?? null;
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
  const visuals = remoteVisualsForMarkdown(markdown) ?? [];
  const creditUrls = new Set(visuals.map(({ sourceUrl }) => sourceUrl));
  return markdown
    .replace(IMAGE_PATTERN, "")
    .replace(MARKDOWN_LINK_PATTERN, (match, _label, value) => {
      const sourceUrl = visualSource(value);
      return sourceUrl !== null && creditUrls.has(sourceUrl) ? "" : match;
    })
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+/, "");
}

function escapeXml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function coverLines(value, width, limit) {
  const words = String(value ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line === "" ? word : `${line} ${word}`;
    if (candidate.length <= width || line === "") {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length >= limit) break;
    }
  }
  if (line !== "" && lines.length < limit) lines.push(line);
  if (words.length > 0 && lines.join(" ").length < words.join(" ").length) lines[lines.length - 1] = `${lines.at(-1).replace(/[.…]+$/, "")}…`;
  return lines;
}

/** A relevant unique cover is safer than assigning an unrelated catalogue photograph. */
export function storyCoverForChunk(chunk) {
  const title = String(chunk?.title ?? "A new Vibe").replace(/\s+/g, " ").trim().slice(0, 180);
  const excerpt = String(chunk?.markdown ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>|`\\{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  const seed = hashText(`${title}:${excerpt}`);
  const hue = seed % 360;
  const accent = (hue + 142) % 360;
  const titleLines = coverLines(title, 27, 4);
  const excerptLines = coverLines(excerpt, 68, 2);
  const titleMarkup = titleLines.map((line, index) => `<tspan x="72" y="${176 + index * 78}">${escapeXml(line)}</tspan>`).join("");
  const excerptMarkup = excerptLines.map((line, index) => `<tspan x="74" y="${515 + index * 36}">${escapeXml(line)}</tspan>`).join("");
  const circles = Array.from({ length: 5 }, (_value, index) => `<circle cx="${1040 - index * 43}" cy="${80 + index * 92}" r="${105 + index * 24}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(title)}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 42% 13%)"/><stop offset="1" stop-color="hsl(${(hue + 54) % 360} 48% 22%)"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><g fill="none" stroke="hsl(${accent} 82% 76%)" stroke-width="3" opacity=".22">${circles}</g><text x="72" y="74" fill="hsl(${accent} 88% 78%)" font-family="Arial,sans-serif" font-size="25" font-weight="800" letter-spacing="5">VIBE · ONE ARTICLE</text><text fill="#fffafc" font-family="Georgia,serif" font-size="68" font-weight="500">${titleMarkup}</text><text fill="#d7cbd2" font-family="Arial,sans-serif" font-size="27">${excerptMarkup}</text></svg>`;
  return Object.freeze({
    kind: "typography",
    externalUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    alt: `Unique editorial cover for ${title}`,
    focalPoint: "center",
    href: "https://dsh-vibeify.ezzye.chatgpt.site/",
    label: "Editorial typography · unique to this story",
    mode: "cinema",
  });
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
  const needsStorySpecificVisual = chunk?.kind !== "questionnaire"
    && chunk?.topicId == null
    && chunk?.source !== "bundle"
    && chunk?.source !== "welcome";
  if (needsStorySpecificVisual) return Object.freeze({ ...storyCoverForChunk(chunk), episode });
  const useGraphic = chunk?.kind === "image"
    && episode.graphic !== undefined
    && (chunk?.source === "welcome" || (chunk?.source === "bundle" && mediaHash % 5 === 0));
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
