import { remoteVisualForMarkdown } from "./feed.js";
import { publicVisualBriefForChunk } from "./visual-source-client.js";

export function visualNeedsLocalCover(media, artworkUrl, verifiedUrls, failedUrls) {
  const url = media?.externalUrl ?? artworkUrl;
  return typeof url === "string" && (failedUrls.has(url) || (url.startsWith("https://") && !verifiedUrls.has(url)));
}

/** One queue for one mounted magazine. Changing the chunk list never cancels in-flight work. */
export function createVisualLifecycle({
  capability, search, generate, load, generatedCache = null, cached = new Map(),
  onSelect = () => {}, onVerified = () => {}, onStatus = () => {}, onFailure = () => {},
  retryDelays = [1000, 4000, 15000], getLead = remoteVisualForMarkdown,
}) {
  const chunks = new Map();
  const pending = new Set();
  const complete = new Set();
  const failedIds = new Set();
  const selectedUrls = new Map();
  const failedUrls = new Set();
  let disposed = false;
  let running = null;
  let retryTimer = null;
  let attempts = 0;
  let available = false;
  let generatedLoaded = false;
  let retryRequested = false;

  function emitSelect(id, visual) {
    if (!disposed && chunks.has(id)) { onSelect(id, visual); selectedUrls.set(id, visual.imageUrl); complete.add(id); failedIds.delete(id); }
  }

  async function restoreGenerated() {
    if (generatedLoaded) return;
    generatedLoaded = true;
    try {
      const restored = await generatedCache?.read();
      if (disposed || !(restored instanceof Map)) return;
      for (const [id, visual] of restored) {
        if (chunks.has(id) && !failedUrls.has(visual?.imageUrl) && await load(visual.imageUrl)) emitSelect(id, visual);
      }
    } catch { /* IndexedDB can be disabled; local pictures and host cache still work. */ }
  }

  async function checkExisting(chunk) {
    const visual = cached.get(chunk.id);
    if (visual?.imageUrl && !failedUrls.has(visual.imageUrl)) {
      if (await load(visual.imageUrl)) { emitSelect(chunk.id, visual); return true; }
      failedUrls.add(visual.imageUrl);
      if (!disposed) onFailure(visual.imageUrl);
    }
    const lead = getLead(chunk.markdown);
    if (lead?.imageUrl && !failedUrls.has(lead.imageUrl)) {
      if (await load(lead.imageUrl)) {
        if (!disposed) { onVerified(chunk.id, lead.imageUrl); selectedUrls.set(chunk.id, lead.imageUrl); complete.add(chunk.id); failedIds.delete(chunk.id); }
        return true;
      }
      failedUrls.add(lead.imageUrl);
      if (!disposed) onFailure(lead.imageUrl);
    }
    return false;
  }

  async function photosFor(chunk) {
    if (disposed || complete.has(chunk.id) || !chunks.has(chunk.id)) return false;
    if (await checkExisting(chunk)) return true;
    if (disposed || publicVisualBriefForChunk(chunk) === null) return false;
    onStatus(chunk.id, "Finding a photograph…");
    const candidates = await search(chunk, [...failedUrls]);
    if (disposed) return false;
    for (const candidate of (Array.isArray(candidates) ? candidates : []).slice(0, 8)) {
      if (failedUrls.has(candidate.imageUrl)) continue;
      if (await load(candidate.imageUrl)) { emitSelect(chunk.id, candidate); return true; }
      failedUrls.add(candidate.imageUrl);
    }
    return false;
  }

  async function pass() {
    await restoreGenerated();
    if (disposed) return;
    // Linked and browser-cached pictures are local display decisions, even if RPC is down.
    for (const id of pending) {
      const chunk = chunks.get(id);
      if (complete.has(id)) pending.delete(id);
      else if (chunk && await checkExisting(chunk)) pending.delete(id);
      else if (chunk && publicVisualBriefForChunk(chunk) === null) { complete.add(id); pending.delete(id); }
      if (disposed) return;
    }
    if (pending.size === 0) return;
    if (!available) {
      try { available = await capability() === true; } catch { available = false; }
      if (disposed) return;
      if (!available) {
        const delay = retryDelays[attempts++];
        if (delay !== undefined) retryTimer = setTimeout(() => { retryTimer = null; schedule(); }, delay);
        return;
      }
      attempts = 0;
    }
    while (pending.size > 0 && !disposed) {
      const batch = [...pending].map((id) => chunks.get(id)).filter(Boolean);
      pending.clear();
      let cursor = 0;
      const illustrationQueue = [];
      const worker = async () => {
        while (!disposed && cursor < batch.length) {
          const chunk = batch[cursor++];
          if (!await photosFor(chunk) && !disposed && !complete.has(chunk.id) && publicVisualBriefForChunk(chunk) !== null) illustrationQueue.push(chunk);
        }
      };
      await Promise.all([worker(), worker()]);
      // The free photo pass finishes for the batch before paid generation starts.
      for (const chunk of illustrationQueue) {
        if (disposed || complete.has(chunk.id) || !chunks.has(chunk.id)) continue;
        onStatus(chunk.id, "Creating an illustration…");
        let image = null;
        try { image = await generate(chunk); } catch { /* Keep the bundled picture. */ }
        if (disposed) return;
        if (image?.imageUrl && await load(image.imageUrl)) {
          if (disposed) return;
          emitSelect(chunk.id, image);
          try { await generatedCache?.write(chunk.id, image); } catch { /* Host cache remains available. */ }
        } else if (!disposed) {
          onStatus(chunk.id, "");
          complete.add(chunk.id); // A later explicit Update may retry; chunk changes do not.
          failedIds.add(chunk.id);
        }
      }
    }
  }

  function schedule() {
    if (disposed || running) return;
    running = pass().finally(() => {
      running = null;
      const retry = retryRequested;
      retryRequested = false;
      if (!disposed && pending.size > 0 && (available || retry)) schedule();
    });
  }

  return Object.freeze({
    enqueue(items) {
      if (disposed) return;
      for (const chunk of items) {
        if (!chunks.has(chunk.id)) { chunks.set(chunk.id, chunk); pending.add(chunk.id); }
        else chunks.set(chunk.id, chunk);
      }
      if (pending.size > 0) schedule();
    },
    retry() {
      if (disposed) return;
      clearTimeout(retryTimer); retryTimer = null;
      attempts = 0;
      available = false;
      failedUrls.clear();
      for (const id of chunks.keys()) if (!complete.has(id)) pending.add(id);
      // Failed generation was marked complete to prevent loops; Update deliberately requeues it.
      for (const id of failedIds) { complete.delete(id); pending.add(id); }
      failedIds.clear();
      retryRequested = Boolean(running);
      schedule();
    },
    failure(url) { if (url) { failedUrls.add(url); for (const [id, chunk] of chunks) if (selectedUrls.get(id) === url || getLead(chunk.markdown)?.imageUrl === url) { complete.delete(id); pending.add(id); cached.delete(id); } schedule(); } },
    whenIdle() { return running ?? Promise.resolve(); },
    dispose() { disposed = true; clearTimeout(retryTimer); pending.clear(); },
  });
}
