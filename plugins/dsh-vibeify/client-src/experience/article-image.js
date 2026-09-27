import { parseArticleImages, commonsImageIdentity } from "./article-image-source.js";
import { publicVisualBriefForChunk, mediaFromVisualCandidate } from "./visual-source-client.js";

/** Cache identity includes the input, so edits under an unchanged article ID are re-evaluated. */
export function articleImageKey(chunk) {
  let hash = 2166136261;
  for (const char of JSON.stringify([chunk.source, chunk.kind, chunk.title, chunk.markdown])) {
    hash ^= char.codePointAt(0); hash = Math.imul(hash, 16777619);
  }
  return `${String(chunk.id).slice(0,64)}:${(hash >>> 0).toString(16)}`;
}

/**
 * The only asynchronous image-selection policy for an article.
 * Nothing leaves this function as selected until it has actually decoded.
 * An explicit Commons credit is an exact choice, never a hint for unrelated stock.
 * Dependencies do I/O only; the queue, renderer and sharing must not choose again.
 */
export async function resolveArticleImage(chunk, {
  load, search, generate, available = async () => true,
  cached = null, generated = null, blockedUrls = new Set(),
  getLead = null, cancelled = () => false, onStatus = () => {},
}) {
  const parsed = parseArticleImages(chunk.markdown);
  const exact = parsed.sourceUrls.length > 0;
  const sources = new Set(parsed.sourceUrls.map(commonsImageIdentity));
  const matchesSource = (visual) => sources.has(commonsImageIdentity(visual?.sourceUrl));
  const attempted = new Set(blockedUrls);
  const fallback = (reason, retryable = true) => ({ visual: null, origin: "fallback", reason, retryable });
  const attempt = async (visual, origin) => {
    if (cancelled() || !visual?.imageUrl || attempted.has(visual.imageUrl)) return null;
    attempted.add(visual.imageUrl);
    try {
      if (await load(visual.imageUrl) && !cancelled()) return { visual, origin, reason: null, retryable: false };
    } catch { /* A broken image must not abort the remaining articles. */ }
    return null;
  };
  const lead = getLead ? getLead(chunk.markdown) : parsed.visuals[0];
  let result = await attempt(lead, "linked");
  if (result) return result;
  if (cancelled()) return fallback("cancelled");

  // Restore a matching exact image, but never let an old generated/stock cover mask a credit.
  if (exact && cached && matchesSource(cached)) {
    result = await attempt(cached, "cached");
    if (result) return result;
  }
  if (!exact) {
    result = await attempt(generated, "generated-cache") || await attempt(cached, "cached");
    if (result) return result;
  }
  const brief = publicVisualBriefForChunk(chunk, parsed);
  if (!brief) return fallback(lead ? "image-load-failed" : "no-public-image-brief", Boolean(lead));
  let ready = false;
  try { ready = await available(); } catch { /* Offline is a recoverable state. */ }
  if (!ready || cancelled()) return fallback(cancelled() ? "cancelled" : "service-unavailable");
  onStatus(exact ? "Loading the credited image…" : "Finding a photograph…");
  let candidates;
  try { candidates = await search(chunk, [...blockedUrls]); }
  catch { return fallback("search-unavailable"); }
  for (const candidate of (Array.isArray(candidates) ? candidates : []).slice(0, 8)) {
    if (exact && !matchesSource(candidate)) continue;
    result = await attempt(candidate, "search");
    if (result) return result;
  }
  if (cancelled()) return fallback("cancelled");
  if (exact) return fallback("credited-image-unavailable");
  onStatus("Creating an illustration…");
  let image;
  try { image = await generate(chunk); } catch { return fallback("generation-unavailable"); }
  return await attempt(image, "generated") || fallback("image-unavailable");
}

/** Pure presentation adapter; sharing receives this same media record. */
export function articleImageMedia(result, fallback) {
  if (!result?.visual) return fallback;
  const visual = result.visual;
  const media = result.origin === "linked" ? {
    kind: "editorial-image", externalUrl: visual.imageUrl, href: visual.sourceUrl,
    alt: visual.alt, label: visual.credit, focalPoint: "center", mode: fallback?.mode,
  } : mediaFromVisualCandidate(visual, fallback?.episode?.artwork, fallback?.mode);
  return media ? { ...media, episode: fallback?.episode } : fallback;
}

export function articleImageStatus(result) {
  if (!result?.retryable || result.reason === "cancelled") return "";
  return result.reason === "credited-image-unavailable" || result.reason === "image-load-failed"
    ? "The credited image could not load. Update retries it."
    : "Image lookup is unavailable. Update retries it.";
}
