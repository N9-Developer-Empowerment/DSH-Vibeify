import { createHash } from "node:crypto";

const DEFAULT_TIMEOUT_MS = 15_000;
const META_GRAPH_VERSION = "v26.0";

function clean(value, limit = 240) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, limit) : "";
}

function nestedConfig(config, channel) {
  if (config?.[channel] !== null && typeof config?.[channel] === "object") return config[channel];
  const prefix = channel.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  return Object.fromEntries(Object.entries(config ?? {}).flatMap(([key, value]) => {
    if (!key.startsWith(prefix) || key.length === prefix.length) return [];
    const field = `${key[prefix.length].toLowerCase()}${key.slice(prefix.length + 1)}`;
    return [[field, value]];
  }));
}

function tokenRef(config, fallback) {
  const ref = clean(config?.tokenRef ?? config?.accessTokenRef ?? config?.appPasswordRef, 100);
  return /^[A-Z_][A-Z0-9_]*$/.test(ref) ? ref : fallback;
}

async function defaultFetchJson(url, options = {}) {
  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const response = await fetch(url, { ...options, signal: options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout]) });
  if (!response.ok) throw Object.assign(new Error("The social network rejected the request."), { code: `remote-http-${response.status}` });
  const document = await response.json();
  if (document === null || typeof document !== "object" || Array.isArray(document)) throw Object.assign(new Error("The social network returned an invalid result."), { code: "remote-invalid-result" });
  return document;
}

function headers(token, contentType = "application/json") {
  return { accept: "application/json", "content-type": contentType, authorization: `Bearer ${token}` };
}

function form(values) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== null && value !== undefined && value !== "") body.set(key, String(value));
  return body;
}

function connector({ channel, getConfig, resolveCredential, configuredFields = [], publish }) {
  return Object.freeze({
    async configured() {
      const config = nestedConfig(getConfig() ?? {}, channel);
      if (config.enabled !== true || configuredFields.some((field) => clean(config[field]) === "")) return false;
      const secret = await resolveCredential(tokenRef(config, `${channel.replaceAll("-", "_").toUpperCase()}_ACCESS_TOKEN`));
      return typeof secret === "string" && secret.length > 0;
    },
    async publish(item) {
      const config = nestedConfig(getConfig() ?? {}, channel);
      const secret = await resolveCredential(tokenRef(config, `${channel.replaceAll("-", "_").toUpperCase()}_ACCESS_TOKEN`));
      if (config.enabled !== true || typeof secret !== "string" || secret.length === 0) throw Object.assign(new Error("Connect this channel in Settings before posting."), { code: "channel-not-configured" });
      return publish(item, config, secret);
    },
  });
}

export function createOfficialConnectorRegistry({ getConfig, resolveCredential, fetchJson = defaultFetchJson, now = Date.now } = {}) {
  if (typeof getConfig !== "function" || typeof resolveCredential !== "function") throw new TypeError("Social connector settings and credentials are required.");

  const x = connector({
    channel: "x", getConfig, resolveCredential,
    publish: async (item, config, token) => {
      const result = await fetchJson("https://api.x.com/2/tweets", { method: "POST", headers: headers(token), body: JSON.stringify({ text: item.text }) });
      const id = clean(result?.data?.id, 100);
      if (id === "") throw Object.assign(new Error("X did not return a post id."), { code: "remote-invalid-result" });
      const username = clean(config.username, 80).replace(/^@/, "");
      return { remoteId: id, remoteUrl: username === "" ? null : `https://x.com/${encodeURIComponent(username)}/status/${encodeURIComponent(id)}` };
    },
  });

  const bluesky = Object.freeze({
    async configured() {
      const config = nestedConfig(getConfig() ?? {}, "bluesky");
      if (config.enabled !== true || clean(config.handle) === "") return false;
      const password = await resolveCredential(tokenRef(config, "BLUESKY_APP_PASSWORD"));
      return typeof password === "string" && password.length > 0;
    },
    async publish(item) {
      const config = nestedConfig(getConfig() ?? {}, "bluesky");
      const password = await resolveCredential(tokenRef(config, "BLUESKY_APP_PASSWORD"));
      if (config.enabled !== true || clean(config.handle) === "" || typeof password !== "string" || password.length === 0) throw Object.assign(new Error("Connect Bluesky in Settings before posting."), { code: "channel-not-configured" });
      const session = await fetchJson("https://bsky.social/xrpc/com.atproto.server.createSession", {
        method: "POST", headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ identifier: clean(config.handle, 200), password }),
      });
      const did = clean(session.did, 240);
      const jwt = clean(session.accessJwt, 8_000);
      if (did === "" || jwt === "") throw Object.assign(new Error("Bluesky could not open a posting session."), { code: "remote-invalid-result" });
      const rkey = `vibe${createHash("sha256").update(item.idempotencyKey).digest("hex").slice(0, 20)}`;
      const result = await fetchJson("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
        method: "POST", headers: headers(jwt), body: JSON.stringify({
          repo: did, collection: "app.bsky.feed.post", rkey,
          record: { $type: "app.bsky.feed.post", text: item.text, createdAt: new Date(now()).toISOString() },
        }),
      });
      const uri = clean(result.uri, 500);
      if (uri === "") throw Object.assign(new Error("Bluesky did not return a post id."), { code: "remote-invalid-result" });
      return { remoteId: uri, remoteUrl: null };
    },
  });

  const threads = connector({
    channel: "threads", getConfig, resolveCredential, configuredFields: ["userId"],
    publish: async (item, config, token) => {
      const creation = await fetchJson(`https://graph.threads.net/v1.0/${encodeURIComponent(clean(config.userId, 120))}/threads`, {
        method: "POST", headers: { accept: "application/json" }, body: form({ media_type: "TEXT", text: item.text, access_token: token }),
      });
      const creationId = clean(creation.id, 120);
      const result = await fetchJson(`https://graph.threads.net/v1.0/${encodeURIComponent(clean(config.userId, 120))}/threads_publish`, {
        method: "POST", headers: { accept: "application/json" }, body: form({ creation_id: creationId, access_token: token }),
      });
      const id = clean(result.id, 120);
      if (id === "") throw Object.assign(new Error("Threads did not return a post id."), { code: "remote-invalid-result" });
      return { remoteId: id, remoteUrl: null };
    },
  });

  const facebookPage = connector({
    channel: "facebook-page", getConfig, resolveCredential, configuredFields: ["pageId"],
    publish: async (item, config, token) => {
      const result = await fetchJson(`https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(clean(config.pageId, 120))}/feed`, {
        method: "POST", headers: { accept: "application/json" }, body: form({ message: item.text, link: item.snapshot.publicUrl, access_token: token }),
      });
      const id = clean(result.id, 120);
      if (id === "") throw Object.assign(new Error("Facebook did not return a post id."), { code: "remote-invalid-result" });
      return { remoteId: id, remoteUrl: null };
    },
  });

  const instagram = connector({
    channel: "instagram", getConfig, resolveCredential, configuredFields: ["userId"],
    publish: async (item, config, token) => {
      const imageUrl = item.snapshot?.visual?.imageUrl;
      if (typeof imageUrl !== "string" || !imageUrl.startsWith("https://")) throw Object.assign(new Error("Instagram needs a public article image."), { code: "image-required" });
      const creation = await fetchJson(`https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(clean(config.userId, 120))}/media`, {
        method: "POST", headers: { accept: "application/json" }, body: form({ image_url: imageUrl, caption: item.text, access_token: token }),
      });
      const creationId = clean(creation.id, 120);
      const result = await fetchJson(`https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(clean(config.userId, 120))}/media_publish`, {
        method: "POST", headers: { accept: "application/json" }, body: form({ creation_id: creationId, access_token: token }),
      });
      const id = clean(result.id, 120);
      if (id === "") throw Object.assign(new Error("Instagram did not return a post id."), { code: "remote-invalid-result" });
      return { remoteId: id, remoteUrl: null };
    },
  });

  return Object.freeze({ x, bluesky, threads, "facebook-page": facebookPage, instagram });
}
