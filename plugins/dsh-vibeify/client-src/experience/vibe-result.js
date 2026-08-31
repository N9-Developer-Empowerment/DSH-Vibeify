import {
  markdownTableAt as sharedMarkdownTableAt,
  parseVibeInline,
  parseVibeMarkdown,
  stripDuplicatedLeadTitle as sharedStripDuplicatedLeadTitle,
} from "../../../../shared/vibe-markdown.js";
import { validQuestionnaireMarkdown } from "./questionnaire.js";

const TAB_ID = "dsh-vibeify-vibe-tab";
const TAB_STYLE_ID = "dsh-vibeify-vibe-tab-style";
const MARKDOWN_SELECTOR = 'div[class*="_markdown_"]';
const CHUNK_PATTERN = /<vibe-chunk\s+id="([a-z0-9][a-z0-9_-]{0,63})"\s+kind="(article|editorial|recommendation|image|music|video|questionnaire)"\s+title="([^"]{1,180})"\s*>([\s\S]*?)<\/vibe-chunk>/gi;
const LEGACY_SECTION_PATTERN = /<vibe-section\s+id=["']([a-z0-9][a-z0-9_-]*)["']\s*>([\s\S]*?)<\/vibe-section>/gi;

export const VIBE_HOME_EVENT = "dsh-vibeify:vibe-home";
export const VIBE_CHAT_EVENT = "dsh-vibeify:vibe-chat";
export const VIBE_CHAT_RESULT_EVENT = "dsh-vibeify:chat-result";
export const VIBE_STREAM_CHUNKS_EVENT = "dsh-vibeify:stream-chunks";
export const VIBE_STREAM_STATUS_EVENT = "dsh-vibeify:stream-status";

export function extractPublishedChunks(value) {
  const text = typeof value === "string" ? value : "";
  const chunks = [];
  const seen = new Set();
  CHUNK_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(CHUNK_PATTERN)) {
    const markdown = match[4].trim();
    if (markdown.length === 0 || seen.has(match[1]) || (match[2] === "questionnaire" && !validQuestionnaireMarkdown(markdown))) continue;
    seen.add(match[1]);
    chunks.push({ id: match[1], kind: match[2], title: match[3].trim(), markdown });
  }
  LEGACY_SECTION_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(LEGACY_SECTION_PATTERN)) {
    const markdown = match[2].trim();
    if (markdown.length === 0 || seen.has(match[1])) continue;
    seen.add(match[1]);
    const title = markdown.match(/^#{1,3}\s+(.+)$/m)?.[1]?.trim() ?? "A new page in the edition";
    chunks.push({ id: match[1], kind: "article", title, markdown });
  }
  return chunks;
}

export function namespaceStreamChunks(runId, chunks, publishedAt = Date.now()) {
  if (typeof runId !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(runId) || !Array.isArray(chunks)) return Object.freeze([]);
  return Object.freeze(chunks.map((chunk) => Object.freeze({
    id: `${runId}:${chunk.id}`.slice(0, 96),
    kind: chunk.kind,
    source: "fresh-stream",
    title: chunk.title,
    markdown: chunk.markdown,
    topicId: null,
    publishedAt,
  })));
}

export function chunkBelongsToPublication(runId, chunkId) {
  if (typeof chunkId !== "string") return false;
  if (runId === null) return chunkId.startsWith("chat-");
  return typeof runId === "string" && chunkId.startsWith(`${runId}-`);
}

function inlineMarkdown(node) {
  if (node?.nodeType === 3) return node.textContent ?? "";
  if (node?.nodeType !== 1) return "";
  const tag = String(node.tagName ?? "").toLowerCase();
  const inner = [...(node.childNodes ?? [])].map(inlineMarkdown).join("");
  if (tag === "a") {
    const href = node.getAttribute?.("href") ?? "";
    return /^https?:\/\/[^\s]+$/i.test(href) ? `[${inner}](${href})` : inner;
  }
  if (tag === "strong" || tag === "b") return `**${inner}**`;
  if (tag === "em" || tag === "i") return `*${inner}*`;
  if (tag === "code") return `\`${inner}\``;
  if (tag === "br") return "\n";
  return inner;
}

function blockMarkdown(node) {
  if (node?.nodeType === 3) return node.textContent ?? "";
  if (node?.nodeType !== 1) return "";
  const tag = String(node.tagName ?? "").toLowerCase();
  if (/^h[1-3]$/.test(tag)) return `${"#".repeat(Number(tag[1]))} ${inlineMarkdown(node).trim()}\n\n`;
  if (tag === "p") return `${inlineMarkdown(node).trim()}\n\n`;
  if (tag === "ul" || tag === "ol") {
    const ordered = tag === "ol";
    const items = [...(node.childNodes ?? [])].filter((child) => String(child.tagName ?? "").toLowerCase() === "li");
    return `${items.map((item, index) => `${ordered ? `${index + 1}.` : "-"} ${inlineMarkdown(item).trim()}`).join("\n")}\n\n`;
  }
  if (tag === "blockquote") {
    return `${inlineMarkdown(node).split("\n").map((line) => `> ${line}`).join("\n")}\n\n`;
  }
  if (tag === "table") {
    const rows = [...(node.querySelectorAll?.("tr") ?? [])].map((row) =>
      [...row.querySelectorAll("th,td")].map((cell) => inlineMarkdown(cell).replace(/\s+/g, " ").trim()).filter(Boolean)
    ).filter((cells) => cells.length > 0);
    if (rows.length === 0) return "";
    return `${rows.map((cells, index) => index === 0 ? `**${cells.join(" · ")}**` : `- ${cells.join(" — ")}`).join("\n")}\n\n`;
  }
  if (tag === "pre") return `\`\`\`\n${node.textContent ?? ""}\n\`\`\`\n\n`;
  return [...(node.childNodes ?? [])].map(blockMarkdown).join("");
}

/** Rebuilds safe Markdown from DSH's already-rendered assistant answer without retaining the user prompt. */
export function renderedAnswerToMarkdown(source) {
  if (source === null || source === undefined) return "";
  return blockMarkdown(source)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+(?=\S)/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The card chrome owns the title; an identical first heading is redundant. */
export function stripDuplicatedLeadTitle(markdown, title) {
  return sharedStripDuplicatedLeadTitle(markdown, title);
}

export function createChatResultChunk(source, publishedAt = Date.now()) {
  if (!Number.isFinite(publishedAt) || publishedAt <= 0) return null;
  const markdown = renderedAnswerToMarkdown(source);
  if (markdown.length === 0 || markdown.length > 16_000) return null;
  const titleNode = source?.querySelector?.("h1,h2,h3") ?? source?.querySelector?.("strong");
  const rawTitle = titleNode?.textContent?.replace(/\s+/g, " ").trim() || "From Chat";
  const title = `${rawTitle.charAt(0).toUpperCase()}${rawTitle.slice(1)}`.slice(0, 180);
  const body = stripDuplicatedLeadTitle(markdown, title);
  if (body.length === 0) return null;
  const recommendation = (source?.querySelectorAll?.("a")?.length ?? 0) > 0
    || (source?.querySelectorAll?.("li")?.length ?? 0) > 1;
  return Object.freeze({
    id: `chat-result-${publishedAt.toString(36)}`,
    kind: recommendation ? "recommendation" : "article",
    source: "chat-directed",
    title,
    markdown: body,
    topicId: null,
    publishedAt,
  });
}

export function isNativeResultTabList(tabList) {
  if (tabList === null || typeof tabList?.querySelectorAll !== "function") return false;
  const tabs = [...tabList.querySelectorAll('[role="tab"]')].filter((tab) =>
    tab.parentElement === undefined || tab.parentElement === tabList
  );
  const labels = tabs.map((tab) => tab.textContent?.trim());
  return labels.includes("Chat") && labels.includes("Trajectory");
}

function appendInline(container, value) {
  for (const token of parseVibeInline(value)) {
    if (token.type === "link") {
      const link = document.createElement("a");
      link.href = token.href;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = token.value;
      container.append(link);
    } else if (token.type === "strong") {
      const strong = document.createElement("strong");
      strong.textContent = token.value;
      container.append(strong);
    } else if (token.type === "emphasis") {
      const emphasis = document.createElement("em");
      emphasis.textContent = token.value;
      container.append(emphasis);
    } else if (token.type === "code") {
      const code = document.createElement("code");
      code.textContent = token.value;
      container.append(code);
    } else {
      container.append(document.createTextNode(token.value));
    }
  }
}

export function markdownTableAt(lines, startIndex) {
  return sharedMarkdownTableAt(lines, startIndex);
}

export function markdownHasTable(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  return lines.some((_line, index) => markdownTableAt(lines, index) !== null);
}

function renderTable(table) {
  const scroll = document.createElement("div");
  scroll.className = "vfx-table-scroll";
  scroll.tabIndex = 0;
  scroll.setAttribute("role", "region");
  scroll.setAttribute("aria-label", "Scrollable article table");
  const element = document.createElement("table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const value of table.headers) {
    const cell = document.createElement("th");
    appendInline(cell, value);
    headRow.append(cell);
  }
  head.append(headRow);
  element.append(head);
  const body = document.createElement("tbody");
  for (const row of table.rows) {
    const bodyRow = document.createElement("tr");
    for (const value of row) {
      const cell = document.createElement("td");
      appendInline(cell, value);
      bodyRow.append(cell);
    }
    body.append(bodyRow);
  }
  element.append(body);
  scroll.append(element);
  return scroll;
}

export function markdownFragment(markdown, title = "") {
  const fragment = document.createDocumentFragment();
  for (const block of parseVibeMarkdown(markdown, title)) {
    if (block.type === "table") {
      fragment.append(renderTable(block));
    } else if (block.type === "heading") {
      const element = document.createElement(`h${block.level}`);
      appendInline(element, block.value);
      fragment.append(element);
    } else if (block.type === "list") {
      const list = document.createElement(block.kind === "ordered" ? "ol" : "ul");
      for (const value of block.items) {
        const item = document.createElement("li");
        appendInline(item, value);
        list.append(item);
      }
      fragment.append(list);
    } else if (block.type === "quote") {
      const quote = document.createElement("blockquote");
      appendInline(quote, block.value);
      fragment.append(quote);
    } else if (block.type === "code-block") {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      if (block.language !== "") code.className = `language-${block.language}`;
      code.textContent = block.value;
      pre.append(code);
      fragment.append(pre);
    } else if (block.type === "math") {
      const math = document.createElement("div");
      math.className = "vfx-math";
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

function nativeTabList() {
  for (const tab of document.querySelectorAll('[role="tab"]')) {
    if (tab.textContent?.trim() === "Chat" && isNativeResultTabList(tab.parentElement)) return tab.parentElement;
  }
  return null;
}

function answerNodes() {
  return [...document.querySelectorAll(MARKDOWN_SELECTOR)].filter((node) => node.closest('[data-variant="think"]') === null);
}

function hasCopyControl(root) {
  return [...root.querySelectorAll("button")].some((button) => {
    const text = button.textContent?.trim();
    const label = button.getAttribute?.("aria-label")?.trim();
    return text === "Copy" || label === "Copy";
  });
}

function currentHostTurnTail(source) {
  const assistantRow = source.closest?.('[data-chat-flow-kind="assistant-step"]');
  if (typeof HTMLElement === "undefined" || !(assistantRow instanceof HTMLElement)) return undefined;
  for (let row = assistantRow.nextElementSibling; row !== null; row = row.nextElementSibling) {
    const kind = row.getAttribute?.("data-chat-flow-kind");
    if (kind === "assistant-step" || kind === "user" || kind === "steering") return null;
    if (kind === "turn-tail") return row;
  }
  return null;
}

export function completedAnswer(source) {
  const turnTail = currentHostTurnTail(source);
  if (turnTail !== undefined) return turnTail !== null && hasCopyControl(turnTail);
  let root = source;
  for (let depth = 0; depth < 5 && root !== null; depth += 1, root = root.parentElement) {
    if (hasCopyControl(root)) return true;
  }
  return false;
}

/**
 * Close progress disclosure once, but only when Vibeify opened it and the host
 * has attached the settled turn tail. A later reader click remains sovereign.
 */
export function collapseCompletedThinking(row) {
  if (row?.dataset?.codexProgressOpened !== "true" || row.dataset.codexProgressAutoCollapsed === "true") return false;
  if (!completedAnswer(row)) return false;
  const toggle = row.querySelector?.('[role="button"][aria-expanded="true"], button[aria-expanded="true"]');
  if (typeof HTMLElement !== "undefined" && !(toggle instanceof HTMLElement)) return false;
  if (toggle === null || typeof toggle?.click !== "function") return false;
  row.dataset.codexProgressAutoCollapsed = "true";
  toggle.click();
  return true;
}

export function isAssistantAnswer(source) {
  const flowRow = source.closest?.("[data-chat-flow-kind]");
  if (typeof HTMLElement !== "undefined" && flowRow instanceof HTMLElement) {
    return flowRow.getAttribute("data-chat-flow-kind") === "assistant-step";
  }
  let root = source;
  for (let depth = 0; depth < 7 && root !== null; depth += 1, root = root.parentElement) {
    for (const attribute of ["data-role", "data-message-role", "data-author", "data-source"]) {
      const value = root.getAttribute?.(attribute)?.toLowerCase?.();
      if (value === "user" || value === "human") return false;
      if (value === "assistant" || value === "model") return true;
    }
  }
  // Current DSH marks a settled assistant row with its Copy action. Explicit
  // role attributes take precedence when upstream exposes them.
  return completedAnswer(source);
}

function removeLegacyChatPresentation() {
  document.getElementById("dsh-vibeify-output-style")?.remove();
  for (const node of document.querySelectorAll(".vibeify-output")) {
    node.querySelector(".vibeify-output-chrome")?.remove();
    node.querySelector(".vibeify-output-actions")?.remove();
    node.classList.remove("vibeify-output");
    node.style.removeProperty("--vibe-output-accent");
    delete node.dataset.vibeOutput;
    delete node.dataset.vibeTone;
    delete node.dataset.vibeView;
  }
}

function installVibeTabStyle() {
  if (document.head === undefined || typeof document.createElement !== "function") return () => {};
  const style = document.createElement("style");
  style.id = TAB_STYLE_ID;
  style.textContent = `
#${TAB_ID} {
  position:relative!important;
  min-height:40px!important;
  margin:0 6px!important;
  padding:0 13px!important;
  display:inline-flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:8px!important;
  white-space:nowrap!important;
  line-height:1!important;
  color:var(--dsw-alias-label-primary)!important;
  border:0!important;
  border-radius:8px 8px 0 0!important;
  background:transparent!important;
  font-size:14px!important;
  font-weight:720!important;
  letter-spacing:.045em!important;
  opacity:1!important;
}
#${TAB_ID}::before { content:""; width:6px; height:6px; flex:none; border-radius:1px; background:var(--dsw-alias-state-business-primary,#c0182a); transform:rotate(45deg); }
#${TAB_ID}::after { content:""; position:absolute; left:12px; right:12px; bottom:-1px; height:2px; border-radius:2px 2px 0 0; background:var(--dsw-alias-state-business-primary,#c0182a); transform:scaleX(0); transform-origin:center; transition:transform .16s ease; }
#${TAB_ID}:hover { color:var(--dsw-alias-label-primary)!important; background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#c0182a) 7%,transparent)!important; }
#${TAB_ID}[data-vibe-active="true"] { color:var(--dsw-alias-label-primary)!important; background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--dsw-alias-state-business-primary,#c0182a) 8%,transparent))!important; }
#${TAB_ID}[data-vibe-active="true"]::after { transform:scaleX(1); }
@media (max-width:560px) { #${TAB_ID} { margin:0 2px!important; padding:0 9px!important; font-size:13px!important; } }
`;
  document.getElementById(TAB_STYLE_ID)?.remove();
  document.head.appendChild(style);
  return () => style.remove();
}

/** Keeps the Vibe return tab attached; completed content is projected from durable local histories. */
export function installVibeStreamBridge(ctx) {
  ctx.effect(() => {
    let frame = null;
    let disposed = false;
    let vibeActive = false;
    const removeTabStyle = installVibeTabStyle();

    const ensureVibeTab = () => {
      const tabList = nativeTabList();
      if (!(tabList instanceof HTMLElement)) return;
      const existing = tabList.querySelector(`#${TAB_ID}`);
      if (existing instanceof HTMLButtonElement) {
        existing.dataset.vibeActive = String(vibeActive);
        existing.setAttribute("aria-selected", String(vibeActive));
        return;
      }
      const trajectory = [...tabList.querySelectorAll('[role="tab"]')].find((tab) => tab.textContent?.trim() === "Trajectory");
      if (!(trajectory instanceof HTMLButtonElement)) return;
      const vibeTab = trajectory.cloneNode(false);
      vibeTab.id = TAB_ID;
      vibeTab.type = "button";
      vibeTab.textContent = "VIBE";
      vibeTab.setAttribute("aria-label", "Open the Vibe magazine");
      vibeTab.setAttribute("role", "tab");
      vibeTab.setAttribute("aria-selected", "false");
      vibeTab.tabIndex = -1;
      vibeTab.addEventListener("click", () => {
        vibeActive = true;
        vibeTab.dataset.vibeActive = "true";
        vibeTab.setAttribute("aria-selected", "true");
        window.dispatchEvent(new CustomEvent(VIBE_HOME_EVENT));
      });
      vibeTab.dataset.vibeActive = String(vibeActive);
      trajectory.insertAdjacentElement("afterend", vibeTab);
    };

    const refresh = () => {
      frame = null;
      if (disposed) return;
      removeLegacyChatPresentation();
      ensureVibeTab();
    };

    const schedule = () => {
      if (disposed || frame !== null) return;
      frame = requestAnimationFrame(refresh);
    };

    const observer = new MutationObserver(schedule);
    const onChat = () => {
      vibeActive = false;
      const tab = document.getElementById(TAB_ID);
      if (tab instanceof HTMLButtonElement) {
        tab.dataset.vibeActive = "false";
        tab.setAttribute("aria-selected", "false");
      }
    };
    window.addEventListener(VIBE_CHAT_EVENT, onChat);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    removeLegacyChatPresentation();
    schedule();

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener(VIBE_CHAT_EVENT, onChat);
      if (frame !== null) cancelAnimationFrame(frame);
      document.getElementById(TAB_ID)?.remove();
      removeTabStyle();
    };
  }, "dsh-vibeify: Vibe return tab bridge");
}

export const installVibeResultSurface = installVibeStreamBridge;
