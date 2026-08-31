import test from "node:test";
import assert from "node:assert/strict";

import { SHARE_SNAPSHOT_VERSION } from "../../shared/vibe-share-contract.js";
import { APP_JS } from "./src/app-source.mjs";
import { markdownToHtml, renderPublicArticle } from "./src/render.mjs";
import { handleRequest } from "./src/worker.mjs";

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

test("publishing copies the final link and keeps an explicit copy control", () => {
  assert.match(APP_JS, /await copyPublicLink\(result\.url\)/);
  assert.match(APP_JS, /Copied to clipboard/);
  assert.match(APP_JS, /Copy link/);
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

test("the preview checks public visual reuse and prepares a one-off JPEG fallback", () => {
  assert.match(APP_JS, /\/api\/visuals\/check/);
  assert.match(APP_JS, /toDataURL\("image\/jpeg"/);
  assert.match(APP_JS, /generatedCover/);
  assert.match(APP_JS, /public cover is unique/i);
});

test("a text-only public page uses its unique generated editorial cover", async () => {
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
  assert.equal(repeated.status, 409);
  assert.match((await repeated.json()).error, /new preview/i);

  const removed = await handleRequest(new Request(`${origin}/api/articles/${created.slug}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${created.deleteToken}` },
  }), { VIBE_SHARE_DB: db, VIBE_SHARE_COVERS: covers });
  assert.equal(removed.status, 200);
  assert.equal(covers.rows.size, 0);
  const removedImage = await handleRequest(new Request(stored.visual.imageUrl), { VIBE_SHARE_DB: db, VIBE_SHARE_COVERS: covers });
  assert.equal(removedImage.status, 404);
});

test("a photograph cannot be reused after deletion and the checked preview uses a unique cover", async () => {
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

  const check = await handleRequest(new Request(`${origin}/api/visuals/check`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ imageUrls: [snapshot.visual.imageUrl] }),
  }), env);
  assert.deepEqual(await check.json(), { used: [snapshot.visual.imageUrl] });

  const secondResponse = await handleRequest(new Request(`${origin}/api/articles`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ snapshot: { ...snapshot, visual: null, inlineVisuals: [] }, generatedCover, turnstileToken: "local-test" }),
  }), env);
  const second = await secondResponse.json();
  assert.equal(secondResponse.status, 201);
  const secondSnapshot = JSON.parse(db.rows.get(second.slug).snapshot_json);
  assert.equal(secondSnapshot.visual.kind, "typography");
  assert.equal(secondSnapshot.visual.imageUrl, `${origin}/i/${second.slug}.jpg`);
  assert.equal(db.visuals.has("https://blog.luanti.org/static/blog/2026_dmca/cover.webp"), true);

  const racedResponse = await publishArticle();
  assert.equal(racedResponse.status, 409);
  assert.match((await racedResponse.json()).error, /preview and share again/i);
});

test("the visual check reports the same published image despite crop query changes", async () => {
  const db = new MemoryDb();
  db.visuals.set("https://images.example.org/photo.jpg", { article_slug: "old" });
  const response = await handleRequest(new Request(`${origin}/api/visuals/check`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ imageUrls: ["https://images.example.org/photo.jpg?crop=faces&w=1200"] }),
  }), { VIBE_SHARE_DB: db, VIBE_SHARE_LOCAL_DEV: "true" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { used: ["https://images.example.org/photo.jpg?crop=faces&w=1200"] });
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
