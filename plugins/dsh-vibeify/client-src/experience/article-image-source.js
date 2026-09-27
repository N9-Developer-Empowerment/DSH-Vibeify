import { REUSABLE_IMAGE_FAMILIES } from "../../../../shared/image-policy.js";
const REMOTE_IMAGE_HOSTS = Object.freeze(new Set([
  "images.unsplash.com",
  "images.pexels.com",
  "cdn.pixabay.com",
]));
const REMOTE_IMAGE_QUERY_KEYS = Object.freeze(new Set(["auto", "crop", "cs", "dpr", "fit", "fm", "h", "q", "w"]));
const IMAGE_PATTERN = /!\[([^\]]{1,240})\]\((https:\/\/(?:[^\s()]|\([^()\s]*\))+)(?:\s+"[^"]*")?\)/gi;
const MARKDOWN_LINK_PATTERN = /(?<!!)\[([^\]]{1,200})\]\((https:\/\/(?:[^\s()]|\([^()\s]*\))+)(?:\s+"[^"]*")?\)/gi;
const VISUAL_CREDIT_LABEL = /^(?:(?:video still|visual|image|photo|photograph|graphic)(?:\s+(?:source|credit))?|artwork(?:\s+and\s+source)?|credit)\b/i;
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

function visualCaption(line, allowDescriptive = false) {
  const text = String(line ?? "").trim().replace(/^[-*]\s+/, "").replace(/^[*_]+|[*_]+$/g, "");
  if (text.length > 1200) return null;
  const links = [...text.matchAll(MARKDOWN_LINK_PATTERN)];
  if (links.length !== 1) return null;
  const link = links[0];
  const before = text.slice(0, link.index).replace(/[*_]/g, "").trim();
  const after = text.slice(link.index + link[0].length).replace(/[*.\s]+$/g, "").trim();
  const prefix = /^(video still|photo(?:graph)?|image|visual|artwork|graphic|credit)(?:\s+(?:source|credit))?\s*[:·—-]\s*/i.exec(before);
  const labelledLink = before === "" && VISUAL_CREDIT_LABEL.test(link[1]);
  const explicitCredit = prefix !== null || labelledLink;
  if (after.length > 100 || /https?:\/\//i.test(before + after)) return null;
  if (!explicitCredit && (!allowDescriptive || before !== "" || after !== "")) return null;
  const credit = [prefix?.[1], prefix ? before.slice(prefix[0].length) : before, link[1], after.replace(/^[,;·—–\s]+/, "")]
    .filter(Boolean).join(" · ").replace(/\s+/g, " ").trim();
  return { sourceUrl: visualSource(link[2]), credit, explicitCredit };
}

function captionAfterImage(markdown, images, index) {
  const image = images[index];
  const start = (image.index ?? 0) + image[0].length;
  const end = images[index + 1]?.index ?? markdown.length;
  const line = markdown.slice(start, end).split(/\r?\n/).find((value) => value.trim().length > 0);
  const caption = visualCaption(line, true);
  if (caption === null || caption.sourceUrl === null || caption.explicitCredit) return caption;
  const imageUrl = visualSource(image[2]);
  if (imageUrl === null) return null;
  const imagePage = new URL(imageUrl);
  const sourcePage = new URL(caption.sourceUrl);
  return imagePage.hostname.toLowerCase() === sourcePage.hostname.toLowerCase()
    && IMAGE_FILE_PATH.test(imagePage.pathname)
    && !IMAGE_FILE_PATH.test(sourcePage.pathname) ? caption : null;
}

/** One interpretation of article image markup, attribution, and exact Commons sources. */
export function parseArticleImages(markdown) {
  if (typeof markdown !== "string") return { visuals: [], sourceUrls: [], body: "", firstImageAlt: null };
  const images = [...markdown.matchAll(IMAGE_PATTERN)];
  const visuals = [];
  const seen = new Set();
  const sources = new Set();
  const attachedCredits = new Set();
  const addCommons = (sourceUrl) => {
    if (!sourceUrl || sources.size >= 4) return;
    const source = new URL(sourceUrl);
    if (source.hostname === "commons.wikimedia.org" && source.pathname.startsWith("/wiki/File:")) {
      source.search = ""; source.hash = ""; sources.add(source.href);
    }
  };
  for (let index = 0; index < images.length; index++) {
    const image = images[index];
    const caption = captionAfterImage(markdown, images, index);
    if (!caption?.sourceUrl) continue;
    attachedCredits.add(caption.sourceUrl);
    addCommons(caption.sourceUrl);
    const imageUrl = allowedImageUrl(image[2], caption.sourceUrl, caption.credit);
    if (!imageUrl || seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    visuals.push(Object.freeze({ imageUrl, sourceUrl: caption.sourceUrl, alt: image[1].replace(/\s+/g, " ").trim(), credit: caption.credit }));
  }
  for (const line of markdown.split(/\r?\n/)) {
    const caption = visualCaption(line);
    if (caption?.explicitCredit) addCommons(caption.sourceUrl);
  }
  const body = markdown.replace(IMAGE_PATTERN, "").split(/\r?\n/)
    .filter((line) => !attachedCredits.has(visualCaption(line, true)?.sourceUrl))
    .join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\s+/, "");
  return Object.freeze({ visuals: Object.freeze(visuals), sourceUrls: Object.freeze([...sources]), body, firstImageAlt: images[0]?.[1] ?? null });
}

// Compatibility adapters all use the same parser; do not add caption rules here.
export const commonsSourceUrlsForMarkdown = (markdown) => parseArticleImages(markdown).sourceUrls;
export const remoteVisualsForMarkdown = (markdown) => typeof markdown === "string" ? parseArticleImages(markdown).visuals : null;
export const remoteVisualForMarkdown = (markdown) => parseArticleImages(markdown).visuals[0] ?? null;
export const markdownWithoutLeadVisual = (markdown) => parseArticleImages(markdown).body;

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
    || ((host === "pixabay.com" || host === "www.pixabay.com") && url.pathname.startsWith("/photos/"))
    || (host === "commons.wikimedia.org" && url.pathname.startsWith("/wiki/File:"));
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


/** Compare File identities independently of URL escaping, underscores and fragments. */
export function commonsImageIdentity(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "commons.wikimedia.org" || url.username || url.password) return null;
    const path = decodeURIComponent(url.pathname).replace(/_/g, " ");
    return path.startsWith("/wiki/File:") ? path.slice(6) : null;
  } catch { return null; }
}
