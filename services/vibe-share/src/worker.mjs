import { cleanShareSnapshot, hasShareVisual } from "../../../shared/vibe-share-contract.js";
import { renderNewPage, renderNotFound, renderPublicArticle } from "./render.mjs";
import { APP_JS } from "./app-source.mjs";

const JSON_HEADERS = Object.freeze({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
const HTML_HEADERS = Object.freeze({
  "content-type": "text/html; charset=utf-8",
  "content-security-policy": "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'self' https://challenges.cloudflare.com; frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://open.spotify.com https://w.soundcloud.com https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
});

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: JSON_HEADERS });
}

function html(value, status = 200, cacheControl = "no-store") {
  return new Response(value, { status, headers: { ...HTML_HEADERS, "cache-control": cacheControl } });
}

function head(response) {
  return new Response(null, { status: response.status, statusText: response.statusText, headers: response.headers });
}

function bytesToBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function randomToken(size) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function sha256Bytes(value) {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return bytesToBase64Url(new Uint8Array(digest));
}

async function verifyTurnstile(token, request, env) {
  if (env.VIBE_SHARE_LOCAL_DEV === "true") return true;
  if (typeof env.TURNSTILE_SECRET !== "string" || env.TURNSTILE_SECRET === "" || typeof token !== "string" || token === "") return false;
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET);
  form.set("response", token);
  const remoteIp = request.headers.get("CF-Connecting-IP");
  if (remoteIp !== null) form.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true;
}

function database(env) {
  return env.VIBE_SHARE_DB ?? env.DB;
}

function coverStore(env) {
  return env.VIBE_SHARE_COVERS ?? env.COVERS;
}

function publicVisualKey(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
    url.hash = "";
    url.search = "";
    url.hostname = url.hostname.toLowerCase();
    return url.href;
  } catch {
    return null;
  }
}

const VISUAL_PRIORITY = Object.freeze({ photograph: 0, "editorial-image": 1, "ai-generated": 2, "ai-graphic": 3, typography: 4 });

function rankedVisuals(snapshot) {
  const rows = [snapshot.visual, ...(snapshot.inlineVisuals ?? [])].filter((row) => row !== null);
  return rows.map((visual, index) => ({ visual, index }))
    .sort((left, right) => (VISUAL_PRIORITY[left.visual.kind] ?? 9) - (VISUAL_PRIORITY[right.visual.kind] ?? 9) || left.index - right.index)
    .map(({ visual }) => visual);
}

function snapshotWithVisuals(snapshot, visuals) {
  return Object.freeze({ ...snapshot, visual: visuals[0] ?? null, inlineVisuals: Object.freeze(visuals.slice(1, 4)) });
}

function cleanGeneratedCover(value) {
  if (typeof value !== "string" || !value.startsWith("data:image/jpeg;base64,") || value.length > 430_000) return null;
  try {
    const binary = atob(value.slice("data:image/jpeg;base64,".length));
    if (binary.length < 2_000 || binary.length > 300_000) return null;
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
    return bytes;
  } catch {
    return null;
  }
}

function typographicVisual(url, slug, title) {
  return Object.freeze({
    imageUrl: `${url.origin}/i/${slug}.jpg`,
    sourceUrl: `${url.origin}/a/${slug}`,
    alt: `Editorial typographic cover for ${title}`,
    credit: "Editorial typography · created uniquely for this article",
    kind: "typography",
  });
}

async function reserveVisualKey(db, key, slug, kind, now) {
  const result = await db.prepare("INSERT OR IGNORE INTO published_visuals (visual_key, article_slug, visual_kind, created_at) VALUES (?, ?, ?, ?)")
    .bind(key, slug, kind, now).run();
  return Number(result.meta?.changes ?? 0) === 1;
}

async function reserveVisual(db, visual, slug, now) {
  const key = publicVisualKey(visual.imageUrl);
  return key !== null && reserveVisualKey(db, key, slug, visual.kind, now);
}

function positiveLimit(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function incrementDailyLimit(db, bucket, clientHash, now) {
  return db.prepare(`INSERT INTO daily_publish_limits (bucket, client_hash, count, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT (bucket, client_hash) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at
    RETURNING count`).bind(bucket, clientHash, now).first();
}

async function verifyManagedRateLimit(request, env) {
  const db = database(env);
  const secret = env.VIBE_SHARE_RATE_SECRET;
  if (db === undefined || typeof secret !== "string" || secret.length < 32) return false;
  const address = request.headers.get("CF-Connecting-IP") ?? request.headers.get("x-real-ip") ?? "unknown";
  const bucket = new Date().toISOString().slice(0, 10);
  const clientHash = await sha256(`${secret}\n${bucket}\n${address}`);
  const now = Date.now();
  const client = await incrementDailyLimit(db, bucket, clientHash, now);
  if (Number(client?.count ?? Infinity) > positiveLimit(env.VIBE_SHARE_CLIENT_DAILY_LIMIT, 12)) return false;
  const global = await incrementDailyLimit(db, bucket, "global", now);
  return Number(global?.count ?? Infinity) <= positiveLimit(env.VIBE_SHARE_GLOBAL_DAILY_LIMIT, 500);
}

async function verifyPublishProtection(token, request, env) {
  if (env.VIBE_SHARE_LOCAL_DEV === "true") return true;
  if (typeof env.TURNSTILE_SECRET === "string" && env.TURNSTILE_SECRET !== "") {
    return verifyTurnstile(token, request, env);
  }
  return verifyManagedRateLimit(request, env);
}

function allowedRetention(env, requested) {
  const configured = Number(env.VIBE_SHARE_RETENTION_DAYS ?? 365);
  const ceiling = Number.isInteger(configured) && configured >= 30 && configured <= 365 ? configured : 365;
  const value = Number(requested ?? ceiling);
  return [30, 90, 365].includes(value) ? Math.min(value, ceiling) : ceiling;
}

async function createArticle(request, env, url) {
  const db = database(env);
  if (db === undefined) return json({ error: "Publishing storage is not configured" }, 503);
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin !== url.origin) return json({ error: "This publish request did not come from the share preview" }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > 450_000) return json({ error: "Article is too large" }, 413);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid article request" }, 400); }
  const snapshot = cleanShareSnapshot(body?.snapshot);
  if (snapshot === null) return json({ error: "Article failed the public-share privacy contract" }, 400);
  const generatedCover = cleanGeneratedCover(body?.generatedCover);
  if (!hasShareVisual(snapshot) && generatedCover === null) return json({ error: "A public article needs a fresh image or its unique editorial cover" }, 400);
  if (generatedCover !== null && coverStore(env) === undefined) return json({ error: "Unique editorial cover storage is not configured" }, 503);
  if (!await verifyPublishProtection(body?.turnstileToken, request, env)) return json({ error: "Publishing protection could not approve this request. Please try again later." }, 403);

  const now = Date.now();
  const retentionDays = allowedRetention(env, body?.retentionDays);
  const expiresAt = now + retentionDays * 24 * 60 * 60 * 1000;
  const deleteToken = randomToken(32);
  const deleteTokenHash = await sha256(deleteToken);
  let slug;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    slug = randomToken(9);
    const fallbackVisual = generatedCover === null ? null : typographicVisual(url, slug, snapshot.title);
    const initialSnapshot = fallbackVisual === null ? snapshot : snapshotWithVisuals(snapshot, [fallbackVisual]);
    try {
      await db.prepare("INSERT INTO articles (slug, snapshot_json, created_at, expires_at, delete_token_hash) VALUES (?, ?, ?, ?, ?)")
        .bind(slug, JSON.stringify(initialSnapshot), now, expiresAt, deleteTokenHash).run();
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      slug = undefined;
    }
  }
  if (generatedCover !== null) {
    try {
      await coverStore(env).put(`covers/${slug}.jpg`, generatedCover, { httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000, immutable" } });
    } catch {
      await db.prepare("DELETE FROM articles WHERE slug = ?").bind(slug).run();
      return json({ error: "The unique editorial cover could not be stored" }, 503);
    }
  }

  const selected = [];
  try {
    for (const visual of rankedVisuals(snapshot)) {
      if (await reserveVisual(db, visual, slug, now)) selected.push(visual);
    }
  } catch {
    await db.prepare("DELETE FROM articles WHERE slug = ?").bind(slug).run();
    return json({ error: "Unique-image protection is not configured" }, 503);
  }
  if (selected.length === 0) {
    if (hasShareVisual(snapshot)) {
      await db.prepare("DELETE FROM articles WHERE slug = ?").bind(slug).run();
      if (generatedCover !== null && typeof coverStore(env).delete === "function") await coverStore(env).delete(`covers/${slug}.jpg`);
      return json({ error: "That image was published while this preview was open. Open Preview and Share again to review a fresh cover." }, 409);
    }
    if (generatedCover === null) {
      await db.prepare("DELETE FROM articles WHERE slug = ?").bind(slug).run();
      return json({ error: "That image has already appeared publicly. Reopen Preview and Share for a unique editorial cover." }, 409);
    }
    const fallback = typographicVisual(url, slug, snapshot.title);
    const uniqueCover = await reserveVisualKey(db, `generated:${await sha256Bytes(generatedCover)}`, slug, fallback.kind, now);
    if (!uniqueCover) {
      await db.prepare("DELETE FROM articles WHERE slug = ?").bind(slug).run();
      if (typeof coverStore(env).delete === "function") await coverStore(env).delete(`covers/${slug}.jpg`);
      return json({ error: "That generated cover has already appeared publicly. Open a new preview to make a fresh one." }, 409);
    }
  } else {
    await db.prepare("UPDATE articles SET snapshot_json = ? WHERE slug = ?").bind(JSON.stringify(snapshotWithVisuals(snapshot, selected)), slug).run();
    if (generatedCover !== null && typeof coverStore(env).delete === "function") await coverStore(env).delete(`covers/${slug}.jpg`);
  }
  return json({ slug, url: `${url.origin}/a/${slug}`, deleteToken, expiresAt }, 201);
}

async function checkVisuals(request, env, url) {
  const db = database(env);
  if (db === undefined) return json({ error: "Publishing storage is not configured" }, 503);
  if (request.headers.get("origin") !== url.origin) return json({ error: "This check did not come from the share preview" }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid visual check" }, 400); }
  const imageUrls = Array.isArray(body?.imageUrls) ? body.imageUrls.slice(0, 4) : [];
  if (imageUrls.some((value) => typeof value !== "string" || publicVisualKey(value) === null)) return json({ error: "Invalid public image URL" }, 400);
  const used = [];
  try {
    for (const imageUrl of imageUrls) {
      const row = await db.prepare("SELECT visual_key FROM published_visuals WHERE visual_key = ?").bind(publicVisualKey(imageUrl)).first();
      if (row !== null) used.push(imageUrl);
    }
  } catch {
    return json({ error: "Unique-image protection is not configured" }, 503);
  }
  return json({ used });
}

async function getCover(env, slug) {
  const db = database(env);
  const store = coverStore(env);
  if (db === undefined || store === undefined) return new Response(null, { status: 404 });
  const article = await db.prepare("SELECT expires_at FROM articles WHERE slug = ?").bind(slug).first();
  if (article === null || Number(article.expires_at) <= Date.now()) return new Response(null, { status: 404 });
  const object = await store.get(`covers/${slug}.jpg`);
  if (object === null) return new Response(null, { status: 404 });
  return new Response(await object.arrayBuffer(), { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
}

async function getArticle(env, url, slug) {
  const db = database(env);
  if (db === undefined) return html(renderNotFound(), 404);
  const row = await db.prepare("SELECT snapshot_json, expires_at FROM articles WHERE slug = ?").bind(slug).first();
  if (row === null || Number(row.expires_at) <= Date.now()) return html(renderNotFound(), 404);
  let snapshot;
  try {
    const parsed = JSON.parse(row.snapshot_json);
    snapshot = cleanShareSnapshot(parsed, Math.max(Date.now(), Number(parsed?.publishedAt) || 0));
  } catch { snapshot = null; }
  if (snapshot === null) return html(renderNotFound(), 404);
  return html(renderPublicArticle(snapshot, `${url.origin}/a/${slug}`), 200, "public, max-age=300, stale-while-revalidate=86400");
}

async function deleteArticle(request, env, slug) {
  const db = database(env);
  if (db === undefined) return json({ error: "Publishing storage is not configured" }, 503);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (token === "") return json({ error: "Removal token required" }, 401);
  const tokenHash = await sha256(token);
  const result = await db.prepare("DELETE FROM articles WHERE slug = ? AND delete_token_hash = ?").bind(slug, tokenHash).run();
  if (Number(result.meta?.changes ?? 0) !== 1) return json({ error: "Article or removal token not found" }, 404);
  const store = coverStore(env);
  if (store !== undefined && typeof store.delete === "function") await store.delete(`covers/${slug}.jpg`);
  return json({ removed: true });
}

export async function handleRequest(request, env = {}) {
  const url = new URL(request.url);
  if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/robots.txt") {
    const response = new Response("User-agent: *\nAllow: /\n", {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" },
    });
    return request.method === "HEAD" ? head(response) : response;
  }
  if (request.method === "GET" && url.pathname === "/new") return html(renderNewPage({
    turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? "",
    localDev: env.VIBE_SHARE_LOCAL_DEV === "true",
    publishingReady: env.VIBE_SHARE_LOCAL_DEV === "true" || (typeof env.TURNSTILE_SECRET === "string" && env.TURNSTILE_SECRET !== "") || (typeof env.VIBE_SHARE_RATE_SECRET === "string" && env.VIBE_SHARE_RATE_SECRET.length >= 32),
  }));
  if (request.method === "GET" && url.pathname === "/app.js") return new Response(APP_JS, { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff" } });
  if (request.method === "POST" && url.pathname === "/api/visuals/check") return checkVisuals(request, env, url);
  if (request.method === "POST" && url.pathname === "/api/articles") return createArticle(request, env, url);
  const cover = /^\/i\/([A-Za-z0-9_-]{8,24})\.jpg$/.exec(url.pathname);
  if ((request.method === "GET" || request.method === "HEAD") && cover !== null) {
    const response = await getCover(env, cover[1]);
    return request.method === "HEAD" ? head(response) : response;
  }
  const article = /^\/a\/([A-Za-z0-9_-]{8,24})$/.exec(url.pathname);
  if (request.method === "GET" && article !== null) return getArticle(env, url, article[1]);
  if (request.method === "HEAD" && article !== null) return head(await getArticle(env, url, article[1]));
  const deletion = /^\/api\/articles\/([A-Za-z0-9_-]{8,24})$/.exec(url.pathname);
  if (request.method === "DELETE" && deletion !== null) return deleteArticle(request, env, deletion[1]);
  if (request.method === "GET" && url.pathname === "/") return Response.redirect(`${url.origin}/new`, 302);
  return html(renderNotFound(), 404);
}

export default { fetch: handleRequest };
