import {
  SHARE_ORIGIN,
  SHARE_SNAPSHOT_VERSION,
  cleanShareSnapshot,
  createShareTransfer,
  isShareReadyMessage,
} from "../../../../shared/vibe-share-contract.js";

export const SHARE_READY_TIMEOUT_MS = 15_000;

function publicHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host.includes(":") || host.startsWith("[") || host.endsWith("]")) return false;
  if (!host.includes(".") || /\.(?:localhost|local|localdomain|internal|intranet|lan|home|test|example|invalid)$/.test(host)) return false;
  const octets = host.split(".");
  if (octets.length !== 4 || !octets.every((part) => /^\d{1,3}$/.test(part))) return true;
  const [first, second, third, fourth] = octets.map(Number);
  if ([first, second, third, fourth].some((part) => part > 255)) return false;
  return !(
    first === 0
    || first === 10
    || first === 127
    || first >= 224
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 0 && third === 0)
    || (first === 192 && second === 0 && third === 2)
    || (first === 192 && second === 88 && third === 99)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19))
    || (first === 198 && second === 51 && third === 100)
    || (first === 203 && second === 0 && third === 113)
  );
}

/** Accept only an absolute public HTTPS URL and keep its encoding untouched. */
export function publicShareUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 4_096) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.hostname === "" || parsed.username !== "" || parsed.password !== "" || !publicHostname(parsed.hostname)) return null;
    return value;
  } catch {
    return null;
  }
}

export async function copyPublicShareUrl(value, clipboard = globalThis.navigator?.clipboard) {
  const url = publicShareUrl(value);
  if (url === null || typeof clipboard?.writeText !== "function") return false;
  try {
    await clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/** Request the browser's native share sheet; cancellation is an ordinary result. */
export async function sharePublicUrl(value, title, navigatorObject = globalThis.navigator) {
  const url = publicShareUrl(value);
  if (url === null || typeof navigatorObject?.share !== "function") return "unsupported";
  const safeTitle = typeof title === "string" ? title.trim().slice(0, 160) : "";
  try {
    await navigatorObject.share(safeTitle === "" ? { url } : { title: safeTitle, url });
    return "shared";
  } catch (cause) {
    return cause?.name === "AbortError" ? "cancelled" : "unavailable";
  }
}

export function shareSnapshotForChunk({ chunk, markdown, media, inlineVisuals, contentLink, embeddedMedia }, now = Date.now()) {
  const publicPhoto = media?.episode?.photo;
  const remoteImageUrl = typeof media?.externalUrl === "string" && (media.externalUrl.startsWith("https://") || (media.kind === "ai-generated" && media.externalUrl.startsWith("data:image/png;base64,")))
    ? media.externalUrl
    : null;
  const visual = media?.kind === "illustration" ? {
    kind: "illustration", illustrationId: media.illustrationId,
  } : remoteImageUrl !== null ? {
    imageUrl: remoteImageUrl,
    sourceUrl: media.href,
    alt: media.alt,
    credit: media.label,
    kind: media.kind ?? (/\bphotograph|\bphoto\b/i.test(media.label ?? "") ? "photograph" : undefined),
  } : media?.kind === "photograph" && typeof publicPhoto?.publicImageUrl === "string" ? {
    imageUrl: publicPhoto.publicImageUrl,
    sourceUrl: publicPhoto.sourceUrl ?? media.href,
    alt: publicPhoto.alt ?? media.alt,
    credit: typeof publicPhoto.photographer === "string" ? `Photograph · ${publicPhoto.photographer}` : media.label,
    kind: "photograph",
  } : null;
  return cleanShareSnapshot({
    version: SHARE_SNAPSHOT_VERSION,
    title: chunk?.title,
    kind: chunk?.kind,
    markdown,
    publishedAt: Number(chunk?.publishedAt) || now,
    visual,
    inlineVisuals,
    contentLink,
    media: embeddedMedia === null || embeddedMedia === undefined ? null : {
      kind: embeddedMedia.kind,
      label: embeddedMedia.label,
      href: embeddedMedia.href,
    },
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
