import { faviconPath } from "./favicon.mjs";
import { renderPublicationMasthead } from "../../../shared/publication-masthead.js";
import { cleanArticleAppearance } from "../../../shared/article-appearance.js";
import { mediaEmbedSource } from "./media.mjs";
import { APP_SCRIPT_PATH } from "./app-source.mjs";
import { SHARE_STYLES } from "./styles.mjs";
import { splitInteractiveBlocks, interactiveMarkup } from "../../../shared/vibe-interactive.js";
import { parseVibeInline, parseVibeMarkdown } from "../../../shared/vibe-markdown.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function inlineMarkup(value) {
  return parseVibeInline(value).map((token) => {
    if (token.type === "link") return `<a href="${escapeHtml(token.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(token.value)}</a>`;
    if (token.type === "strong") return `<strong>${inlineMarkup(token.value)}</strong>`;
    if (token.type === "emphasis") return `<em>${inlineMarkup(token.value)}</em>`;
    if (token.type === "code") return `<code>${escapeHtml(token.value)}</code>`;
    return escapeHtml(token.value);
  }).join("");
}

function tableHtml(table) {
  const head = `<thead><tr>${table.headers.map((cell) => `<th>${inlineMarkup(cell)}</th>`).join("")}</tr></thead>`;
  const body = `<tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkup(cell)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable article table"><table>${head}${body}</table></div>`;
}

export function markdownToHtml(markdown, title = "", nonce = "") {
  return splitInteractiveBlocks(markdown).map((part) => part.type === "interactive"
    ? interactiveMarkup(part, nonce)
    : plainMarkdownToHtml(part.value, title)).join("\n");
}

function plainMarkdownToHtml(markdown, title = "") {
  return parseVibeMarkdown(markdown, title).map((block) => {
    if (block.type === "table") return tableHtml(block);
    if (block.type === "heading") return `<h${block.level}>${inlineMarkup(block.value)}</h${block.level}>`;
    if (block.type === "list") {
      const kind = block.kind === "ordered" ? "ol" : "ul";
      return `<${kind}>${block.items.map((item) => `<li>${inlineMarkup(item)}</li>`).join("")}</${kind}>`;
    }
    if (block.type === "quote") return `<blockquote>${inlineMarkup(block.value)}</blockquote>`;
    if (block.type === "code-block") return `<pre><code${block.language === "" ? "" : ` class="language-${escapeHtml(block.language)}"`}>${escapeHtml(block.value)}</code></pre>`;
    if (block.type === "math") return `<div class="math" role="math">${escapeHtml(block.value)}</div>`;
    return `<p>${inlineMarkup(block.value)}</p>`;
  }).join("\n");
}

function visualHtml(visual, className = "lead") {
  if (visual === null || typeof visual !== "object") return "";
  return `<figure class="${className}"><a href="${escapeHtml(visual.sourceUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(visual.imageUrl)}" alt="${escapeHtml(visual.alt)}" referrerpolicy="no-referrer"></a><figcaption>${escapeHtml(visual.credit)}</figcaption></figure>`;
}

function mediaHtml(media) {
  if (media === null || typeof media !== "object") return "";
  const providerName = { youtube: "YouTube", vimeo: "Vimeo", spotify: "Spotify", soundcloud: "SoundCloud" }[media.provider];
  const source = mediaEmbedSource(media.provider, media.href);
  if (providerName === undefined || source === null) return "";
  return `<section class="media-card" data-media-kind="${escapeHtml(media.kind)}" data-media-provider="${escapeHtml(media.provider)}" aria-label="Embedded ${escapeHtml(media.kind)}"><span class="kind">${escapeHtml(media.kind)}</span><div class="media-frame"><iframe src="${escapeHtml(source)}" title="${escapeHtml(media.label)}" loading="lazy" allow="encrypted-media; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation"></iframe></div><div class="media-actions"><a href="${escapeHtml(media.href)}" target="_blank" rel="noopener noreferrer">Open on ${providerName}</a></div></section>`;
}

const VIBEIFY_CTA = `<aside class="try-vibe"><div><span class="kind">Open source · make it yours</span><h2>Make your own Vibe.</h2><p>Download DSH and Vibeify to turn your own AI conversations into a visual magazine—a creative tool for curiosity, expression and wellbeing. Questions? <a href="mailto:info@codingforjustice.org.uk">Email Vibeify</a>.</p></div><a class="cta-link" href="https://dsh-vibeify.ezzye.chatgpt.site/" target="_blank" rel="noopener noreferrer">Download DSH + Vibeify</a></aside>`;

function pageShell({ title, description, body, imageUrl = null, imageAlt = null, canonical = null, extraHead = "", nonce = "", appearance = null }) {
  const presentation = cleanArticleAppearance(appearance);
  const appearanceAttributes = ` data-look="${presentation.look}" data-mood="${presentation.mood}" data-palette="${presentation.palette}" data-text-size="${presentation.textSize}" data-spacing="${presentation.spacing}"`;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeCanonical = canonical === null ? null : escapeHtml(canonical);
  const canonicalMeta = safeCanonical === null ? "" : `<link rel="canonical" href="${safeCanonical}"><meta property="og:url" content="${safeCanonical}">`;
  const imageMeta = imageUrl === null ? "" : `<meta property="og:image" content="${escapeHtml(imageUrl)}"><meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}"><meta property="og:image:alt" content="${escapeHtml(imageAlt ?? title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@ezzye"><meta name="twitter:creator" content="@ezzye"><meta name="twitter:title" content="${safeTitle}"><meta name="twitter:description" content="${safeDescription}"><meta name="twitter:image" content="${escapeHtml(imageUrl)}"><meta name="twitter:image:alt" content="${escapeHtml(imageAlt ?? title)}">`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><link id="vibe-favicon" rel="icon" type="image/svg+xml" sizes="any" href="${escapeHtml(faviconPath(presentation))}"><meta name="description" content="${safeDescription}"><meta property="og:type" content="article"><meta property="og:site_name" content="Vibeify"><meta property="og:title" content="${safeTitle}"><meta property="og:description" content="${safeDescription}">${canonicalMeta}${imageMeta}${extraHead}<meta name="vibe-interactive-nonce" content="${escapeHtml(nonce)}"><style>${SHARE_STYLES}</style></head><body${appearanceAttributes}><header class="share-utility"><span class="share-note">Coding for Justice</span><a href="https://dsh-vibeify.ezzye.chatgpt.site/" target="_blank" rel="noopener noreferrer">Download DSH + Vibeify</a></header><div class="publication-banner" id="publication-banner">${renderPublicationMasthead(presentation.look, presentation.mood)}</div>${body}${VIBEIFY_CTA}</body></html>`;
}

export function articleMarkup(snapshot, { includeTitle = true, nonce = "" } = {}) {
  const lead = snapshot.visual ?? snapshot.inlineVisuals[0] ?? null;
  const galleryVisuals = snapshot.visual === null ? snapshot.inlineVisuals.slice(1) : snapshot.inlineVisuals;
  const gallery = galleryVisuals.length === 0 ? "" : `<div class="gallery">${galleryVisuals.map((visual) => visualHtml(visual, "inline")).join("")}</div>`;
  const source = snapshot.contentLink === null ? "" : `<div class="source">Read the original source: <a href="${escapeHtml(snapshot.contentLink.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(snapshot.contentLink.label)}</a></div>`;
  const headlineFirst = cleanArticleAppearance(snapshot.appearance).look === "bbc-news";
  return `<article class="article">${headlineFirst ? "" : visualHtml(lead)}<div class="copy"><span class="kind">${escapeHtml(snapshot.kind)}</span>${includeTitle ? `<h1>${escapeHtml(snapshot.title)}</h1>` : ""}${headlineFirst ? visualHtml(lead) : ""}<div class="body">${markdownToHtml(snapshot.markdown, snapshot.title, nonce)}</div>${mediaHtml(snapshot.media)}${gallery}${source}</div></article>`;
}

export function renderPublicArticle(snapshot, canonical, nonce = "") {
  const articleText = splitInteractiveBlocks(snapshot.markdown).filter(part => part.type === "markdown").map(part => part.value).join(" ");
  const plain = articleText.replace(/[#*_`\[\]()!>-]/g, " ").replace(/\s+/g, " ").trim();
  const description = plain.slice(0, 180) || "A Vibe article shared from DSH Vibeify.";
  const socialVisual = snapshot.visual ?? snapshot.inlineVisuals[0] ?? null;
  return pageShell({
    title: `${snapshot.title} · Vibe`,
    appearance: snapshot.appearance,
    description,
    nonce,
    body: `${articleMarkup(snapshot, { nonce })}<script type="module" src="${APP_SCRIPT_PATH}"></script>`,
    imageUrl: socialVisual?.imageUrl ?? null,
    imageAlt: socialVisual?.alt ?? null,
    canonical,
  });
}

export function renderNewPage({ turnstileSiteKey = "", localDev = false, publishingReady = false, nonce = "" } = {}) {
  const turnstile = turnstileSiteKey === "" ? "" : `<div class="turnstile cf-turnstile" data-sitekey="${escapeHtml(turnstileSiteKey)}"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`;
  const unavailable = !localDev && !publishingReady ? `<p class="status" role="alert">Publishing is not configured yet. You can still inspect the privacy-safe preview.</p>` : "";
  return pageShell({
    nonce,
    title: "Preview a Vibe article",
    description: "Review one Vibe article before deliberately publishing a public link.",
    body: `<main class="preview-shell"><section class="preview-intro"><span class="kind">Private preview</span><h1>Review exactly what will be shared.</h1><p class="body">Only this article, its selected look, public images, embedded media, and source link arrived from DSH. Chat prompts, reasoning, sessions, editorial preferences and local history stay on your computer.</p></section><div id="preview" class="empty">Waiting for the article from Vibe…</div><div class="preview-actions"><span id="status" class="status">Nothing has been published.</span>${turnstile}<button id="publish" class="primary" type="button" disabled>Publish public link</button></div>${unavailable}</main><script type="module" src="${APP_SCRIPT_PATH}"></script>`,
  });
}

export function renderNotFound() {
  return pageShell({ title: "Article not found · Vibe", description: "This shared article is unavailable or has expired.", body: `<main class="preview-shell"><section class="preview-intro"><span class="kind">Vibe</span><h1>This article is no longer available.</h1><p class="body">It may have expired or been removed by the person who shared it.</p></section></main>` });
}
