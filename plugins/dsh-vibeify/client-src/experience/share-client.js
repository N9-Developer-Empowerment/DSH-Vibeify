import {
  SHARE_ORIGIN,
  SHARE_SNAPSHOT_VERSION,
  cleanShareSnapshot,
  createShareTransfer,
  isShareReadyMessage,
} from "../../../../shared/vibe-share-contract.js";

export const SHARE_READY_TIMEOUT_MS = 15_000;

export function shareSnapshotForChunk({ chunk, markdown, media, inlineVisuals, contentLink }, now = Date.now()) {
  return cleanShareSnapshot({
    version: SHARE_SNAPSHOT_VERSION,
    title: chunk?.title,
    kind: chunk?.kind,
    markdown,
    publishedAt: Number(chunk?.publishedAt) || now,
    visual: media?.externalUrl === undefined ? null : {
      imageUrl: media.externalUrl,
      sourceUrl: media.href,
      alt: media.alt,
      credit: media.label,
    },
    inlineVisuals,
    contentLink,
  }, now);
}

/**
 * Open the first-party share preview from a deliberate reader click. DSH never
 * calls the publishing API and never holds its credential: it transfers one
 * allow-listed article to the exact share origin after that page says it is
 * ready. The public write remains a second explicit action on the share page.
 */
export function beginSharePreview(snapshot, {
  openWindow = (url, name) => window.open(url, name),
  addMessageListener = (listener) => window.addEventListener("message", listener),
  removeMessageListener = (listener) => window.removeEventListener("message", listener),
  setTimer = (callback, delay) => window.setTimeout(callback, delay),
  clearTimer = (timer) => window.clearTimeout(timer),
  onStatus = () => {},
} = {}) {
  const transfer = createShareTransfer(snapshot);
  const preview = openWindow(`${SHARE_ORIGIN}/new`, "vibe-share");
  if (preview === null || preview === undefined) {
    onStatus("blocked");
    return Object.freeze({ opened: false, cancel() {} });
  }

  let active = true;
  let timer = null;
  const cleanup = () => {
    if (!active) return;
    active = false;
    removeMessageListener(onMessage);
    if (timer !== null) clearTimer(timer);
  };
  const onMessage = (event) => {
    if (!active || event?.source !== preview || !isShareReadyMessage(event?.data, event?.origin)) return;
    preview.postMessage(transfer, SHARE_ORIGIN);
    cleanup();
    onStatus("transferred");
  };
  addMessageListener(onMessage);
  timer = setTimer(() => {
    cleanup();
    onStatus("timed-out");
  }, SHARE_READY_TIMEOUT_MS);
  onStatus("opening");
  return Object.freeze({ opened: true, cancel: cleanup });
}
