import assert from "node:assert/strict";
import test from "node:test";

import { createOfficialConnectorRegistry } from "./official-connectors.js";

const item = Object.freeze({
  id: "social-1",
  idempotencyKey: "social-1-approved-1",
  text: "Reviewed words https://share.codingforjustice.org.uk/a/safe",
  snapshot: {
    title: "Reviewed article",
    visual: { imageUrl: "https://images.example.org/article.jpg" },
  },
});

test("X uses an official user-context request and never returns the bearer token", async () => {
  const requests = [];
  const registry = createOfficialConnectorRegistry({
    getConfig: () => ({ x: { enabled: true, tokenRef: "X_USER_TOKEN" } }),
    resolveCredential: async () => "super-secret-token",
    fetchJson: async (url, options) => {
      requests.push({ url: String(url), options });
      return { data: { id: "123" } };
    },
  });
  const result = await registry.x.publish(item);

  assert.equal(requests[0].url, "https://api.x.com/2/tweets");
  assert.equal(requests[0].options.method, "POST");
  assert.equal(requests[0].options.headers.authorization, "Bearer super-secret-token");
  assert.deepEqual(JSON.parse(requests[0].options.body), { text: item.text });
  assert.deepEqual(result, { remoteId: "123", remoteUrl: null });
  assert.doesNotMatch(JSON.stringify(result), /super-secret-token/);
});

test("Bluesky uses a stable record key so an approved item cannot be duplicated by retry", async () => {
  const requests = [];
  const registry = createOfficialConnectorRegistry({
    getConfig: () => ({ bluesky: { enabled: true, handle: "example.bsky.social", appPasswordRef: "BLUESKY_APP_PASSWORD" } }),
    resolveCredential: async () => "app-password-secret",
    fetchJson: async (url, options) => {
      requests.push({ url: String(url), options });
      if (String(url).endsWith("createSession")) return { did: "did:plc:example", accessJwt: "short-session-token" };
      return { uri: "at://did:plc:example/app.bsky.feed.post/stable", cid: "cid" };
    },
    now: () => Date.UTC(2026, 7, 31, 10, 0, 0),
  });
  const result = await registry.bluesky.publish(item);
  const body = JSON.parse(requests[1].options.body);

  assert.match(body.rkey, /^vibe/);
  assert.equal(body.collection, "app.bsky.feed.post");
  assert.equal(body.record.text, item.text);
  assert.equal(result.remoteId, "at://did:plc:example/app.bsky.feed.post/stable");
  assert.doesNotMatch(JSON.stringify(result), /password|session-token/i);
});

test("manual channels have no connector and configured checks do not expose credential values", async () => {
  const registry = createOfficialConnectorRegistry({
    getConfig: () => ({}),
    resolveCredential: async () => "should-not-be-read",
    fetchJson: async () => { throw new Error("should not fetch"); },
  });

  assert.equal(registry.reddit, undefined);
  assert.equal(await registry.x.configured(), false);
  assert.equal(await registry.instagram.configured(), false);
});

test("Meta Page and Instagram publishing use the current Graph API and keep tokens out of receipts", async () => {
  const requests = [];
  const config = {
    "facebook-page": { enabled: true, pageId: "page-123", tokenRef: "FACEBOOK_PAGE_ACCESS_TOKEN" },
    instagram: { enabled: true, userId: "ig-456", tokenRef: "INSTAGRAM_ACCESS_TOKEN" },
  };
  const registry = createOfficialConnectorRegistry({
    getConfig: () => config,
    resolveCredential: async () => "meta-secret-token",
    fetchJson: async (url, options) => {
      requests.push({ url: String(url), options });
      return String(url).endsWith("/media") ? { id: "container-1" } : { id: "post-1" };
    },
  });

  const facebook = await registry["facebook-page"].publish(item);
  const instagram = await registry.instagram.publish(item);

  assert.equal(requests[0].url, "https://graph.facebook.com/v26.0/page-123/feed");
  assert.equal(requests[1].url, "https://graph.facebook.com/v26.0/ig-456/media");
  assert.equal(requests[2].url, "https://graph.facebook.com/v26.0/ig-456/media_publish");
  assert.equal(new URLSearchParams(requests[1].options.body).get("image_url"), item.snapshot.visual.imageUrl);
  assert.doesNotMatch(JSON.stringify({ facebook, instagram }), /meta-secret-token/);
});
