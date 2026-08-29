import test from "node:test";
import assert from "node:assert/strict";

import { SHARE_ORIGIN, SHARE_SNAPSHOT_VERSION } from "../../shared/vibe-share-contract.js";
import { beginSharePreview, shareSnapshotForChunk } from "./client-src/experience/share-client.js";

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
  assert.doesNotMatch(JSON.stringify(result), /private-local-id|private-local-lens|private-catalogue-id|fresh-stream/);
});
