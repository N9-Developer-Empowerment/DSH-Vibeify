import test from "node:test";
import assert from "node:assert/strict";

import { SHARE_SNAPSHOT_VERSION } from "../../shared/vibe-share-contract.js";
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
  prompt: "must never cross the boundary",
  sessionId: "private-session",
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
  assert.match(page, /og:image/);
  assert.match(page, /cover\.webp/);
  assert.match(page, /The copyright robot has found cubes/);
  assert.doesNotMatch(page, /private-session|must never cross/);
});

test("preview describes the privacy boundary and production publishing fails closed", async () => {
  const preview = await handleRequest(new Request(`${origin}/new`), {});
  const previewHtml = await preview.text();
  assert.equal(preview.status, 200);
  assert.match(previewHtml, /Chat prompts, reasoning, sessions, settings and local history stay on your computer/);
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

  const wrongDelete = await handleRequest(new Request(`${origin}/api/articles/${created.slug}`, { method: "DELETE", headers: { authorization: "Bearer wrong" } }), { VIBE_SHARE_DB: db });
  assert.equal(wrongDelete.status, 404);
  const removed = await handleRequest(new Request(`${origin}/api/articles/${created.slug}`, { method: "DELETE", headers: { authorization: `Bearer ${created.deleteToken}` } }), { VIBE_SHARE_DB: db });
  assert.equal(removed.status, 200);
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
