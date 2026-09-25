import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { SHARE_ORIGIN, SHARE_SNAPSHOT_VERSION } from "../../shared/vibe-share-contract.js";
import {
  beginSharePreview,
  copyPublicShareUrl,
  publicShareUrl,
  sharePublicUrl,
  shareSnapshotForChunk,
} from "./client-src/experience/share-client.js";

const snapshot = Object.freeze({
  version: SHARE_SNAPSHOT_VERSION,
  title: "A public article",
  kind: "article",
  markdown: "Useful public copy.",
  publishedAt: Date.UTC(2026, 7, 29, 9, 45, 0),
  visual: null,
  inlineVisuals: Object.freeze([]),
  contentLink: null,
});

const shellSource = readFileSync(new URL("./client-src/experience/shell.jsx", import.meta.url), "utf8");

test("DSH sends an article only after the exact share page completes its opener handshake", () => {
  const messages = [];
  const statuses = [];
  const preview = { postMessage(value, origin) { messages.push({ value, origin }); } };
  let listener;
  let removed = false;
  let timerCancelled = false;
  const result = beginSharePreview(snapshot, {
    openWindow(url, name) {
      assert.equal(url, `${SHARE_ORIGIN}/new`);
      assert.equal(name, "vibe-share");
      return preview;
    },
    addMessageListener(value) { listener = value; },
    removeMessageListener(value) { assert.equal(value, listener); removed = true; },
    setTimer() { return 9; },
    clearTimer(value) { assert.equal(value, 9); timerCancelled = true; },
    onStatus(value) { statuses.push(value); },
  });

  assert.equal(result.opened, true);
  assert.deepEqual(statuses, ["opening"]);
  listener({ source: preview, origin: "https://lookalike.example", data: { type: "vibe-share:ready", version: SHARE_SNAPSHOT_VERSION } });
  listener({ source: {}, origin: SHARE_ORIGIN, data: { type: "vibe-share:ready", version: SHARE_SNAPSHOT_VERSION } });
  assert.equal(messages.length, 0);

  listener({ source: preview, origin: SHARE_ORIGIN, data: { type: "vibe-share:ready", version: SHARE_SNAPSHOT_VERSION } });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].origin, SHARE_ORIGIN);
  assert.equal(messages[0].value.type, "vibe-share:snapshot");
  assert.equal(messages[0].value.snapshot.title, "A public article");
  assert.equal(removed, true);
  assert.equal(timerCancelled, true);
  assert.deepEqual(statuses, ["opening", "transferred"]);
});

test("a blocked share window never transmits article content", () => {
  const statuses = [];
  const result = beginSharePreview(snapshot, {
    openWindow() { return null; },
    addMessageListener() { assert.fail("no listener should be installed"); },
    onStatus(value) { statuses.push(value); },
  });

  assert.equal(result.opened, false);
  assert.deepEqual(statuses, ["blocked"]);
});

test("a Vibe card maps only its public rendering into the share snapshot", () => {
  const result = shareSnapshotForChunk({
    chunk: {
      id: "private-local-id",
      title: "A public article",
      kind: "article",
      publishedAt: snapshot.publishedAt,
      source: "fresh-stream",
      tribes: ["private-local-lens"],
    },
    markdown: "Useful public copy.",
    media: {
      externalUrl: "https://images.example.org/lead.webp",
      href: "https://images.example.org/lead-source",
      alt: "A relevant public photograph",
      label: "Photograph · Example",
      internalCatalogueId: "private-catalogue-id",
    },
    inlineVisuals: [],
    contentLink: { href: "https://example.org/article", label: "Read the article" },
  }, snapshot.publishedAt);

  assert.equal(result.title, "A public article");
  assert.equal(result.visual.imageUrl, "https://images.example.org/lead.webp");
  assert.equal(result.visual.kind, "photograph");
  assert.doesNotMatch(JSON.stringify(result), /private-local-id|private-local-lens|private-catalogue-id|fresh-stream/);
});

test("a bundled Vibe photograph keeps a public copy when the article is shared", () => {
  const result = shareSnapshotForChunk({
    chunk: {
      title: "Sound, patience and belief",
      kind: "article",
      publishedAt: snapshot.publishedAt,
    },
    markdown: "A finished public article.",
    media: {
      artwork: "sayItBetter",
      alt: "Two people talking together",
      href: "https://unsplash.com/photos/example",
      label: "Photograph · Example",
      episode: {
        photo: {
          publicImageUrl: "https://images.unsplash.com/photo-example?auto=format&fit=crop&w=1600&q=82",
        },
      },
    },
    inlineVisuals: [],
    contentLink: null,
  }, snapshot.publishedAt);

  assert.equal(result.visual.imageUrl, "https://images.unsplash.com/photo-example?auto=format&fit=crop&w=1600&q=82");
  assert.equal(result.visual.sourceUrl, "https://unsplash.com/photos/example");
  assert.equal(result.visual.kind, "photograph");
});

test("a card's fixed-provider player is preserved without transferring iframe source code", () => {
  const result = shareSnapshotForChunk({
    chunk: { title: "Listen closely", kind: "music", publishedAt: snapshot.publishedAt },
    markdown: "A public article with a song.",
    media: null,
    inlineVisuals: [],
    contentLink: null,
    embeddedMedia: {
      kind: "music",
      label: "Open SoundCloud player",
      href: "https://soundcloud.com/the-orca-band/i-know-you-better",
      src: "https://w.soundcloud.com/player/?private-client-state=discarded",
    },
  }, snapshot.publishedAt);

  assert.deepEqual(result.media, {
    provider: "soundcloud",
    kind: "music",
    label: "Open SoundCloud player",
    href: "https://soundcloud.com/the-orca-band/i-know-you-better",
  });
  assert.doesNotMatch(JSON.stringify(result), /private-client-state|w\.soundcloud/);
});

test("native sharing preserves the exact public URL encoding and never reports a post", async () => {
  const url = "https://soundcloud.com/the-orca-band/track?ref=a%2Fb&title=one%20two%2Bthree#part-2";
  const calls = [];
  const result = await sharePublicUrl(url, "A finished Vibe", {
    async share(value) { calls.push(value); },
  });

  assert.equal(result, "shared");
  assert.deepEqual(calls, [{ title: "A finished Vibe", url }]);
  assert.equal(publicShareUrl(url), url);
});

test("unsupported URLs are rejected before native share or clipboard access", async () => {
  let shareCalls = 0;
  let copyCalls = 0;
  const navigatorObject = { async share() { shareCalls += 1; } };
  const clipboard = { async writeText() { copyCalls += 1; } };

  for (const url of [
    "javascript:alert(1)",
    "http://example.org/public",
    "https://user:pass@example.org/public",
    "/article/1",
    "not a url",
    "https://localhost/article",
    "https://vibe.local/article",
    "https://127.0.0.1/article",
    "https://10.2.3.4/article",
    "https://172.16.2.3/article",
    "https://192.168.2.3/article",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/article",
  ]) {
    assert.equal(publicShareUrl(url), null);
    assert.equal(await sharePublicUrl(url, "Article", navigatorObject), "unsupported");
    assert.equal(await copyPublicShareUrl(url, clipboard), false);
  }

  assert.equal(shareCalls, 0);
  assert.equal(copyCalls, 0);
});

test("clipboard failure leaves the ordinary selectable URL fallback available", async () => {
  const url = "https://example.org/article?id=a%2Fb&next=one%20two";
  let copiedValue = null;
  assert.equal(await copyPublicShareUrl(url, {
    async writeText(value) { copiedValue = value; throw new Error("clipboard denied"); },
  }), false);
  assert.equal(copiedValue, url);
  assert.equal(await copyPublicShareUrl(url, null), false);
});

test("native share cancellation is reported as cancellation and does not fall back to posting", async () => {
  const url = "https://example.org/article";
  const error = new Error("reader closed the share sheet");
  error.name = "AbortError";
  let calls = 0;
  const result = await sharePublicUrl(url, "Article", {
    async share() { calls += 1; throw error; },
  });

  assert.equal(result, "cancelled");
  assert.equal(calls, 1);
});

test("simple public-link sharing has no legacy Social Desk RPC or schedule path", () => {
  assert.match(shellSource, /function PublicLinkShare/);
  assert.match(shellSource, /Share link/);
  assert.doesNotMatch(shellSource, /social-desk-client|dsh-social-desk|approve-and-schedule|prepareSocialPosts|SocialDeskPanel/);
});
