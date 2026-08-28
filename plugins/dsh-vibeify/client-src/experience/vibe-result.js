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
    if (markdown.length === 0 || seen.has(match[1])) continue;
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

export function createChatResultChunk(source, publishedAt = Date.now()) {
  if (!Number.isFinite(publishedAt) || publishedAt <= 0) return null;
  const markdown = renderedAnswerToMarkdown(source);
  if (markdown.length === 0 || markdown.length > 16_000) return null;
  const titleNode = source?.querySelector?.("h1,h2,h3") ?? source?.querySelector?.("strong");
  const rawTitle = titleNode?.textContent?.replace(/\s+/g, " ").trim() || "From Chat";
  const title = `${rawTitle.charAt(0).toUpperCase()}${rawTitle.slice(1)}`.slice(0, 180);
  const recommendation = (source?.querySelectorAll?.("a")?.length ?? 0) > 0
    || (source?.querySelectorAll?.("li")?.length ?? 0) > 1;
  return Object.freeze({
    id: `chat-result-${publishedAt.toString(36)}`,
    kind: recommendation ? "recommendation" : "article",
    source: "chat-directed",
    title,
    markdown,
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
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > cursor) container.append(document.createTextNode(value.slice(cursor, match.index)));
    if (match[2] !== undefined) {
      const link = document.createElement("a");
      link.href = match[3];
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = match[2];
      container.append(link);
    } else if (match[4] !== undefined) {
      const strong = document.createElement("strong");
      strong.textContent = match[4];
      container.append(strong);
    } else {
      const code = document.createElement("code");
      code.textContent = match[5];
      container.append(code);
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) container.append(document.createTextNode(value.slice(cursor)));
}

export function markdownFragment(markdown) {
  const fragment = document.createDocumentFragment();
  const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  let index = 0;
  const special = (line) => /^#{1,3}\s|^>\s?|^[-*]\s+|^\d+\.\s+/.test(line);
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim().length === 0) { index += 1; continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading !== null) {
      const element = document.createElement(`h${heading[1].length}`);
      appendInline(element, heading[2]);
      fragment.append(element);
      index += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const list = document.createElement(ordered ? "ol" : "ul");
      const itemPattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/;
      while (index < lines.length) {
        const item = lines[index].match(itemPattern);
        if (item === null) break;
        const child = document.createElement("li");
        appendInline(child, item[1]);
        list.append(child);
        index += 1;
      }
      fragment.append(list);
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote = document.createElement("blockquote");
      const parts = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        parts.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      appendInline(quote, parts.join(" "));
      fragment.append(quote);
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim().length > 0 && !special(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    const element = document.createElement("p");
    appendInline(element, paragraph.join(" "));
    fragment.append(element);
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
  min-height:34px!important;
  margin-inline:7px!important;
  padding-inline:14px!important;
  gap:7px!important;
  color:var(--dsw-alias-label-primary)!important;
  border:1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary,#c0182a) 45%,transparent)!important;
  border-radius:999px!important;
  background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#c0182a) 10%,transparent)!important;
  font-weight:780!important;
}
#${TAB_ID}::before { content:"✦"; color:var(--dsw-alias-state-business-primary,#c0182a); font-size:11px; }
#${TAB_ID}::after { content:"MAGAZINE"; color:var(--dsw-alias-label-tertiary); font-size:8px; font-weight:800; letter-spacing:.12em; }
#${TAB_ID}:hover { background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#c0182a) 17%,transparent)!important; }
@media (max-width:640px) { #${TAB_ID}::after { display:none; } }
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
    const removeTabStyle = installVibeTabStyle();

    const ensureVibeTab = () => {
      const tabList = nativeTabList();
      if (!(tabList instanceof HTMLElement)) return;
      if (tabList.querySelector(`#${TAB_ID}`) instanceof HTMLButtonElement) return;
      const trajectory = [...tabList.querySelectorAll('[role="tab"]')].find((tab) => tab.textContent?.trim() === "Trajectory");
      if (!(trajectory instanceof HTMLButtonElement)) return;
      const vibeTab = trajectory.cloneNode(false);
      vibeTab.id = TAB_ID;
      vibeTab.type = "button";
      vibeTab.textContent = "Vibe";
      vibeTab.setAttribute("aria-label", "Open the Vibe magazine");
      vibeTab.setAttribute("role", "tab");
      vibeTab.setAttribute("aria-selected", "false");
      vibeTab.tabIndex = -1;
      vibeTab.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent(VIBE_HOME_EVENT));
      });
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
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    removeLegacyChatPresentation();
    schedule();

    return () => {
      disposed = true;
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      document.getElementById(TAB_ID)?.remove();
      removeTabStyle();
    };
  }, "dsh-vibeify: Vibe return tab bridge");
}

export const installVibeResultSurface = installVibeStreamBridge;
