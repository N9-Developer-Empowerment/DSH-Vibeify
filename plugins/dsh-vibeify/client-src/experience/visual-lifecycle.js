import { parseArticleImages } from "./article-image-source.js";
import { resolveArticleImage, articleImageKey, articleImageStatus } from "./article-image.js";

// Compatibility helper for callers outside the magazine. The magazine uses resolver results.
export function visualNeedsLocalCover(media, artworkUrl, verifiedUrls, failedUrls) {
  const url = media?.externalUrl ?? artworkUrl;
  return typeof url === "string" && (failedUrls.has(url) || (url.startsWith("https://") && !verifiedUrls.has(url)));
}

/** Scheduling/cache ownership only. All image choices belong to resolveArticleImage. */
export function createVisualLifecycle({
  capability, search, generate, load, generatedCache = null, cached = new Map(),
  onResult = () => {}, onSelect = () => {}, onVerified = () => {}, onStatus = () => {}, onFailure = () => {},
  retryDelays = [1000, 4000, 15000], getLead = null,
}) {
  const chunks = new Map();
  const pending = new Set();
  const results = new Map();
  const blocked = new Map();
  let disposed = false, running = null, retryTimer = null, attempts = 0;
  let generated = new Map(), restored = false, capabilityResult = null;
  let retryRequested = false;

  const available = () => capabilityResult ??= Promise.resolve().then(capability).then((value) => value === true, () => false);
  async function run() {
    if (!restored) {
      restored = true;
      try { const value = await generatedCache?.read(); if (value instanceof Map) generated = value; } catch { /* Optional cache. */ }
    }
    while (pending.size && !disposed) {
      // Resolve editor-selected images before spending time on optional discovery/generation.
      const priority = (id) => {
        const parsed = parseArticleImages(chunks.get(id)?.markdown);
        return parsed.visuals.length > 0 || parsed.sourceUrls.length > 0 ? 0 : 1;
      };
      const batch = [...pending].sort((a, b) => priority(a) - priority(b));
      pending.clear();
      let cursor = 0;
      const worker = async () => {
        while (!disposed && cursor < batch.length) {
          const id = batch[cursor++], chunk = chunks.get(id);
          if (!chunk) continue;
          const key = articleImageKey(chunk);
          const stale = () => disposed || articleImageKey(chunks.get(id)) !== key;
          let result;
          try {
            result = await resolveArticleImage(chunk, {
              load, search, generate, available, getLead,
              cached: cached.get(key), generated: generated.get(key),
              blockedUrls: blocked.get(id), cancelled: stale,
              onStatus: (status) => { if (!stale()) onStatus(id, status); },
            });
          } catch { result = { visual: null, origin: "fallback", reason: "image-unavailable", retryable: true }; }
          if (stale()) continue;
          results.set(id, result); onResult(id, result); onStatus(id, articleImageStatus(result));
          if (result.visual) {
            if (result.origin === "linked") onVerified(id, result.visual.imageUrl);
            else onSelect(id, result.visual);
            if (result.origin === "generated") {
              generated.set(key, result.visual);
              try { await generatedCache?.write(key, result.visual); } catch { /* Display still succeeds. */ }
            }
          }
        }
      };
      await Promise.all([worker(), worker()]);
    }
    if (!disposed && [...results.values()].some((result) => ["service-unavailable", "search-unavailable"].includes(result.reason))) {
      const delay = retryDelays[attempts++];
      if (delay !== undefined) retryTimer = setTimeout(() => { retryTimer = null; requeue(false); }, delay);
    }
  }
  function schedule() {
    if (disposed || running) return;
    running = run().finally(() => {
      running = null;
      if (retryRequested) { retryRequested = false; requeue(false); }
      else if (!disposed && pending.size) schedule();
    });
  }
  function requeue(explicit) {
    if (disposed) return;
    clearTimeout(retryTimer); retryTimer = null;
    if (explicit) { attempts = 0; blocked.clear(); }
    capabilityResult = null;
    for (const [id] of chunks) if (!results.has(id) || results.get(id).retryable) pending.add(id);
    if (running) retryRequested = true;
    schedule();
  }
  return Object.freeze({
    enqueue(items) {
      if (disposed) return;
      for (const chunk of items) {
        const old = chunks.get(chunk.id);
        chunks.set(chunk.id, chunk);
        if (!old || articleImageKey(old) !== articleImageKey(chunk)) {
          pending.add(chunk.id); results.delete(chunk.id); blocked.delete(chunk.id);
          // Clear an old cover immediately; stale in-flight results cannot restore it.
          onResult(chunk.id, { visual: null, origin: "fallback", reason: "pending", retryable: false });
        }
      }
      if (pending.size) schedule();
    },
    retry() { requeue(true); },
    failure(url) {
      if (!url || disposed) return;
      onFailure(url);
      for (const [id, result] of results) if (result.visual?.imageUrl === url) {
        const urls = blocked.get(id) ?? new Set(); urls.add(url); blocked.set(id, urls);
        const failed = { visual: null, origin: "fallback", reason: "image-load-failed", retryable: true };
        results.set(id, failed); onResult(id, failed); onStatus(id, articleImageStatus(failed)); pending.add(id);
        cached.delete(articleImageKey(chunks.get(id)));
      }
      schedule();
    },
    whenIdle() { return running ?? Promise.resolve(); },
    dispose() { disposed = true; clearTimeout(retryTimer); pending.clear(); },
  });
}
