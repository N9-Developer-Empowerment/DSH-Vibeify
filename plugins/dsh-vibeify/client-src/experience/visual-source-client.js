export const VISUAL_RPC_CHANNEL = "/dsh-visuals";
export const VISUAL_CACHE_KEY = "dsh-vibeify.visuals.v1";
export const VISUAL_CACHE_VERSION = 1;
export const VISUAL_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_VISUAL_CACHE = 160;

const PUBLIC_SOURCES = Object.freeze(new Set(["fresh-stream", "radar-reserve"]));
const PROVIDER_HOSTS = Object.freeze({
  wikimedia: Object.freeze(new Set(["upload.wikimedia.org"])),
  openverse: Object.freeze(new Set(["upload.wikimedia.org", "live.staticflickr.com", "images-assets.nasa.gov", "tile.loc.gov", "ids.si.edu"])),
  pexels: Object.freeze(new Set(["images.pexels.com"])),
  pixabay: Object.freeze(new Set(["cdn.pixabay.com", "pixabay.com"])),
});
const LICENCES = Object.freeze({
  wikimedia: /^(?:CC0|CC BY(?:-SA)?(?: \d(?:\.\d)?)?|Public domain)$/i,
  openverse: /^(?:CC0(?: \d(?:\.\d)?)?|CC BY(?:-SA)?(?: \d(?:\.\d)?)?|Public domain)$/i,
  pexels: /^Pexels licence$/i,
  pixabay: /^Pixabay Content License$/i,
});

function cleanText(value, limit) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned === "" ? null : cleaned.slice(0, limit);
}

function cleanHttps(value, hosts = null) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
    if (hosts !== null && !hosts.has(url.hostname.toLowerCase())) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function cleanCandidate(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const provider = Object.hasOwn(PROVIDER_HOSTS, value.provider) ? value.provider : null;
  if (provider === null) return null;
  const imageUrl = cleanHttps(value.imageUrl, PROVIDER_HOSTS[provider]);
  const sourceUrl = cleanHttps(value.sourceUrl);
  const alt = cleanText(value.alt, 240);
  const creator = cleanText(value.creator, 120);
  const credit = cleanText(value.credit, 220);
  const license = cleanText(value.license, 80);
  if (imageUrl === null || sourceUrl === null || alt === null || creator === null || credit === null || license === null) return null;
  if (!LICENCES[provider].test(license) || !credit.toLowerCase().includes(creator.toLowerCase())) return null;
  const width = Number(value.width);
  const height = Number(value.height);
  const score = Number(value.score);
  return Object.freeze({
    provider,
    imageUrl,
    sourceUrl,
    alt,
    creator,
    credit,
    license,
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : null,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : null,
    score: Number.isFinite(score) ? score : 0,
  });
}

export function cleanVisualSearchResult(value) {
  const rows = Array.isArray(value?.candidates) ? value.candidates : [];
  const seen = new Set();
  return Object.freeze(rows.slice(0, 24).flatMap((candidate) => {
    const cleaned = cleanCandidate(candidate);
    if (cleaned === null || seen.has(cleaned.imageUrl)) return [];
    seen.add(cleaned.imageUrl);
    return [cleaned];
  }));
}

export function publicVisualBriefForChunk(chunk) {
  if (chunk === null || typeof chunk !== "object" || chunk.kind === "questionnaire" || !PUBLIC_SOURCES.has(chunk.source)) return null;
  const query = cleanText(chunk.title, 180);
  if (query === null || query.length < 3) return null;
  return Object.freeze({ query, orientation: "landscape" });
}

function emptyCache() {
  return Object.freeze({ version: VISUAL_CACHE_VERSION, entries: Object.freeze([]) });
}

function cacheDocument(storage) {
  if (storage === null || storage === undefined || typeof storage.getItem !== "function") return emptyCache();
  try {
    const parsed = JSON.parse(storage.getItem(VISUAL_CACHE_KEY) ?? "null");
    if (parsed?.version !== VISUAL_CACHE_VERSION || !Array.isArray(parsed.entries)) return emptyCache();
    return parsed;
  } catch {
    return emptyCache();
  }
}

export function readVisualCache(storage, now = Date.now()) {
  const result = new Map();
  for (const entry of cacheDocument(storage).entries.slice(-MAX_VISUAL_CACHE)) {
    const chunkId = cleanText(entry?.chunkId, 96);
    const selectedAt = Number(entry?.selectedAt);
    const visual = cleanCandidate(entry?.visual);
    if (chunkId === null || visual === null || !Number.isFinite(selectedAt) || selectedAt <= 0 || now - selectedAt > VISUAL_CACHE_TTL_MS) continue;
    result.set(chunkId, visual);
  }
  return result;
}

export function writeVisualCache(storage, chunkId, visual, now = Date.now()) {
  const id = cleanText(chunkId, 96);
  const cleaned = cleanCandidate(visual);
  if (id === null || cleaned === null || !Number.isFinite(now) || now <= 0 || storage === null || typeof storage.setItem !== "function") return false;
  const entries = cacheDocument(storage).entries.filter((entry) => entry?.chunkId !== id && Number(now) - Number(entry?.selectedAt) <= VISUAL_CACHE_TTL_MS);
  entries.push({ chunkId: id, selectedAt: now, visual: cleaned });
  try {
    storage.setItem(VISUAL_CACHE_KEY, JSON.stringify({ version: VISUAL_CACHE_VERSION, entries: entries.slice(-MAX_VISUAL_CACHE) }));
    return true;
  } catch {
    return false;
  }
}

export async function searchVisualForChunk(connection, chunk, excludeUrls = []) {
  const brief = publicVisualBriefForChunk(chunk);
  if (brief === null || connection?.rpc?.call === undefined) return Object.freeze([]);
  try {
    const response = await connection.rpc.call(VISUAL_RPC_CHANNEL, "search", {
      ...brief,
      limit: 12,
      excludeUrls: Array.isArray(excludeUrls) ? excludeUrls.slice(-80) : [],
    });
    if (response?.ok !== true) return Object.freeze([]);
    return cleanVisualSearchResult(response.value);
  } catch {
    return Object.freeze([]);
  }
}

export function mediaFromVisualCandidate(visual, fallbackArtwork, mode = "cinema") {
  const cleaned = cleanCandidate(visual);
  if (cleaned === null) return null;
  return Object.freeze({
    kind: cleaned.provider === "pexels" || cleaned.provider === "pixabay" ? "photograph" : "editorial-image",
    externalUrl: cleaned.imageUrl,
    fallbackArtwork,
    alt: cleaned.alt,
    focalPoint: "center",
    href: cleaned.sourceUrl,
    label: cleaned.credit,
    mode,
    provider: cleaned.provider,
    license: cleaned.license,
  });
}
