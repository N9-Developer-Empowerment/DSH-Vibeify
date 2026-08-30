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
  constructor() { this.rows = new Map(); this.limits = new Map(); }
  prepare(sql) {
    const db = this;
    return {
      bind(...values) {
        return {
          async run() {
            if (sql.startsWith("INSERT")) {
              const [slug, snapshotJson, createdAt, expiresAt, deleteTokenHash] = values;
              if (db.rows.has(slug)) throw new Error("duplicate");
              db.rows.set(slug, { snapshot_json: snapshotJson, created_at: createdAt, expires_at: expiresAt, delete_token_hash: deleteTokenHash });
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith("DELETE")) {
              const [slug, tokenHash] = values;
              const row = db.rows.get(slug);
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
            if (!sql.startsWith("SELECT")) throw new Error(`unexpected first: ${sql}`);
            return db.rows.get(values[0]) ?? null;
          },
        };
      },
    };
  }
}

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

test("new public pages require at least one image", async () => {
  const db = new MemoryDb();
  const response = await handleRequest(new Request(`${origin}/api/articles`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ snapshot: { ...snapshot, visual: null, inlineVisuals: [] }, turnstileToken: "local-test" }),
  }), { VIBE_SHARE_DB: db, VIBE_SHARE_LOCAL_DEV: "true" });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /image/i);
  assert.equal(db.rows.size, 0);
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
