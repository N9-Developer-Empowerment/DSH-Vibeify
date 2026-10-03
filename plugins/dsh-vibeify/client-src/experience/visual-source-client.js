import { parseArticleImages } from "./article-image-source.js";
export const VISUAL_RPC_CHANNEL = "/dsh-visuals";
export const VISUAL_CACHE_KEY = "dsh-vibeify.visuals.v1";
export const VISUAL_CACHE_VERSION = 2;
export const VISUAL_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_VISUAL_CACHE = 160;

const PUBLIC_SOURCES = Object.freeze(new Set(["fresh-stream", "radar-reserve"]));
const PROVIDER_HOSTS = Object.freeze({
  wikimedia: Object.freeze(new Set(["upload.wikimedia.org", "thumb.wikimedia.org"])),
  openverse: Object.freeze(new Set(["upload.wikimedia.org", "thumb.wikimedia.org", "live.staticflickr.com", "images-assets.nasa.gov", "tile.loc.gov", "ids.si.edu"])),
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
  if (value.provider === "chatgpt-image") {
    const prefix = "data:image/png;base64,";
    if (typeof value.imageUrl !== "string" || !value.imageUrl.startsWith(prefix) || value.imageUrl.length > 4_000_022 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.imageUrl.slice(prefix.length))) return null;
    try { if (atob(value.imageUrl.slice(prefix.length)).slice(0, 8) !== "\x89PNG\r\n\x1a\n") return null; } catch { return null; }
    return Object.freeze({ provider: "chatgpt-image", imageUrl: value.imageUrl, sourceUrl: "https://openai.com/index/image-generation/", alt: cleanText(value.alt, 240) ?? "Generated editorial illustration", creator: "ChatGPT", credit: "Generated illustration · ChatGPT", license: "Generated illustration", width: value.width, height: value.height, score: 0 });
  }
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

export function publicVisualBriefForChunk(chunk, parsed = parseArticleImages(chunk?.markdown)) {
  if (chunk === null || typeof chunk !== "object" || chunk.kind === "questionnaire") return null;
  if (!PUBLIC_SOURCES.has(chunk.source)) {
    // Resolve an explicitly linked public photograph without sending private prose or title.
    const sourceUrls = parsed.sourceUrls;
    return sourceUrls.length === 0 ? null : Object.freeze({ query: "Editorial photograph", sourceUrls, orientation: "landscape" });
  }
  const imageAlt = parsed.firstImageAlt;
  const query = cleanText(imageAlt ?? chunk.title, 100);
  if (query === null || query.length < 3) return null;
  return Object.freeze({ query, orientation: "landscape", sourceUrls: parsed.sourceUrls });
}

export function createGeneratedVisualCache(indexedDB = globalThis.indexedDB) {
  const open = () => new Promise((resolve) => {
    if (!indexedDB?.open) { resolve(null); return; }
    let settled = false;
    const finish = (value) => { if (!settled) { settled = true; resolve(value); } };
    try {
      const request = indexedDB.open("dsh-vibeify-generated-visuals", 1);
      const timer = setTimeout(() => finish(null), 2000);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains("images")) request.result.createObjectStore("images", { keyPath: "chunkId" }); };
      request.onsuccess = () => { clearTimeout(timer); finish(request.result); };
      request.onerror = request.onblocked = () => { clearTimeout(timer); finish(null); };
    } catch { finish(null); }
  });
  return Object.freeze({
    async read() {
      const db = await open();
      if (!db) return new Map();
      return new Promise((resolve) => {
        try {
          const request = db.transaction("images", "readonly").objectStore("images").getAll();
          request.onsuccess = () => {
            const result = new Map();
            for (const row of request.result ?? []) {
              const visual = cleanCandidate(row.visual);
              if (visual && Date.now() - row.selectedAt <= VISUAL_CACHE_TTL_MS) result.set(row.chunkId, visual);
            }
            db.close(); resolve(result);
          };
          request.onerror = () => { db.close(); resolve(new Map()); };
        } catch { db.close(); resolve(new Map()); }
      });
    },
    async write(chunkId, visual) {
      const cleaned = cleanCandidate(visual);
      if (!cleaned || cleaned.provider !== "chatgpt-image") return false;
      const db = await open();
      if (!db) return false;
      return new Promise((resolve) => {
        try {
          const transaction = db.transaction("images", "readwrite");
          transaction.objectStore("images").put({ chunkId, selectedAt: Date.now(), visual: cleaned });
          transaction.oncomplete = () => { db.close(); resolve(true); };
          transaction.onerror = transaction.onabort = () => { db.close(); resolve(false); };
        } catch { db.close(); resolve(false); }
      });
    },
  });
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
  if (cleaned.provider === "chatgpt-image") return false; // Bitmap persists in the host cache; avoid filling browser storage.
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
      exactOnly: brief.sourceUrls.length > 0,
      excludeUrls: Array.isArray(excludeUrls) ? excludeUrls.slice(-80) : [],
    });
    if (response?.ok !== true) throw new Error("Image search is unavailable");
    const candidates = cleanVisualSearchResult(response.value);
    if (candidates.length === 0 && response.value?.failedProviders?.length > 0) throw new Error("Image search is unavailable");
    return candidates;
  } catch {
    throw new Error("Image search is unavailable");
  }
}

export function mediaFromVisualCandidate(visual, fallbackArtwork, mode = "cinema") {
  const cleaned = cleanCandidate(visual);
  if (cleaned === null) return null;
  return Object.freeze({
    kind: cleaned.provider === "chatgpt-image" ? "ai-generated" : cleaned.provider === "pexels" || cleaned.provider === "pixabay" ? "photograph" : "editorial-image",
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

export const usableImageDimensions = (image) => image.naturalWidth >= 480 && image.naturalHeight >= 240;

// A candidate is not selected or cached until the actual browser decodes it.
export function visualImageLoads(url, ImageClass = globalThis.Image, timeoutMs = 8000) {
  if (typeof ImageClass !== "function") return Promise.resolve(false);
  return new Promise((resolve) => {
    const image = new ImageClass();
    const finish = (ok) => { clearTimeout(timer); image.onload = null; image.onerror = null; resolve(ok); };
    const timer = setTimeout(() => finish(false), timeoutMs);
    image.referrerPolicy = "no-referrer";
    image.onload = () => finish(usableImageDimensions(image));
    image.onerror = () => finish(false);
    image.src = url;
  });
}

export async function generateVisualForChunk(connection, chunk) {
  if (!PUBLIC_SOURCES.has(chunk?.source) || chunk.kind === "questionnaire") return null;
  const brief = publicVisualBriefForChunk(chunk);
  if (!brief || !connection?.rpc?.call) return null;
  try {
    const response = await connection.rpc.call(VISUAL_RPC_CHANNEL, "generate", { subject: brief.query.slice(0, 180) });
    const result = response?.ok === true ? response.value : null;
    if (!["generated", "cached"].includes(result?.status)) return null;
    return cleanCandidate({ provider: "chatgpt-image", imageUrl: result.imageDataUrl, alt: result.alt, width: result.width, height: result.height });
  } catch { return null; }
}
