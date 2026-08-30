export const SHARE_ORIGIN = "https://share.codingforjustice.org.uk";
export const SHARE_SNAPSHOT_VERSION = 1;
export const SHARE_MESSAGE_READY = "vibe-share:ready";
export const SHARE_MESSAGE_SNAPSHOT = "vibe-share:snapshot";

const MAX_TITLE = 180;
const MAX_MARKDOWN = 16_000;
const MAX_LABEL = 160;
const MAX_ALT = 240;
const ARTICLE_KINDS = new Set(["article", "editorial", "recommendation", "image", "music", "video"]);
const VISUAL_KINDS = new Set(["photograph", "editorial-image", "ai-generated", "ai-graphic", "typography"]);
const TRACKING_QUERY_KEY = /^(?:utm_.+|fbclid|gclid|dclid|mc_cid|mc_eid)$/i;

function cleanText(value, limit, multiline = false) {
  if (typeof value !== "string") return null;
  const control = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g;
  const cleaned = value
    .replace(control, multiline ? "" : " ")
    .replace(multiline ? /[ \t]+\n/g : /\s+/g, multiline ? "\n" : " ")
    .trim();
  return cleaned.length === 0 ? null : cleaned.slice(0, limit);
}

function cleanHttps(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_QUERY_KEY.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return null;
  }
}

function cleanVisual(candidate) {
  if (candidate === null || typeof candidate !== "object") return null;
  const imageUrl = cleanHttps(candidate.imageUrl);
  const sourceUrl = cleanHttps(candidate.sourceUrl);
  const alt = cleanText(candidate.alt, MAX_ALT);
  const credit = cleanText(candidate.credit, MAX_LABEL);
  if (imageUrl === null || sourceUrl === null || alt === null || credit === null) return null;
  const declaredKind = VISUAL_KINDS.has(candidate.kind) ? candidate.kind : null;
  const inferredKind = /\bphotograph|\bphoto\b/i.test(credit)
    ? "photograph"
    : /\bgenerated image|\bai-generated|\bphotorealistic/i.test(credit)
      ? "ai-generated"
      : /\btypograph|\bcalligraph/i.test(credit)
        ? "typography"
        : /\bai-assisted graphic|\bai graphic/i.test(credit)
          ? "ai-graphic"
          : "editorial-image";
  return Object.freeze({ imageUrl, sourceUrl, alt, credit, kind: declaredKind ?? inferredKind });
}

function cleanContentLink(candidate) {
  if (candidate === null || typeof candidate !== "object") return null;
  const href = cleanHttps(candidate.href);
  const label = cleanText(candidate.label, MAX_LABEL);
  if (href === null || label === null) return null;
  return Object.freeze({ href, label });
}

function cleanShareMedia(candidate) {
  if (candidate === null || typeof candidate !== "object") return null;
  const cleanedHref = cleanHttps(candidate.href);
  const label = cleanText(candidate.label, MAX_LABEL);
  if (cleanedHref === null || label === null) return null;
  const url = new URL(cleanedHref);
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtube.com" || host === "youtu.be") {
    const id = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v");
    if (!/^[a-zA-Z0-9_-]{6,16}$/.test(id ?? "")) return null;
    return Object.freeze({ provider: "youtube", kind: "video", label, href: `https://www.youtube.com/watch?v=${id}` });
  }
  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    if (!/^\d{4,14}$/.test(id ?? "")) return null;
    return Object.freeze({ provider: "vimeo", kind: "video", label, href: `https://vimeo.com/${id}` });
  }
  if (host === "open.spotify.com") {
    const match = /^\/(track|album|episode|show|playlist)\/([a-zA-Z0-9]+)\/?$/.exec(url.pathname);
    if (match === null) return null;
    return Object.freeze({ provider: "spotify", kind: "music", label, href: `https://open.spotify.com/${match[1]}/${match[2]}` });
  }
  if (host === "soundcloud.com") {
    const path = url.pathname.split("/").filter(Boolean);
    if (path.length < 2 || path.some((part) => !/^[a-zA-Z0-9_-]{1,100}$/.test(part))) return null;
    return Object.freeze({ provider: "soundcloud", kind: "music", label, href: `https://soundcloud.com/${path.join("/")}` });
  }
  return null;
}

/**
 * The public boundary is allow-list only. It deliberately has no slot for a
 * DSH session id, prompt, thread title, reasoning, approval, reader setting or
 * local chunk id, so those values cannot be accidentally serialized.
 */
export function cleanShareSnapshot(candidate, now = Date.now()) {
  if (candidate === null || typeof candidate !== "object" || candidate.version !== SHARE_SNAPSHOT_VERSION) return null;
  const title = cleanText(candidate.title, MAX_TITLE);
  const kind = ARTICLE_KINDS.has(candidate.kind) ? candidate.kind : null;
  const markdown = cleanText(candidate.markdown, MAX_MARKDOWN, true);
  const publishedAt = Number(candidate.publishedAt);
  if (title === null || kind === null || markdown === null || !Number.isFinite(publishedAt) || publishedAt <= 0) return null;
  if (!Number.isFinite(now) || now <= 0 || publishedAt > now + 5 * 60 * 1000) return null;

  const visual = cleanVisual(candidate.visual);
  const inlineVisuals = [];
  const seen = new Set(visual === null ? [] : [visual.imageUrl]);
  for (const row of Array.isArray(candidate.inlineVisuals) ? candidate.inlineVisuals : []) {
    const item = cleanVisual(row);
    if (item === null || seen.has(item.imageUrl)) continue;
    seen.add(item.imageUrl);
    inlineVisuals.push(item);
    if (inlineVisuals.length >= 3) break;
  }
  return Object.freeze({
    version: SHARE_SNAPSHOT_VERSION,
    title,
    kind,
    markdown,
    publishedAt,
    visual,
    inlineVisuals: Object.freeze(inlineVisuals),
    contentLink: cleanContentLink(candidate.contentLink),
    media: cleanShareMedia(candidate.media),
  });
}

export function hasShareVisual(snapshot) {
  return snapshot !== null
    && typeof snapshot === "object"
    && (snapshot.visual !== null || (Array.isArray(snapshot.inlineVisuals) && snapshot.inlineVisuals.length > 0));
}

export function createShareTransfer(snapshot) {
  const cleaned = cleanShareSnapshot(snapshot, Math.max(Date.now(), Number(snapshot?.publishedAt) || 0));
  if (cleaned === null) throw new TypeError("share snapshot is invalid");
  return Object.freeze({ type: SHARE_MESSAGE_SNAPSHOT, version: SHARE_SNAPSHOT_VERSION, snapshot: cleaned });
}

export function isShareReadyMessage(candidate, origin) {
  return origin === SHARE_ORIGIN
    && candidate !== null
    && typeof candidate === "object"
    && candidate.type === SHARE_MESSAGE_READY
    && candidate.version === SHARE_SNAPSHOT_VERSION;
}
