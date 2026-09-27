import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

import { SHARE_SNAPSHOT_VERSION } from "../../shared/vibe-share-contract.js";
import { APP_JS } from "./src/app-source.mjs";
import { markdownToHtml, renderPublicArticle } from "./src/render.mjs";
import { handleRequest } from "./src/worker.mjs";
import { createStoryCoverSvg, storyCoverRuntimeSource } from "../../shared/vibe-cover.js";

const origin = "https://share.codingforjustice.org.uk";
const publishedAt = Date.now() - 1_000;
const snapshot = Object.freeze({
  version: SHARE_SNAPSHOT_VERSION,
  title: "The copyright robot has found cubes",
  kind: "editorial",
  markdown: "A useful **public** article.\n\n[Read Luanti](https://blog.luanti.org/2026/08/27/dmca.html)",
  publishedAt,
  visual: {
    imageUrl: "https://blog.luanti.org/static/blog/2026_dmca/cover.webp",
    sourceUrl: "https://blog.luanti.org/2026/08/27/dmca.html",
    alt: "Luanti artwork",
    credit: "Artwork · Luanti",
    kind: "editorial-image",
  },
  inlineVisuals: [],
  contentLink: { href: "https://blog.luanti.org/2026/08/27/dmca.html", label: "Luanti's account" },
  media: null,
  prompt: "must never cross the boundary",
  sessionId: "private-session",
});

const mediaSnapshot = Object.freeze({
  ...snapshot,
  title: "A song inside the article",
  kind: "music",
  media: Object.freeze({
    provider: "soundcloud",
    kind: "music",
    label: "Open SoundCloud player",
    href: "https://soundcloud.com/the-orca-band/i-know-you-better",
  }),
});

class MemoryDb {
  constructor() { this.rows = new Map(); this.limits = new Map(); this.visuals = new Map(); }
  prepare(sql) {
    const db = this;
    return {
      bind(...values) {
        return {
          async run() {
            if (sql.startsWith("INSERT OR IGNORE INTO published_visuals")) {
              const [visualKey, articleSlug, visualKind, createdAt] = values;
              if (db.visuals.has(visualKey)) return { meta: { changes: 0 } };
              db.visuals.set(visualKey, { article_slug: articleSlug, visual_kind: visualKind, created_at: createdAt });
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith("INSERT INTO articles")) {
              const [slug, snapshotJson, createdAt, expiresAt, deleteTokenHash] = values;
              if (db.rows.has(slug)) throw new Error("duplicate");
              db.rows.set(slug, { snapshot_json: snapshotJson, created_at: createdAt, expires_at: expiresAt, delete_token_hash: deleteTokenHash });
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith("UPDATE articles")) {
              const [snapshotJson, slug] = values;
              const row = db.rows.get(slug);
              if (row === undefined) return { meta: { changes: 0 } };
              row.snapshot_json = snapshotJson;
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith("DELETE")) {
              const [slug, tokenHash] = values;
              const row = db.rows.get(slug);
              if (values.length === 1) {
                const removed = db.rows.delete(slug);
                return { meta: { changes: removed ? 1 : 0 } };
              }
              if (row?.delete_token_hash !== tokenHash) return { meta: { changes: 0 } };
              db.rows.delete(slug);
              return { meta: { changes: 1 } };
            }
            throw new Error(`unexpected run: ${sql}`);
          },
          async first() {
            if (sql.startsWith("INSERT INTO daily_publish_limits")) {
              const [bucket, clientHash] = values;
              const key = `${bucket}:${clientHash}`;
              const count = (db.limits.get(key) ?? 0) + 1;
              db.limits.set(key, count);
              return { count };
            }
            if (sql.startsWith("SELECT visual_key")) {
              return db.visuals.has(values[0]) ? { visual_key: values[0] } : null;
            }
            if (!sql.startsWith("SELECT")) throw new Error(`unexpected first: ${sql}`);
            return db.rows.get(values[0]) ?? null;
          },
        };
      },
    };
  }
}

class MemoryCovers {
  constructor() { this.rows = new Map(); }
  async put(key, value, options) { this.rows.set(key, { value: new Uint8Array(value), ...options }); }
  async get(key) {
    const row = this.rows.get(key);
    if (row === undefined) return null;
    return { arrayBuffer: async () => row.value.buffer.slice(row.value.byteOffset, row.value.byteOffset + row.value.byteLength), httpMetadata: row.httpMetadata };
  }
  async delete(key) { this.rows.delete(key); }
}

const generatedCover = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, ...new Array(2_100).fill(0), 0xff, 0xd9]).toString("base64")}`;
const generatedPng = `data:image/png;base64,${Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, ...new Array(20).fill(0)]).toString("base64")}`;

test("public rendering escapes raw HTML while preserving safe article links", () => {
  const html = markdownToHtml('<script>alert("private")</script>\n\n[Safe](https://example.org/story)');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /href="https:\/\/example\.org\/story"/);

  const page = renderPublicArticle({ ...snapshot, inlineVisuals: [] }, `${origin}/a/example123`);
  assert.match(page, /<link rel="canonical" href="https:\/\/share\.codingforjustice\.org\.uk\/a\/example123">/);
  assert.match(page, /<meta property="og:url" content="https:\/\/share\.codingforjustice\.org\.uk\/a\/example123">/);
  assert.match(page, /<meta property="og:image" content="https:\/\/blog\.luanti\.org\/static\/blog\/2026_dmca\/cover\.webp">/);
  assert.match(page, /<meta property="og:image:alt" content="Luanti artwork">/);
  assert.match(page, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(page, /<meta name="twitter:title" content="The copyright robot has found cubes · Vibe">/);
  assert.match(page, /<meta name="twitter:description" content="A useful public article\./);
  assert.match(page, /<meta name="twitter:image" content="https:\/\/blog\.luanti\.org\/static\/blog\/2026_dmca\/cover\.webp">/);
  assert.match(page, /<meta name="twitter:image:alt" content="Luanti artwork">/);
  assert.match(page, /cover\.webp/);
  assert.match(page, /The copyright robot has found cubes/);
  assert.match(page, /https:\/\/dsh-vibeify\.ezzye\.chatgpt\.site\//);
  assert.match(page, /Make your own Vibe/);
  assert.doesNotMatch(page, /private-session|must never cross/);
});

test("public rendering preserves links nested inside emphasized article copy", () => {
  const html = markdownToHtml("*This analysis cites the official [Charter Review collection](https://www.gov.uk/government/collections/bbc-charter-review-2025-to-2027).* ");
  assert.match(html, /<em>This analysis cites the official <a href="https:\/\/www\.gov\.uk\/government\/collections\/bbc-charter-review-2025-to-2027"[^>]*>Charter Review collection<\/a>\.<\/em>/);
  assert.doesNotMatch(html, /\]\(https:\/\//);

  const strong = markdownToHtml("**Read the [Royal Charter](https://www.bbc.com/aboutthebbc/governance/charter).**");
  assert.match(strong, /<strong>Read the <a href="https:\/\/www\.bbc\.com\/aboutthebbc\/governance\/charter"[^>]*>Royal Charter<\/a>\.<\/strong>/);
  assert.doesNotMatch(strong, /\]\(https:\/\//);

  assert.match(APP_JS, /appendInline\(strong, token\.value\)/);
  assert.match(APP_JS, /appendInline\(emphasis, token\.value\)/);
});

test("private previews and public pages render pipe tables as responsive tables", () => {
  const markdown = [
    "A public map of circles:",
    "",
    "| Circle | Publicly documented people or groups | What the record establishes |",
    "| --- | --- | --- |",
    "| Family belief | **Giff/Gifty**, his mother | Music, persistence and practical support |",
  ].join("\n");
  const html = markdownToHtml(markdown);
  assert.match(html, /<div class="table-scroll"[^>]*><table>/);
  assert.match(html, /<th>Circle<\/th>/);
  assert.match(html, /<td><strong>Giff\/Gifty<\/strong>, his mother<\/td>/);
  assert.doesNotMatch(html, /\| --- \|/);

  assert.match(APP_JS, /className = "table-scroll"/);
  assert.match(APP_JS, /document\.createElement\("table"\)/);
  const page = renderPublicArticle({ ...snapshot, markdown }, `${origin}/a/table123`);
  assert.match(page, /\.table-scroll\{[^}]*overflow-x:auto/);
  assert.match(page, /\.body table\{[^}]*min-width:680px/);
  assert.match(page, /\.body th,\.body td\{[^}]*word-break:normal/);
});

test("Vibe formatting survives private preview and public rendering without title or TeX leakage", () => {
  const title = "The flying car will not be a car";
  const markdown = [
    `# ${title}`,
    "",
    "*Advanced-air-mobility concept art: NASA.*",
    "",
    "## There are only three bargains with gravity",
    "",
    "**Float in the air.** Read [NASA data](https://www.nasa.gov/).",
    "",
    String.raw`\[ L=\tfrac{1}{2}\rho V^2 S C_L \]`,
  ].join("\n");
  const html = markdownToHtml(markdown, title);
  assert.doesNotMatch(html, new RegExp(`<h2>${title}</h2>`));
  assert.match(html, /<em>Advanced-air-mobility concept art: NASA\.<\/em>/);
  assert.match(html, /<h3>There are only three bargains with gravity<\/h3>/);
  assert.match(html, /<strong>Float in the air\.<\/strong>/);
  assert.match(html, /<div class="math" role="math">L=1⁄2ρ V² S Cₗ<\/div>/);
  assert.doesNotMatch(html, /\\tfrac|\\rho|\\\[/);

  assert.match(APP_JS, /function parseVibeMarkdown/);
  assert.match(APP_JS, /parseVibeMarkdown\(markdown, title\)/);
  assert.match(APP_JS, /math\.className = "math"/);
});

test("an inline photograph becomes the lead when an older snapshot has no lead image", () => {
  const page = renderPublicArticle({
    ...snapshot,
    visual: null,
    inlineVisuals: [snapshot.visual],
  }, `${origin}/a/example123`);

  assert.match(page, /<figure class="lead">/);
  assert.match(page, /cover\.webp/);
  assert.doesNotMatch(page, /<div class="gallery"><figure class="inline">/);
});

test("publishing exposes selectable, copy, and native-share controls only after explicit Publish succeeds", () => {
  const publishClick = APP_JS.indexOf('publish?.addEventListener("click"');
  const successfulResponse = APP_JS.indexOf("if (!response.ok) throw new Error(result.error ?? \"Publishing failed\")", publishClick);
  const shareControls = APP_JS.indexOf("createPublishedShareControls(result.url, snapshot.title)", publishClick);
  assert.ok(publishClick >= 0);
  assert.ok(successfulResponse > publishClick);
  assert.ok(shareControls > successfulResponse);
  assert.match(APP_JS, /input\.readOnly = true/);
  assert.match(APP_JS, /input\.addEventListener\("focus", \(\) => input\.select\(\)\)/);
  assert.match(APP_JS, /navigator\.clipboard\.writeText\(value\)/);
  assert.match(APP_JS, /Copy is unavailable\. Select the link above to copy it\./);
  assert.match(APP_JS, /navigator\.share\(\{ title, url: value \}\)/);
  assert.match(APP_JS, /error\?\.name === "AbortError" \? "cancelled" : "unavailable"/);
  assert.doesNotMatch(APP_JS, /window\.setInterval|setTimeout\(/);
});

test("private previews and public articles preserve fixed-provider media as click-to-load embeds", async () => {
  const page = renderPublicArticle(mediaSnapshot, `${origin}/a/media123`);
  assert.match(page, /class="media-card"/);
  assert.match(page, /data-media-kind="music" data-media-provider="soundcloud"/);
  assert.match(page, /data-media-provider="soundcloud"/);
  assert.match(page, /data-media-href="https:\/\/soundcloud\.com\/the-orca-band\/i-know-you-better"/);
  assert.match(page, /Open on SoundCloud/);
  assert.match(page, /<script type="module" src="\/app\.js"><\/script>/);
  assert.doesNotMatch(page, /autoplay|auto_play=true/);
  assert.match(page, /data-media-provider="soundcloud"[^}]*\.media-frame iframe\{height:166px/);

  assert.match(APP_JS, /function mediaEmbedSource/);
  assert.match(APP_JS, /youtube-nocookie\.com\/embed/);
  assert.match(APP_JS, /auto_play=false/);
  assert.match(APP_JS, /querySelectorAll\("\[data-media-provider\]"\)/);
  assert.match(APP_JS, /card\.dataset\.mediaProvider = media\.provider/);

  const preview = await handleRequest(new Request(`${origin}/new`), {});
  assert.match(await preview.text(), /selected public images, embedded media, and its source link/);
});

test("the response policy admits only the four fixed media player hosts", async () => {
  const response = await handleRequest(new Request(`${origin}/new`), {});
  const policy = response.headers.get("content-security-policy");
  assert.match(policy, /frame-src[^;]*youtube-nocookie\.com/);
  assert.match(policy, /frame-src[^;]*player\.vimeo\.com/);
  assert.match(policy, /frame-src[^;]*open\.spotify\.com/);
  assert.match(policy, /frame-src[^;]*w\.soundcloud\.com/);
  assert.doesNotMatch(policy, /frame-src[^;]*\*/);
});

test("preview describes the privacy boundary and production publishing fails closed", async () => {
  const preview = await handleRequest(new Request(`${origin}/new`), {});
  const previewHtml = await preview.text();
  assert.equal(preview.status, 200);
  assert.match(previewHtml, /Chat prompts, reasoning, sessions, settings and local history stay on your computer/);
  assert.match(previewHtml, /Make your own Vibe/);
  assert.match(previewHtml, /Publishing is not configured yet/);

  const db = new MemoryDb();
  const response = await handleRequest(new Request(`${origin}/api/articles`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ snapshot, turnstileToken: "" }),
  }), { VIBE_SHARE_DB: db });
  assert.equal(response.status, 403);
  assert.equal(db.rows.size, 0);
});

test("a deliberate local publish stores only the cleaned snapshot and returns a removable public link", async () => {
  const db = new MemoryDb();
  const response = await handleRequest(new Request(`${origin}/api/articles`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ snapshot, turnstileToken: "local-test" }),
  }), { VIBE_SHARE_DB: db, VIBE_SHARE_LOCAL_DEV: "true" });
  const created = await response.json();
  assert.equal(response.status, 201);
  assert.match(created.url, /^https:\/\/share\.codingforjustice\.org\.uk\/a\//);
  assert.equal(db.rows.size, 1);
  const stored = [...db.rows.values()][0].snapshot_json;
  assert.doesNotMatch(stored, /private-session|must never cross|prompt|sessionId/);

  const publicPage = await handleRequest(new Request(created.url), { VIBE_SHARE_DB: db });
  assert.equal(publicPage.status, 200);
  assert.match(await publicPage.text(), /Luanti&#39;s account/);

  const publicHead = await handleRequest(new Request(created.url, { method: "HEAD" }), { VIBE_SHARE_DB: db });
  assert.equal(publicHead.status, 200);
  assert.equal(publicHead.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(await publicHead.text(), "");

  const wrongDelete = await handleRequest(new Request(`${origin}/api/articles/${created.slug}`, { method: "DELETE", headers: { authorization: "Bearer wrong" } }), { VIBE_SHARE_DB: db });
  assert.equal(wrongDelete.status, 404);
  const removed = await handleRequest(new Request(`${origin}/api/articles/${created.slug}`, { method: "DELETE", headers: { authorization: `Bearer ${created.deleteToken}` } }), { VIBE_SHARE_DB: db });
  assert.equal(removed.status, 200);
  assert.equal(db.rows.size, 0);
});

test("social crawlers are explicitly allowed to inspect shared articles", async () => {
  const robots = await handleRequest(new Request(`${origin}/robots.txt`), {});
  assert.equal(robots.status, 200);
  assert.equal(await robots.text(), "User-agent: *\nAllow: /\n");

  const robotsHead = await handleRequest(new Request(`${origin}/robots.txt`, { method: "HEAD" }), {});
  assert.equal(robotsHead.status, 200);
  assert.equal(await robotsHead.text(), "");
});

test("the preview keeps the Vibe lead image and prepares a JPEG only for image-free articles", () => {
  assert.doesNotMatch(APP_JS, /\/api\/visuals\/check/);
  assert.match(APP_JS, /toDataURL\("image\/jpeg"/);
  assert.match(APP_JS, /generatedCover/);
  assert.match(APP_JS, /visual: value\.visual/);
  assert.match(APP_JS, /The Vibe image will appear on the public article/i);
  const cover = createStoryCoverSvg(snapshot.title, snapshot.markdown);
  assert.match(cover, /The copyright robot has found cubes/);
  assert.match(APP_JS, /createStoryCoverSvg\(value\.title, value\.markdown\)/);
  const publicCover = runInNewContext(`${storyCoverRuntimeSource()}\ncreateStoryCoverSvg(${JSON.stringify(snapshot.title)}, ${JSON.stringify(snapshot.markdown)})`);
  assert.equal(publicCover, cover);
});

test("the private preview rasterizes a generated PNG to the exact JPEG sent for publication", async () => {
  const draws = [];
  const context = { fillRect() {}, drawImage(...args) { draws.push(args); } };
  const canvas = { width: 0, height: 0, getContext() { return context; }, toDataURL(type) {
    assert.equal(type, "image/jpeg");
    return generatedCover;
  } };
  class ImageStub {
    naturalWidth = 1600;
    naturalHeight = 900;
    set src(value) { assert.equal(value, generatedPng); this.onload(); }
  }
  const document = { getElementById() { return null; }, querySelectorAll() { return []; }, createElement(name) {
    assert.equal(name, "canvas");
    return canvas;
  } };
  const window = { opener: null, addEventListener() {} };
  const jpeg = await runInNewContext(`${APP_JS}\ncreateGeneratedIllustrationJpeg(${JSON.stringify(generatedPng)})`, { document, window, Image: ImageStub });
  assert.equal(jpeg, generatedCover);
  assert.equal(canvas.width, 1200);
  assert.equal(canvas.height, 675);
  assert.deepEqual(draws[0].slice(1), [0, 0, 1200, 675]);
  assert.match(APP_JS, /renderSnapshot\(\{ \.\.\.snapshot, visual: \{ \.\.\.value\.visual, imageUrl: generatedCover \} \}\)/);
});

test("an unrelated window message cannot consume the private share transfer listener", async () => {
  const listeners = new Map();
  const sent = [];
  const opener = { postMessage(value, targetOrigin) { sent.push({ value, targetOrigin }); } };
  const preview = { replaceChildren() {} };
  const publish = { disabled: true, addEventListener() {} };
  const status = { textContent: "Nothing has been published." };
  const document = {
    getElementById(id) { return { preview, publish, status }[id] ?? null; },
    querySelectorAll() { return []; },
  };
  const window = {
    opener,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
  };
  runInNewContext(APP_JS, { document, window, Image: class { constructor() { throw new Error("render skipped in listener test"); } } });
  assert.equal(sent.length, 2);
  const receive = listeners.get("message");
  assert.equal(typeof receive, "function");
  await receive({ source: {}, origin: "https://challenges.cloudflare.com", data: { type: "other" } });
  assert.equal(listeners.get("message"), receive);
  await receive({ source: opener, origin: "http://127.0.0.1:3080", data: { type: "unrelated" } });
  assert.equal(listeners.get("message"), receive);
  await receive({ source: opener, origin: "http://127.0.0.1:3080", data: { type: "vibe-share:snapshot", version: 1, snapshot: { ...snapshot, visual: null, inlineVisuals: [] } } });
  assert.equal(listeners.has("message"), false);
});

test("a text-only public page uses its generated editorial cover", async () => {
  const db = new MemoryDb();
  const covers = new MemoryCovers();
  const response = await handleRequest(new Request(`${origin}/api/articles`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ snapshot: { ...snapshot, visual: null, inlineVisuals: [] }, generatedCover, turnstileToken: "local-test" }),
  }), { VIBE_SHARE_DB: db, VIBE_SHARE_COVERS: covers, VIBE_SHARE_LOCAL_DEV: "true" });

  const created = await response.json();
  assert.equal(response.status, 201);
  const stored = JSON.parse([...db.rows.values()][0].snapshot_json);
  assert.equal(stored.visual.kind, "typography");
  assert.equal(stored.visual.imageUrl, `${origin}/i/${created.slug}.jpg`);
  assert.equal(covers.rows.size, 1);

  const image = await handleRequest(new Request(stored.visual.imageUrl), { VIBE_SHARE_DB: db, VIBE_SHARE_COVERS: covers });
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/jpeg");
  assert.deepEqual([...new Uint8Array(await image.arrayBuffer()).slice(0, 3)], [0xff, 0xd8, 0xff]);

  const page = await handleRequest(new Request(created.url), { VIBE_SHARE_DB: db, VIBE_SHARE_COVERS: covers });
  assert.match(await page.text(), new RegExp(`<meta property="og:image" content="${origin.replaceAll(".", "\\.")}\\/i\\/${created.slug}\\.jpg">`));

  const repeated = await handleRequest(new Request(`${origin}/api/articles`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ snapshot: { ...snapshot, visual: null, inlineVisuals: [] }, generatedCover, turnstileToken: "local-test" }),
  }), { VIBE_SHARE_DB: db, VIBE_SHARE_COVERS: covers, VIBE_SHARE_LOCAL_DEV: "true" });
  assert.equal(repeated.status, 201);
  assert.equal(covers.rows.size, 2);

  const removed = await handleRequest(new Request(`${origin}/api/articles/${created.slug}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${created.deleteToken}` },
  }), { VIBE_SHARE_DB: db, VIBE_SHARE_COVERS: covers });
  assert.equal(removed.status, 200);
  assert.equal(covers.rows.size, 1);
  const removedImage = await handleRequest(new Request(stored.visual.imageUrl), { VIBE_SHARE_DB: db, VIBE_SHARE_COVERS: covers });
  assert.equal(removedImage.status, 404);
});

test("an explicitly published generated illustration stores only its previewed JPEG and keeps its label", async () => {
  const db = new MemoryDb();
  const covers = new MemoryCovers();
  const generated = {
    ...snapshot,
    visual: {
      imageUrl: generatedPng,
      sourceUrl: "https://openai.com/index/image-generation/",
      alt: "An imagined concert stage",
      credit: "Generated illustration · ChatGPT",
      kind: "ai-generated",
    },
  };
  const request = (cover) => new Request(`${origin}/api/articles`, {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ snapshot: generated, generatedCover: cover, turnstileToken: "local-test" }),
  });
  const env = { VIBE_SHARE_DB: db, VIBE_SHARE_COVERS: covers, VIBE_SHARE_LOCAL_DEV: "true" };
  const missing = await handleRequest(request(null), env);
  assert.equal(missing.status, 400);
  assert.equal(db.rows.size, 0);

  const response = await handleRequest(request(generatedCover), env);
  assert.equal(response.status, 201);
  const created = await response.json();
  const storedJson = db.rows.get(created.slug).snapshot_json;
  assert.doesNotMatch(storedJson, /data:image|base64|private-session|must never cross/);
  const stored = JSON.parse(storedJson);
  assert.equal(stored.visual.kind, "ai-generated");
  assert.equal(stored.visual.credit, "Generated illustration · ChatGPT");
  assert.equal(stored.visual.imageUrl, `${origin}/i/${created.slug}.jpg`);
  const image = await handleRequest(new Request(stored.visual.imageUrl), env);
  assert.equal(image.status, 200);
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from(generatedCover.split(",")[1], "base64"));
  const page = await handleRequest(new Request(created.url), env);
  const html = await page.text();
  assert.match(html, /Generated illustration · ChatGPT/);
  assert.match(html, new RegExp(`<meta property="og:image" content="${origin.replaceAll(".", "\\.")}\\/i\\/${created.slug}\\.jpg">`));
});

test("a generated PNG over the ordinary article limit publishes without persisting its base64", async () => {
  const db = new MemoryDb();
  const covers = new MemoryCovers();
  const bytes = Buffer.alloc(1_100_000);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  const png = `data:image/png;base64,${bytes.toString("base64")}`;
  const body = JSON.stringify({
    snapshot: { ...snapshot, visual: { imageUrl: png, sourceUrl: "https://openai.com/index/image-generation/", alt: "An imagined concert stage", credit: "Generated illustration · ChatGPT", kind: "ai-generated" } },
    generatedCover,
    turnstileToken: "local-test",
  });
  assert.ok(Buffer.byteLength(body) > 1_000_000);
  const response = await handleRequest(new Request(`${origin}/api/articles`, {
    method: "POST", headers: { origin, "content-type": "application/json", "content-length": String(Buffer.byteLength(body)) }, body,
  }), { VIBE_SHARE_DB: db, VIBE_SHARE_COVERS: covers, VIBE_SHARE_LOCAL_DEV: "true" });
  assert.equal(response.status, 201);
  const stored = [...db.rows.values()][0].snapshot_json;
  assert.ok(stored.length < 20_000);
  assert.doesNotMatch(stored, /data:image\/png|base64/);
});

test("publishing and republishing preserve the reviewed Vibe lead image in the article and social preview", async () => {
  const db = new MemoryDb();
  const covers = new MemoryCovers();
  const env = { VIBE_SHARE_DB: db, VIBE_SHARE_COVERS: covers, VIBE_SHARE_LOCAL_DEV: "true" };
  const publishArticle = () => handleRequest(new Request(`${origin}/api/articles`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ snapshot, generatedCover, turnstileToken: "local-test" }),
  }), env);

  const firstResponse = await publishArticle();
  const first = await firstResponse.json();
  assert.equal(firstResponse.status, 201);
  assert.equal(JSON.parse(db.rows.get(first.slug).snapshot_json).visual.imageUrl, snapshot.visual.imageUrl);

  const removed = await handleRequest(new Request(`${origin}/api/articles/${first.slug}`, { method: "DELETE", headers: { authorization: `Bearer ${first.deleteToken}` } }), env);
  assert.equal(removed.status, 200);

  const secondResponse = await publishArticle();
  const second = await secondResponse.json();
  assert.equal(secondResponse.status, 201);
  const secondSnapshot = JSON.parse(db.rows.get(second.slug).snapshot_json);
  assert.equal(secondSnapshot.visual.imageUrl, snapshot.visual.imageUrl);
  assert.equal(covers.rows.size, 0);

  const publicPage = await handleRequest(new Request(second.url), env);
  const html = await publicPage.text();
  assert.match(html, /<figure class="lead">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/blog\.luanti\.org\/static\/blog\/2026_dmca\/cover\.webp">/);
});

test("the public page keeps the selected lead ahead of a photographic inline visual", async () => {
  const db = new MemoryDb();
  const selected = {
    ...snapshot,
    inlineVisuals: [{
      imageUrl: "https://images.example.org/second-photo.jpg",
      sourceUrl: "https://images.example.org/second-photo",
      alt: "A second image",
      credit: "Photograph · Example",
      kind: "photograph",
    }],
  };
  const response = await handleRequest(new Request(`${origin}/api/articles`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ snapshot: selected, turnstileToken: "local-test" }),
  }), { VIBE_SHARE_DB: db, VIBE_SHARE_LOCAL_DEV: "true" });
  assert.equal(response.status, 201);
  const stored = JSON.parse([...db.rows.values()][0].snapshot_json);
  assert.equal(stored.visual.imageUrl, snapshot.visual.imageUrl);
  assert.equal(stored.inlineVisuals[0].imageUrl, selected.inlineVisuals[0].imageUrl);
  assert.equal(db.visuals.size, 0);
  const gone = await handleRequest(new Request(`${origin}/api/visuals/check`, {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: "{}",
  }), { VIBE_SHARE_DB: db });
  assert.equal(gone.status, 404);
});

test("managed publishing stores only a salted daily fingerprint and enforces the public contract", async () => {
  const db = new MemoryDb();
  const response = await handleRequest(new Request(`${origin}/api/articles`, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "CF-Connecting-IP": "203.0.113.44",
    },
    body: JSON.stringify({ snapshot, turnstileToken: "" }),
  }), { DB: db, VIBE_SHARE_RATE_SECRET: "a".repeat(48) });
  assert.equal(response.status, 201);
  assert.equal(db.rows.size, 1);
  assert.equal(db.limits.size, 2);
  assert.doesNotMatch([...db.limits.keys()].join(" "), /203\.0\.113\.44/);

  const preview = await handleRequest(new Request(`${origin}/new`), { VIBE_SHARE_RATE_SECRET: "a".repeat(48) });
  assert.doesNotMatch(await preview.text(), /Publishing is not configured yet/);
});

test("bundled illustration endpoint is fixed, credited art; unknown names fail closed",async()=>{
 const drawing=await handleRequest(new Request(`${origin}/illustrations/doodles-reading.svg`));
 assert.equal(drawing.status,200);assert.match(drawing.headers.get('content-type'),/image\/svg\+xml/);
 const svg=await drawing.text();assert.match(svg,/<svg/);assert.doesNotMatch(svg,/<script|foreignObject|onload=/i);
 const unknown=await handleRequest(new Request(`${origin}/illustrations/not-shipped.svg`));assert.equal(unknown.status,404);
});

test("publishing a bundled drawing preserves its previewed JPEG, credit and social cover",async()=>{
 const db=new MemoryDb(),covers=new MemoryCovers();
 const env={VIBE_SHARE_DB:db,VIBE_SHARE_COVERS:covers,VIBE_SHARE_LOCAL_DEV:'true'};
 const illustrated={...snapshot,visual:{kind:'illustration',illustrationId:'doodles-reading'}};
 const request=(cover)=>new Request(`${origin}/api/articles`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({snapshot:illustrated,generatedCover:cover})});
 assert.equal((await handleRequest(request(null),env)).status,400);
 const response=await handleRequest(request(generatedCover),env);assert.equal(response.status,201);
 const created=await response.json(),stored=JSON.parse(db.rows.get(created.slug).snapshot_json);
 assert.equal(stored.visual.kind,'illustration');assert.match(stored.visual.credit,/Pablo Stanley.*CC0/);
 assert.equal(stored.visual.imageUrl,`${origin}/i/${created.slug}.jpg`);
 const image=await handleRequest(new Request(stored.visual.imageUrl),env);
 assert.deepEqual(Buffer.from(await image.arrayBuffer()),Buffer.from(generatedCover.split(',')[1],'base64'));
 const html=await(await handleRequest(new Request(created.url),env)).text();
 assert.ok(html.includes(`<meta property="og:image" content="${stored.visual.imageUrl}">`));
 assert.match(html,/Pablo Stanley/);
});

const interactiveMarkdown = 'Before the app.\n\n```vibe-app\n' + JSON.stringify({title: 'Counter </iframe><script>parentEscape()</script>', height: 360, html: '<button id="count">0</button><script>document.getElementById("count").addEventListener("click",e=>e.target.textContent++);</script>'}) + '\n```\n\nAfter the app.';

test('interactive content renders only inside an escaped opaque sandbox, with surrounding article copy', () => {
  const page = markdownToHtml(interactiveMarkdown, '', 'testNonce123');
  assert.match(page, /<p>Before the app\.<\/p>/);
  assert.match(page, /<p>After the app\.<\/p>/);
  assert.match(page, /sandbox="allow-scripts allow-forms"/);
  assert.doesNotMatch(page, /allow-same-origin|allow-popups|<script>/);
  assert.match(page, /&lt;script nonce=&quot;testNonce123&quot;&gt;/);
  assert.match(page, /connect-src &amp;#39;none&amp;#39;/);
  assert.match(page, /form-action &amp;#39;none&amp;#39;/);
  assert.equal((page.match(/<iframe /g) || []).length, 1);
});

test('preview and public documents use fresh matching nonces while parent inline scripts stay blocked', async () => {
  const first = await handleRequest(new Request(origin + '/new'), {});
  const second = await handleRequest(new Request(origin + '/new'), {});
  const policy = first.headers.get('content-security-policy');
  const nonce = /script-src 'nonce-([^']+)'/.exec(policy)[1];
  assert.ok(nonce.length >= 24);
  assert.notEqual(policy, second.headers.get('content-security-policy'));
  assert.doesNotMatch(policy.match(/script-src[^;]+/)[0], /unsafe-inline/);
  assert.match(await first.text(), new RegExp('name="vibe-interactive-nonce" content="' + nonce + '"'));
  const db = new MemoryDb();
  db.rows.set('interactive123', {snapshot_json: JSON.stringify({...snapshot, markdown: interactiveMarkdown}), expires_at: Date.now() + 60000});
  const published = await handleRequest(new Request(origin + '/a/interactive123'), {DB: db});
  assert.equal(published.status, 200);
  const publishedNonce = /script-src 'nonce-([^']+)'/.exec(published.headers.get('content-security-policy'))[1];
  assert.match(await published.text(), new RegExp('&lt;script nonce=&quot;' + publishedNonce + '&quot;&gt;'));
});

test('browser preview uses the same interactive parser and sandboxed document as publication', () => {
  const nodes = [];
  function element(tag) { const node = {tag, children: [], attrs: {}, append(...children) {this.children.push(...children);}, setAttribute(k,v) {this.attrs[k]=v;}}; nodes.push(node); return node; }
  const document = {getElementById: () => null, querySelector: () => ({content: 'previewNonce'}), querySelectorAll: () => [], createDocumentFragment: () => element('fragment'), createElement: element, createTextNode: text => ({text})};
  const context = {document, window: {opener: null, addEventListener() {}}, URL, console};
  runInNewContext(APP_JS + '\nglobalThis.output = renderMarkdown(' + JSON.stringify(interactiveMarkdown) + ');', context);
  const frame = nodes.find(n => n.tag === 'iframe');
  assert.equal(frame.attrs.sandbox, 'allow-scripts allow-forms');
  assert.equal(frame.height, '360');
  assert.match(frame.srcdoc, /<script nonce="previewNonce">/);
  assert.match(frame.srcdoc, /connect-src &#39;none&#39;/);
  assert.ok(nodes.some(n => n.tag === 'p'));
});
