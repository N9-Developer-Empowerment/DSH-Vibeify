export const APP_JS = String.raw`const VERSION = 1;
const READY = "vibe-share:ready";
const SNAPSHOT = "vibe-share:snapshot";
const ALLOWED_OPENERS = new Set(["http://127.0.0.1:3080", "http://localhost:3080"]);
const preview = document.getElementById("preview");
const publish = document.getElementById("publish");
const status = document.getElementById("status");
let snapshot = null;

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
  const text = String(value ?? "").replace(/!\[[^\]\n]*\]\([^\s)]+\)/g, "");
  const pattern = /(\[[^\]\n]{1,240}\]\(https:\/\/[^\s)]+\)|\*\*[^*\n]{1,300}\*\*|\*[^*\n]{1,300}\*)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) parent.append(document.createTextNode(text.slice(cursor, match.index)));
    const token = match[0];
    const link = /^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/.exec(token);
    if (link !== null) {
      const anchor = document.createElement("a");
      anchor.href = link[2];
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = link[1];
      parent.append(anchor);
    } else {
      const strong = token.startsWith("**");
      const emphasis = document.createElement(strong ? "strong" : "em");
      emphasis.textContent = token.slice(strong ? 2 : 1, strong ? -2 : -1);
      parent.append(emphasis);
    }
    cursor = match.index + token.length;
  }
  if (cursor < text.length) parent.append(document.createTextNode(text.slice(cursor)));
}

function tableCells(line) {
  const value = String(line ?? "").trim();
  if (!value.startsWith("|") || !value.endsWith("|")) return null;
  const cells = value.slice(1, -1).split("|").map((cell) => cell.trim());
  return cells.length >= 2 && cells.every((cell) => cell.length > 0) ? cells : null;
}

function markdownTableAt(lines, startIndex) {
  const headers = tableCells(lines[startIndex]);
  const alignment = tableCells(lines[startIndex + 1]);
  if (headers === null || alignment === null || headers.length !== alignment.length) return null;
  if (!alignment.every((cell) => /^:?-{3,}:?$/.test(cell))) return null;
  const rows = [];
  let nextIndex = startIndex + 2;
  while (nextIndex < lines.length) {
    const cells = tableCells(lines[nextIndex]);
    if (cells === null || cells.length !== headers.length) break;
    rows.push(cells);
    nextIndex += 1;
  }
  return { headers, rows, nextIndex };
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

function renderMarkdown(markdown) {
  const fragment = document.createDocumentFragment();
  const lines = String(markdown ?? "").split(/\r?\n/);
  let paragraph = [];
  let list = null;
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const element = document.createElement("p");
    appendInline(element, paragraph.join(" "));
    if (element.textContent.trim() !== "") fragment.append(element);
    paragraph = [];
  };
  const flushList = () => { if (list !== null) { fragment.append(list); list = null; } };
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trim();
    if (line === "") { flushParagraph(); flushList(); continue; }
    const table = markdownTableAt(lines, index);
    if (table !== null) {
      flushParagraph(); flushList();
      fragment.append(renderTable(table));
      index = table.nextIndex - 1;
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading !== null) {
      flushParagraph(); flushList();
      const element = document.createElement("h" + Math.min(3, heading[1].length + 1));
      appendInline(element, heading[2]);
      fragment.append(element);
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (bullet !== null || ordered !== null) {
      flushParagraph();
      const kind = bullet !== null ? "UL" : "OL";
      if (list !== null && list.tagName !== kind) flushList();
      list ??= document.createElement(kind.toLowerCase());
      const item = document.createElement("li");
      appendInline(item, (bullet ?? ordered)[1]);
      list.append(item);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph(); flushList();
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
  body.append(renderMarkdown(value.markdown));
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

window.addEventListener("message", (event) => {
  if (preview === null || publish === null || status === null) return;
  if (event.source !== window.opener || !ALLOWED_OPENERS.has(event.origin)) return;
  if (event.data?.type !== SNAPSHOT || event.data?.version !== VERSION || typeof event.data?.snapshot !== "object") return;
  snapshot = event.data.snapshot;
  renderSnapshot(snapshot);
  publish.disabled = false;
  status.textContent = "Private preview ready. Check it before publishing.";
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
      body: JSON.stringify({ snapshot, turnstileToken }),
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
