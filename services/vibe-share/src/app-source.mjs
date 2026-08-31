import { vibeMarkdownRuntimeSource } from "../../../shared/vibe-markdown.js";

const APP_BODY = String.raw`const VERSION = 1;
const READY = "vibe-share:ready";
const SNAPSHOT = "vibe-share:snapshot";
const ALLOWED_OPENERS = new Set(["http://127.0.0.1:3080", "http://localhost:3080"]);
const preview = document.getElementById("preview");
const publish = document.getElementById("publish");
const status = document.getElementById("status");
let snapshot = null;
let generatedCover = null;

const VISUAL_PRIORITY = Object.freeze({ photograph: 0, "editorial-image": 1, "ai-generated": 2, "ai-graphic": 3, typography: 4 });

function articleVisuals(value) {
  const rows = [value.visual, ...(value.inlineVisuals ?? [])].filter((row) => row !== null && typeof row?.imageUrl === "string");
  return rows.map((visual, index) => ({ visual, index }))
    .sort((left, right) => (VISUAL_PRIORITY[left.visual.kind] ?? 9) - (VISUAL_PRIORITY[right.visual.kind] ?? 9) || left.index - right.index)
    .map(({ visual }) => visual);
}

function wrapCoverText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  let line = "";
  let lineIndex = 0;
  for (const word of words) {
    const candidate = line === "" ? word : line + " " + word;
    if (context.measureText(candidate).width <= maxWidth || line === "") {
      line = candidate;
      continue;
    }
    context.fillText(line, x, y + lineIndex * lineHeight);
    lineIndex += 1;
    if (lineIndex >= maxLines) return;
    line = word;
  }
  if (line !== "" && lineIndex < maxLines) context.fillText(line, x, y + lineIndex * lineHeight);
}

function createTypographicCover(value) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  const excerpt = String(value.markdown ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const seed = [...String(value.title ?? "Vibe") + ":" + excerpt].reduce((sum, character) => {
    const mixed = (sum ^ character.codePointAt(0)) >>> 0;
    return Math.imul(mixed, 16777619) >>> 0;
  }, 2166136261);
  const hue = seed % 360;
  const gradient = context.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, "hsl(" + hue + " 42% 13%)");
  gradient.addColorStop(1, "hsl(" + ((hue + 54) % 360) + " 48% 22%)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1200, 630);
  context.globalAlpha = 0.22;
  context.strokeStyle = "hsl(" + ((hue + 142) % 360) + " 82% 76%)";
  context.lineWidth = 3;
  for (let index = 0; index < 5; index += 1) {
    context.beginPath();
    context.arc(1040 - index * 43, 80 + index * 92, 105 + index * 24, 0, Math.PI * 2);
    context.stroke();
  }
  context.globalAlpha = 1;
  context.fillStyle = "hsl(" + ((hue + 145) % 360) + " 88% 78%)";
  context.font = "800 25px system-ui, sans-serif";
  context.letterSpacing = "5px";
  context.fillText("VIBE · ONE ARTICLE", 72, 74);
  context.letterSpacing = "0px";
  context.fillStyle = "#fffafc";
  context.font = "500 68px Georgia, serif";
  wrapCoverText(context, value.title, 72, 176, 940, 78, 4);
  context.fillStyle = "#d7cbd2";
  context.font = "400 27px system-ui, sans-serif";
  wrapCoverText(context, excerpt, 74, 515, 980, 36, 2);
  return canvas.toDataURL("image/jpeg", 0.9);
}

async function prepareUniquePreview(value) {
  generatedCover = createTypographicCover(value);
  const visuals = articleVisuals(value);
  const response = await fetch("/api/visuals/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imageUrls: visuals.map((visual) => visual.imageUrl) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "The public-image check is unavailable");
  const used = new Set(result.used ?? []);
  const fresh = visuals.filter((visual) => !used.has(visual.imageUrl));
  if (fresh.length > 0) {
    snapshot = { ...value, visual: fresh[0], inlineVisuals: fresh.slice(1, 4) };
  } else {
    snapshot = {
      ...value,
      visual: {
        imageUrl: generatedCover,
        sourceUrl: "https://dsh-vibeify.ezzye.chatgpt.site/",
        alt: "Unique editorial typographic cover for " + value.title,
        credit: "Editorial typography · created uniquely for this article",
        kind: "typography",
      },
      inlineVisuals: [],
    };
  }
  renderSnapshot(snapshot);
  publish.disabled = false;
  status.textContent = fresh.length > 0
    ? "Private preview ready. This public image has not been used before."
    : "Private preview ready. This public cover is unique to the article.";
}

async function copyPublicLink(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = value;
    fallback.readOnly = true;
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.append(fallback);
    fallback.select();
    const copied = document.execCommand("copy");
    fallback.remove();
    return copied;
  }
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

function mediaEmbedSource(provider, href) {
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (provider === "youtube" && (host === "youtube.com" || host === "youtu.be")) {
      const id = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] : url.searchParams.get("v");
      return /^[a-zA-Z0-9_-]{6,16}$/.test(id ?? "") ? "https://www.youtube-nocookie.com/embed/" + id : null;
    }
    if (provider === "vimeo" && host === "vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return /^\d{4,14}$/.test(id ?? "") ? "https://player.vimeo.com/video/" + id : null;
    }
    if (provider === "spotify" && host === "open.spotify.com" && /^\/(track|album|episode|show|playlist)\/[a-zA-Z0-9]+\/?$/.test(url.pathname)) {
      return "https://open.spotify.com/embed" + url.pathname.replace(/\/$/, "");
    }
    if (provider === "soundcloud" && host === "soundcloud.com" && url.pathname.split("/").filter(Boolean).length >= 2) {
      return "https://w.soundcloud.com/player/?url=" + encodeURIComponent(url.href) + "&auto_play=false";
    }
  } catch {}
  return null;
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
  kind.textContent = media.kind + " · click to load";
  const actions = document.createElement("div");
  actions.className = "media-actions";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "media-load";
  button.dataset.mediaProvider = media.provider;
  button.dataset.mediaHref = media.href;
  button.textContent = media.label;
  const link = document.createElement("a");
  link.href = media.href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open on " + providerName;
  const frame = document.createElement("div");
  frame.className = "media-frame";
  frame.setAttribute("aria-live", "polite");
  actions.append(button, link);
  card.append(kind, actions, frame);
  return card;
}

function installMediaPlayers(root = document) {
  root.querySelectorAll("[data-media-provider]").forEach((button) => {
    if (button.dataset.mediaReady === "true") return;
    button.dataset.mediaReady = "true";
    button.addEventListener("click", () => {
      const source = mediaEmbedSource(button.dataset.mediaProvider, button.dataset.mediaHref);
      const frame = button.closest(".media-card")?.querySelector(".media-frame");
      if (source === null || frame === null) return;
      const iframe = document.createElement("iframe");
      iframe.src = source;
      iframe.title = button.textContent;
      iframe.loading = "lazy";
      iframe.allow = "encrypted-media; fullscreen; picture-in-picture";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.sandbox = "allow-scripts allow-same-origin allow-presentation";
      frame.replaceChildren(iframe);
      button.disabled = true;
      button.textContent = "Loaded";
    }, { once: true });
  });
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
      strong.textContent = token.value;
      parent.append(strong);
    } else if (token.type === "emphasis") {
      const emphasis = document.createElement("em");
      emphasis.textContent = token.value;
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
  installMediaPlayers(article);
}

installMediaPlayers(document);

window.addEventListener("message", async (event) => {
  if (preview === null || publish === null || status === null) return;
  if (event.source !== window.opener || !ALLOWED_OPENERS.has(event.origin)) return;
  if (event.data?.type !== SNAPSHOT || event.data?.version !== VERSION || typeof event.data?.snapshot !== "object") return;
  status.textContent = "Checking the public image…";
  try {
    await prepareUniquePreview(event.data.snapshot);
  } catch (error) {
    snapshot = null;
    generatedCover = null;
    publish.disabled = true;
    status.textContent = error instanceof Error ? error.message : "The public-image check failed";
  }
}, { once: true });

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
    const copied = await copyPublicLink(result.url);
    status.replaceChildren(copied ? "Published. Copied to clipboard: " : "Published. Copy this link: ");
    const link = document.createElement("a");
    link.href = result.url;
    link.textContent = result.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    status.append(link);
    publish.textContent = "Published";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy link";
    publish.after(copy);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove public page";
    copy.after(remove);
    copy.addEventListener("click", async () => {
      const copiedAgain = await copyPublicLink(result.url);
      status.replaceChildren(copiedAgain ? "Copied to clipboard: " : "Copy this link: ", link.cloneNode(true));
    });
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
      copy.remove();
      remove.remove();
    });
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Publishing failed";
    publish.disabled = false;
  }
});`;

export const APP_JS = `${vibeMarkdownRuntimeSource()}\n\n${APP_BODY}`;
