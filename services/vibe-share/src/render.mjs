const MARKDOWN_LINK = /\[([^\]\n]{1,240})\]\((https:\/\/[^\s)]+)\)/g;
const MARKDOWN_IMAGE = /!\[[^\]\n]*\]\([^\s)]+\)/g;

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeHref(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "" ? url.href : null;
  } catch {
    return null;
  }
}

function inlineMarkup(value) {
  const links = [];
  const tokenized = String(value ?? "").replace(MARKDOWN_IMAGE, "").replace(MARKDOWN_LINK, (_match, label, href) => {
    const safe = safeHref(href);
    if (safe === null) return label;
    const token = `VIBESHARELINK${links.length}TOKEN`;
    links.push(`<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`);
    return token;
  });
  let html = escapeHtml(tokenized)
    .replace(/\*\*([^*\n]{1,300})\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]{1,300})\*/g, "<em>$1</em>")
    .replace(/`([^`\n]{1,240})`/g, "<code>$1</code>");
  links.forEach((link, index) => { html = html.replace(`VIBESHARELINK${index}TOKEN`, link); });
  return html;
}

export function markdownToHtml(markdown) {
  const lines = String(markdown ?? "").replace(MARKDOWN_IMAGE, "").split(/\r?\n/);
  const output = [];
  let paragraph = [];
  let list = null;
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    output.push(`<p>${inlineMarkup(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list === null) return;
    output.push(`<${list.kind}>${list.items.map((item) => `<li>${inlineMarkup(item)}</li>`).join("")}</${list.kind}>`);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") { flushParagraph(); flushList(); continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading !== null) {
      flushParagraph(); flushList();
      const level = Math.min(3, heading[1].length + 1);
      output.push(`<h${level}>${inlineMarkup(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (bullet !== null || ordered !== null) {
      flushParagraph();
      const kind = bullet !== null ? "ul" : "ol";
      if (list !== null && list.kind !== kind) flushList();
      list ??= { kind, items: [] };
      list.items.push((bullet ?? ordered)[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return output.join("\n");
}

function visualHtml(visual, className = "lead") {
  if (visual === null || typeof visual !== "object") return "";
  return `<figure class="${className}"><a href="${escapeHtml(visual.sourceUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(visual.imageUrl)}" alt="${escapeHtml(visual.alt)}" referrerpolicy="no-referrer"></a><figcaption>${escapeHtml(visual.credit)}</figcaption></figure>`;
}

const CSS = `:root{color-scheme:dark;--ink:#fffafc;--muted:#c8bbc4;--accent:#ff86ad}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 82% 0,#35182f 0,transparent 28%),#090609;color:var(--ink);font-family:Inter,system-ui,sans-serif}header{height:76px;padding:0 clamp(20px,5vw,72px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff17;background:#090609e8}header a{color:inherit;text-decoration:none}.brand{font-weight:900;letter-spacing:.18em;background:linear-gradient(100deg,#fff,#ff88ad 58%,#9f8cff);background-clip:text;color:transparent}.brand small{display:block;margin-top:2px;color:#9f929b;font-size:9px;letter-spacing:.12em;text-transform:uppercase}.article{width:min(1040px,calc(100% - 32px));margin:clamp(28px,6vw,76px) auto 80px;overflow:hidden;border:1px solid #ffffff1c;border-radius:25px;background:linear-gradient(145deg,#261521,#110c12);box-shadow:0 30px 90px #0005}.lead{margin:0;position:relative;background:#151016}.lead img{width:100%;height:clamp(260px,48vw,560px);display:block;object-fit:cover}.lead figcaption,.gallery figcaption{padding:9px 14px;color:#a99ca5;font-size:11px}.copy{padding:clamp(27px,6vw,70px)}.kind{color:var(--accent);font-size:10px;font-weight:850;letter-spacing:.15em;text-transform:uppercase}h1,h2,h3{font-family:Iowan Old Style,Georgia,serif;font-weight:500;letter-spacing:-.04em}h1{max-width:900px;margin:10px 0 30px;font-size:clamp(42px,7vw,82px);line-height:.98;text-wrap:balance}h2{margin:38px 0 14px;font-size:clamp(28px,4vw,44px)}h3{font-size:26px}.body{color:var(--muted);font-size:clamp(16px,1.8vw,20px);line-height:1.72}.body p,.body li{max-width:790px}.body a,.source a{color:#ffc0d4;text-underline-offset:3px}.body blockquote{border-left:2px solid var(--accent);padding-left:20px}.gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:34px 0}.gallery figure{margin:0;overflow:hidden;border:1px solid #ffffff18;border-radius:14px;background:#0c090d}.gallery img{width:100%;height:300px;display:block;object-fit:cover}.source{margin-top:42px;padding-top:22px;border-top:1px solid #ffffff18;color:#a899a4;font-size:12px}.share-note{color:#9c8f98;font-size:11px}.delete{margin-top:16px}button{min-height:42px;padding:0 17px;border:1px solid #ffffff28;border-radius:999px;background:#ffffff0c;color:#fff;cursor:pointer;font:inherit}button.primary{border-color:#ff9aba;background:#ff9aba;color:#1a0e15;font-weight:800}button:disabled{opacity:.55;cursor:wait}.preview-shell{width:min(960px,calc(100% - 30px));margin:42px auto 70px}.preview-intro{max-width:680px;margin-bottom:30px}.preview-intro h1{font-size:clamp(38px,6vw,66px)}.preview-actions{position:sticky;z-index:3;bottom:18px;margin:28px 0;padding:14px;display:flex;align-items:center;gap:14px;border:1px solid #ffffff24;border-radius:18px;background:#171018e8;backdrop-filter:blur(18px)}.status{flex:1;color:#c9bdc5}.empty{padding:60px 0;color:#b6a9b2}.turnstile{margin:10px 0}@media(max-width:680px){header{height:66px}.article{border-radius:18px}.copy{padding:28px 21px}.gallery{grid-template-columns:1fr}.gallery img{height:230px}.preview-actions{align-items:stretch;flex-direction:column}.preview-actions button{width:100%}}`;

function pageShell({ title, description, body, imageUrl = null, canonical = null, extraHead = "" }) {
  const metaImage = imageUrl === null ? "" : `<meta property="og:image" content="${escapeHtml(imageUrl)}"><meta name="twitter:card" content="summary_large_image">`;
  const canonicalTag = canonical === null ? "" : `<link rel="canonical" href="${escapeHtml(canonical)}">`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta property="og:type" content="article"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">${metaImage}${canonicalTag}${extraHead}<style>${CSS}</style></head><body><header><a href="https://codingforjustice.org.uk"><span class="brand">VIBE<small>shared from a private local magazine</small></span></a><span class="share-note">Coding for Justice</span></header>${body}</body></html>`;
}

export function articleMarkup(snapshot, { includeTitle = true } = {}) {
  const gallery = snapshot.inlineVisuals.length === 0 ? "" : `<div class="gallery">${snapshot.inlineVisuals.map((visual) => visualHtml(visual, "inline")).join("")}</div>`;
  const source = snapshot.contentLink === null ? "" : `<div class="source">Read the original source: <a href="${escapeHtml(snapshot.contentLink.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(snapshot.contentLink.label)}</a></div>`;
  return `<article class="article">${visualHtml(snapshot.visual)}<div class="copy"><span class="kind">${escapeHtml(snapshot.kind)}</span>${includeTitle ? `<h1>${escapeHtml(snapshot.title)}</h1>` : ""}<div class="body">${markdownToHtml(snapshot.markdown)}</div>${gallery}${source}</div></article>`;
}

export function renderPublicArticle(snapshot, canonical) {
  const plain = snapshot.markdown.replace(/[#*_`\[\]()!>-]/g, " ").replace(/\s+/g, " ").trim();
  const description = plain.slice(0, 180) || "A Vibe article shared from DSH Vibeify.";
  return pageShell({
    title: `${snapshot.title} · Vibe`,
    description,
    body: articleMarkup(snapshot),
    imageUrl: snapshot.visual?.imageUrl ?? snapshot.inlineVisuals[0]?.imageUrl ?? null,
    canonical,
  });
}

export function renderNewPage({ turnstileSiteKey = "", localDev = false, publishingReady = false } = {}) {
  const turnstile = turnstileSiteKey === "" ? "" : `<div class="turnstile cf-turnstile" data-sitekey="${escapeHtml(turnstileSiteKey)}"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`;
  const unavailable = !localDev && !publishingReady ? `<p class="status" role="alert">Publishing is not configured yet. You can still inspect the privacy-safe preview.</p>` : "";
  return pageShell({
    title: "Preview a Vibe article",
    description: "Review one Vibe article before deliberately publishing a public link.",
    body: `<main class="preview-shell"><section class="preview-intro"><span class="kind">Private preview</span><h1>Review exactly what will be shared.</h1><p class="body">Only this article, its selected public images, and its source link arrived from DSH. Chat prompts, reasoning, sessions, settings and local history stay on your computer.</p></section><div id="preview" class="empty">Waiting for the article from Vibe…</div><div class="preview-actions"><span id="status" class="status">Nothing has been published.</span>${turnstile}<button id="publish" class="primary" type="button" disabled>Publish public link</button></div>${unavailable}</main><script type="module" src="/app.js"></script>`,
  });
}

export function renderNotFound() {
  return pageShell({ title: "Article not found · Vibe", description: "This shared article is unavailable or has expired.", body: `<main class="preview-shell"><section class="preview-intro"><span class="kind">Vibe</span><h1>This article is no longer available.</h1><p class="body">It may have expired or been removed by the person who shared it.</p></section></main>` });
}
