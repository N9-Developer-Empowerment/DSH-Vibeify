import { mediaEmbedSource } from "./media.mjs";
import { vibeInteractiveRuntimeSource } from "../../../shared/vibe-interactive.js";
import { vibeMarkdownRuntimeSource } from "../../../shared/vibe-markdown.js";
import { storyCoverRuntimeSource } from "../../../shared/vibe-cover.js";
import { EDITORIAL_ILLUSTRATIONS } from "../../../shared/editorial-illustrations.js";

const APP_BODY = String.raw`installInteractiveSizing();
const VERSION = 1;
const READY = "vibe-share:ready";
const SNAPSHOT = "vibe-share:snapshot";
const ALLOWED_OPENERS = new Set(["http://127.0.0.1:3080", "http://localhost:3080"]);
const preview = document.getElementById("preview");
const publish = document.getElementById("publish");
const status = document.getElementById("status");
let snapshot = null;
let generatedCover = null;

async function createTypographicCover(value) {
  const svg = createStoryCoverSvg(value.title, value.markdown);
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("The editorial cover could not be drawn"));
    image.src = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  });
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("The editorial cover could not be drawn");
  context.drawImage(image, 0, 0, 1200, 630);
  return canvas.toDataURL("image/jpeg", 0.9);
}

async function createGeneratedIllustrationJpeg(png) {
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("The generated illustration could not be drawn"));
    image.src = png;
  });
  if (image.naturalWidth < 1 || image.naturalHeight < 1) throw new Error("The generated illustration is empty");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("The generated illustration could not be drawn");
  for (const maxDimension of [1200, 1000, 840, 700, 560]) {
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.86, 0.72, 0.58]) {
      const jpeg = canvas.toDataURL("image/jpeg", quality);
      if (jpeg.startsWith("data:image/jpeg;base64,") && jpeg.length <= 400_023) return jpeg;
    }
  }
  throw new Error("The generated illustration is too large to share");
}

async function preparePreview(value) {
  if (value.visual?.kind === "illustration") {
    const drawing = BUNDLED_ILLUSTRATIONS[value.visual.illustrationId];
    if (!drawing) throw new Error("This illustration is not available. Reopen the article in Vibe.");
    const visual = { ...drawing, imageUrl: location.origin + "/illustrations/" + drawing.illustrationId + ".svg" };
    generatedCover = await createGeneratedIllustrationJpeg(visual.imageUrl);
    snapshot = { ...value, visual, inlineVisuals: value.inlineVisuals ?? [] };
    renderSnapshot({ ...snapshot, visual: { ...visual, imageUrl: generatedCover } });
    publish.disabled = false;
    status.textContent = "Private preview ready. The same credited illustration will appear on the public article.";
    return;
  }
  if (value.visual?.kind === "ai-generated" && value.visual.imageUrl?.startsWith("data:image/png;base64,")) {
    generatedCover = await createGeneratedIllustrationJpeg(value.visual.imageUrl);
    snapshot = { ...value, visual: value.visual, inlineVisuals: value.inlineVisuals ?? [] };
    renderSnapshot({ ...snapshot, visual: { ...value.visual, imageUrl: generatedCover } });
    publish.disabled = false;
    status.textContent = "Private preview ready. Review this generated illustration before publishing.";
    return;
  }
  if (typeof value.visual?.imageUrl === "string" || (Array.isArray(value.inlineVisuals) && value.inlineVisuals.length > 0)) {
    generatedCover = null;
    snapshot = { ...value, visual: value.visual, inlineVisuals: value.inlineVisuals ?? [] };
  } else {
    generatedCover = await createTypographicCover(value);
    snapshot = {
      ...value,
      visual: {
        imageUrl: generatedCover,
        sourceUrl: "https://dsh-vibeify.ezzye.chatgpt.site/",
        alt: "Editorial typographic cover for " + value.title,
        credit: "Editorial typography · created for this article",
        kind: "typography",
      },
      inlineVisuals: [],
    };
  }
  renderSnapshot(snapshot);
  publish.disabled = false;
  status.textContent = generatedCover === null
    ? "Private preview ready. The Vibe image will appear on the public article."
    : "Private preview ready. Review this editorial cover before publishing.";
}

async function copyPublicLink(value, input) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    input?.focus();
    input?.select();
    return false;
  }
}

async function sharePublicLink(value, title) {
  if (typeof navigator.share !== "function") return "unsupported";
  try {
    await navigator.share({ title, url: value });
    return "shared";
  } catch (error) {
    return error?.name === "AbortError" ? "cancelled" : "unavailable";
  }
}

function createPublishedShareControls(value, title) {
  const controls = document.createElement("section");
  controls.className = "published-actions";
  controls.setAttribute("aria-label", "Share the published article");
  const label = document.createElement("label");
  label.className = "published-link-label";
  label.textContent = "Public link";
  const input = document.createElement("input");
  input.type = "url";
  input.readOnly = true;
  input.value = value;
  input.setAttribute("aria-label", "Published public link");
  input.addEventListener("focus", () => input.select());
  input.addEventListener("click", () => input.select());
  label.append(input);
  const open = document.createElement("a");
  open.href = value;
  open.target = "_blank";
  open.rel = "noopener noreferrer";
  open.textContent = "Open public article";

  const actions = document.createElement("div");
  actions.className = "published-share-buttons";
  const message = document.createElement("p");
  message.className = "published-share-status";
  message.setAttribute("role", "status");
  message.textContent = "The public article is ready to share.";
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "Copy link";
  copy.addEventListener("click", async () => {
    const copied = await copyPublicLink(value, input);
    message.textContent = copied ? "Link copied." : "Copy is unavailable. Select the link above to copy it.";
  });
  actions.append(copy);

  if (typeof navigator.share === "function") {
    const share = document.createElement("button");
    share.type = "button";
    share.textContent = "Share…";
    share.addEventListener("click", async () => {
      const outcome = await sharePublicLink(value, title);
      message.textContent = outcome === "cancelled"
        ? "Sharing cancelled. The public link is still available above."
        : outcome === "unavailable"
          ? "The share sheet could not open. Select or copy the link above."
          : "The share sheet closed. Check the destination if you chose one.";
      if (outcome === "unavailable") { input.focus(); input.select(); }
    });
    actions.append(share);
  }

  controls.append(label, open, actions, message);
  return controls;
}

function renderVisual(visual, className = "lead") {
  if (visual === null) return "";
  const figure = document.createElement("figure");
  figure.className = className;
  const image = document.createElement("img");
  image.src = visual.imageUrl;
  image.alt = visual.alt;
  image.referrerPolicy = "no-referrer";
  const caption = document.createElement("figcaption");
  caption.textContent = visual.credit;
  figure.append(image, caption);
  return figure;
}


function renderMedia(media) {
  if (media === null || typeof media !== "object") return null;
  const providerName = { youtube: "YouTube", vimeo: "Vimeo", spotify: "Spotify", soundcloud: "SoundCloud" }[media.provider];
  if (providerName === undefined || mediaEmbedSource(media.provider, media.href) === null) return null;
  const card = document.createElement("section");
  card.className = "media-card";
  card.dataset.mediaKind = media.kind;
  card.dataset.mediaProvider = media.provider;
  const kind = document.createElement("span");
  kind.className = "kind";
  kind.textContent = media.kind;
  const actions = document.createElement("div");
  actions.className = "media-actions";
  const link = document.createElement("a");
  link.href = media.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open on " + providerName;
  const frame = document.createElement("div");
  frame.className = "media-frame";
  frame.setAttribute("aria-live", "polite");
  const iframe = document.createElement("iframe");
  iframe.src = mediaEmbedSource(media.provider, media.href);
  iframe.title = media.label;
  iframe.loading = "lazy";
  iframe.allow = "encrypted-media; fullscreen; picture-in-picture";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.sandbox = "allow-scripts allow-same-origin allow-presentation";
  frame.append(iframe);
  actions.append(link);
  card.append(kind, actions, frame);
  return card;
}


function appendInline(parent, value) {
  for (const token of parseVibeInline(value)) {
    if (token.type === "link") {
      const anchor = document.createElement("a");
      anchor.href = token.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = token.value;
      parent.append(anchor);
    } else if (token.type === "strong") {
      const strong = document.createElement("strong");
      appendInline(strong, token.value);
      parent.append(strong);
    } else if (token.type === "emphasis") {
      const emphasis = document.createElement("em");
      appendInline(emphasis, token.value);
      parent.append(emphasis);
    } else if (token.type === "code") {
      const code = document.createElement("code");
      code.textContent = token.value;
      parent.append(code);
    } else {
      parent.append(document.createTextNode(token.value));
    }
  }
}

function renderTable(table) {
  const scroll = document.createElement("div");
  scroll.className = "table-scroll";
  scroll.tabIndex = 0;
  scroll.setAttribute("role", "region");
  scroll.setAttribute("aria-label", "Scrollable article table");
  const element = document.createElement("table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  table.headers.forEach((value) => {
    const cell = document.createElement("th");
    appendInline(cell, value);
    headRow.append(cell);
  });
  head.append(headRow);
  element.append(head);
  const body = document.createElement("tbody");
  table.rows.forEach((row) => {
    const bodyRow = document.createElement("tr");
    row.forEach((value) => {
      const cell = document.createElement("td");
      appendInline(cell, value);
      bodyRow.append(cell);
    });
    body.append(bodyRow);
  });
  element.append(body);
  scroll.append(element);
  return scroll;
}

function renderMarkdown(markdown, title = "") {
  const fragment = document.createDocumentFragment();
  for (const part of splitInteractiveBlocks(markdown)) {
    if (part.type !== "interactive") { fragment.append(renderPlainMarkdown(part.value, title)); continue; }
    const section = document.createElement("section");
    section.className = "vibe-interactive";
    const frame = document.createElement("iframe");
    frame.title = part.title;
    frame.setAttribute("sandbox", INTERACTIVE_SANDBOX);
    frame.referrerPolicy = "no-referrer";
    frame.height = String(part.height);
    frame.srcdoc = interactiveDocument(part.html, document.querySelector('meta[name="vibe-interactive-nonce"]')?.content ?? "", true);
    section.append(frame);
    fragment.append(section);
  }
  return fragment;
}

function renderPlainMarkdown(markdown, title = "") {
  const fragment = document.createDocumentFragment();
  for (const block of parseVibeMarkdown(markdown, title)) {
    if (block.type === "table") {
      fragment.append(renderTable(block));
    } else if (block.type === "heading") {
      const element = document.createElement("h" + block.level);
      appendInline(element, block.value);
      fragment.append(element);
    } else if (block.type === "list") {
      const list = document.createElement(block.kind === "ordered" ? "ol" : "ul");
      block.items.forEach((value) => {
        const item = document.createElement("li");
        appendInline(item, value);
        list.append(item);
      });
      fragment.append(list);
    } else if (block.type === "quote") {
      const quote = document.createElement("blockquote");
      appendInline(quote, block.value);
      fragment.append(quote);
    } else if (block.type === "code-block") {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      if (block.language !== "") code.className = "language-" + block.language;
      code.textContent = block.value;
      pre.append(code);
      fragment.append(pre);
    } else if (block.type === "math") {
      const math = document.createElement("div");
      math.className = "math";
      math.setAttribute("role", "math");
      math.textContent = block.value;
      fragment.append(math);
    } else {
      const paragraph = document.createElement("p");
      appendInline(paragraph, block.value);
      fragment.append(paragraph);
    }
  }
  return fragment;
}

function renderSnapshot(value) {
  preview.replaceChildren();
  const article = document.createElement("article");
  article.className = "article";
  const leadVisual = value.visual ?? value.inlineVisuals?.[0] ?? null;
  const galleryVisuals = value.visual === null ? value.inlineVisuals?.slice(1) ?? [] : value.inlineVisuals ?? [];
  const lead = renderVisual(leadVisual);
  if (lead !== "") article.append(lead);
  const copy = document.createElement("div");
  copy.className = "copy";
  const kind = document.createElement("span");
  kind.className = "kind";
  kind.textContent = value.kind;
  const title = document.createElement("h1");
  title.textContent = value.title;
  const body = document.createElement("div");
  body.className = "body";
  body.append(renderMarkdown(value.markdown, value.title));
  copy.append(kind, title, body);
  const media = renderMedia(value.media);
  if (media !== null) copy.append(media);
  if (galleryVisuals.length > 0) {
    const gallery = document.createElement("div");
    gallery.className = "gallery";
    galleryVisuals.forEach((visual) => gallery.append(renderVisual(visual, "inline")));
    copy.append(gallery);
  }
  if (value.contentLink !== null) {
    const source = document.createElement("div");
    source.className = "source";
    source.append("Read the original source: ");
    const link = document.createElement("a");
    link.href = value.contentLink.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = value.contentLink.label;
    source.append(link);
    copy.append(source);
  }
  article.append(copy);
  preview.className = "";
  preview.append(article);
}


async function receiveShareSnapshot(event) {
  if (preview === null || publish === null || status === null) return;
  if (event.source !== window.opener || !ALLOWED_OPENERS.has(event.origin)) return;
  if (event.data?.type !== SNAPSHOT || event.data?.version !== VERSION || typeof event.data?.snapshot !== "object") return;
  window.removeEventListener("message", receiveShareSnapshot);
  status.textContent = "Preparing the private preview…";
  try {
    await preparePreview(event.data.snapshot);
  } catch (error) {
    snapshot = null;
    generatedCover = null;
    publish.disabled = true;
    status.textContent = error instanceof Error ? error.message : "The preview could not be prepared";
  }
}
window.addEventListener("message", receiveShareSnapshot);

if (window.opener !== null) {
  for (const origin of ALLOWED_OPENERS) window.opener.postMessage({ type: READY, version: VERSION }, origin);
} else if (status !== null) {
  status.textContent = "Open Share from a Vibe article to prepare a preview.";
}

publish?.addEventListener("click", async () => {
  if (snapshot === null) return;
  publish.disabled = true;
  status.textContent = "Publishing…";
  const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value ?? "";
  try {
    const response = await fetch("/api/articles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ snapshot, generatedCover, turnstileToken }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Publishing failed");
    const deleteTokens = JSON.parse(localStorage.getItem("vibe-share.delete-tokens.v1") ?? "{}");
    deleteTokens[result.slug] = result.deleteToken;
    localStorage.setItem("vibe-share.delete-tokens.v1", JSON.stringify(deleteTokens));
    status.textContent = "Published. Choose how to share your public link below.";
    publish.textContent = "Published";
    const shareControls = createPublishedShareControls(result.url, snapshot.title);
    publish.after(shareControls);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove public page";
    shareControls.after(remove);
    remove.addEventListener("click", async () => {
      if (!window.confirm("Remove this public article? The link will stop working.")) return;
      remove.disabled = true;
      status.textContent = "Removing…";
      const deletion = await fetch("/api/articles/" + result.slug, { method: "DELETE", headers: { authorization: "Bearer " + result.deleteToken } });
      if (!deletion.ok) {
        status.textContent = "The public page could not be removed.";
        remove.disabled = false;
        return;
      }
      delete deleteTokens[result.slug];
      localStorage.setItem("vibe-share.delete-tokens.v1", JSON.stringify(deleteTokens));
      status.textContent = "Public page removed. Your local Vibe article is unchanged.";
      shareControls.remove();
      remove.remove();
    });
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Publishing failed";
    publish.disabled = false;
  }
});`;

const bundledIllustrations = Object.fromEntries(EDITORIAL_ILLUSTRATIONS.map((drawing) => [drawing.illustrationId, {
  kind: "illustration", illustrationId: drawing.illustrationId,
  sourceUrl: drawing.href, alt: drawing.alt, credit: drawing.label,
}]));
export const APP_JS = `${mediaEmbedSource.toString()}\n\n${vibeInteractiveRuntimeSource()}\n\n${vibeMarkdownRuntimeSource()}\n\n${storyCoverRuntimeSource()}\n\nconst BUNDLED_ILLUSTRATIONS = ${JSON.stringify(bundledIllustrations)};\n\n${APP_BODY}`;


/** The HTML must never reuse a cached client from a different build. */
export function browserAssetPath(source) {
  let hash = 2166136261;
  for (const character of source) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `/app.js?v=${source.length.toString(16)}-${(hash >>> 0).toString(16)}`;
}
export const APP_SCRIPT_PATH = browserAssetPath(APP_JS);
