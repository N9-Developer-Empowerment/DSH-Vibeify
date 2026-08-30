import test from "node:test";
import assert from "node:assert/strict";

import {
  SHARE_ORIGIN,
  SHARE_SNAPSHOT_VERSION,
  cleanShareSnapshot,
  createShareTransfer,
  hasShareVisual,
  isShareReadyMessage,
} from "../../shared/vibe-share-contract.js";

const NOW = Date.UTC(2026, 7, 29, 9, 45, 0);

test("an article share contains presentation fields but no local session identity", () => {
  const snapshot = cleanShareSnapshot({
    version: SHARE_SNAPSHOT_VERSION,
    title: "What Jason Arday studied",
    kind: "article",
    markdown: "A public article with a [source](https://example.org/story?utm_source=vibe).",
    publishedAt: NOW,
    visual: {
      imageUrl: "https://images.example.org/jason.webp",
      sourceUrl: "https://images.example.org/portrait",
      alt: "Jason Arday speaking at a university",
      credit: "Photograph · Example University",
      kind: "photograph",
    },
    inlineVisuals: [{
      imageUrl: "https://images.example.org/library.webp",
      sourceUrl: "https://images.example.org/library",
      alt: "Books arranged in a university library",
      credit: "Photograph · Example University",
    }],
    contentLink: { href: "https://example.org/story?utm_source=vibe", label: "Read the original story" },
    chunkId: "private-session-derived-id",
    sessionId: "session-secret",
    prompt: "private prompt",
    tribes: ["builders-nerds"],
    reasoning: "private reasoning",
  }, NOW);

  assert.deepEqual(Object.keys(snapshot), [
    "version", "title", "kind", "markdown", "publishedAt", "visual", "inlineVisuals", "contentLink", "media",
  ]);
  assert.equal(snapshot.title, "What Jason Arday studied");
  assert.equal(snapshot.visual.imageUrl, "https://images.example.org/jason.webp");
  assert.equal(snapshot.visual.kind, "photograph");
  assert.equal(snapshot.inlineVisuals.length, 1);
  assert.equal(snapshot.contentLink.href, "https://example.org/story");
  assert.doesNotMatch(JSON.stringify(snapshot), /session-secret|private prompt|private reasoning|builders-nerds|private-session/);
});

test("public visuals keep a bounded provenance kind and infer legacy credits", () => {
  const cleaned = cleanShareSnapshot({
    version: SHARE_SNAPSHOT_VERSION,
    title: "A visual article",
    kind: "image",
    markdown: "Finished public copy.",
    publishedAt: NOW,
    visual: {
      imageUrl: "https://images.example.org/generated.jpg",
      sourceUrl: "https://example.org/story",
      alt: "A story-specific generated portrait",
      credit: "Generated image · Vibe editor",
      kind: "ai-generated",
    },
    inlineVisuals: [{
      imageUrl: "https://images.example.org/legacy.jpg",
      sourceUrl: "https://example.org/legacy",
      alt: "A documentary image",
      credit: "Photograph · Archive",
    }],
  }, NOW);

  assert.equal(cleaned.visual.kind, "ai-generated");
  assert.equal(cleaned.inlineVisuals[0].kind, "photograph");
  assert.doesNotMatch(JSON.stringify(cleaned), /made-up-kind/);
});

test("the public contract preserves only fixed-provider click-to-load media", () => {
  const youtube = cleanShareSnapshot({
    version: SHARE_SNAPSHOT_VERSION,
    title: "A filmed conversation",
    kind: "video",
    markdown: "Watch and read.",
    publishedAt: NOW,
    media: {
      href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=vibe",
      label: "Play the conversation",
      src: "https://attacker.example/iframe",
      arbitraryEmbedHtml: "<iframe src='file:///private'></iframe>",
    },
  }, NOW);
  assert.deepEqual(youtube.media, {
    provider: "youtube",
    kind: "video",
    label: "Play the conversation",
    href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });
  assert.doesNotMatch(JSON.stringify(youtube), /attacker|iframe|private/);

  const unsafe = cleanShareSnapshot({
    ...youtube,
    media: { href: "https://video.example/embed/123", label: "Play" },
  }, NOW);
  assert.equal(unsafe.media, null);
});

test("the public-share contract rejects unsafe URLs and non-article material", () => {
  assert.equal(cleanShareSnapshot({
    version: SHARE_SNAPSHOT_VERSION,
    title: "Question",
    kind: "questionnaire",
    markdown: "- One\n- Two",
    publishedAt: NOW,
  }, NOW), null);

  const snapshot = cleanShareSnapshot({
    version: SHARE_SNAPSHOT_VERSION,
    title: "A safe article",
    kind: "editorial",
    markdown: "Useful public copy.",
    publishedAt: NOW,
    visual: {
      imageUrl: "data:image/png;base64,secret",
      sourceUrl: "javascript:alert(1)",
      alt: "unsafe",
      credit: "unsafe",
    },
    contentLink: { href: "file:///private/path", label: "Private file" },
  }, NOW);

  assert.equal(snapshot.visual, null);
  assert.equal(snapshot.contentLink, null);
});

test("the opener handshake is versioned and pinned to the public share origin", () => {
  const snapshot = cleanShareSnapshot({
    version: SHARE_SNAPSHOT_VERSION,
    title: "A safe article",
    kind: "article",
    markdown: "Useful public copy.",
    publishedAt: NOW,
  }, NOW);
  const transfer = createShareTransfer(snapshot);

  assert.equal(SHARE_ORIGIN, "https://share.codingforjustice.org.uk");
  assert.deepEqual(transfer, { type: "vibe-share:snapshot", version: SHARE_SNAPSHOT_VERSION, snapshot });
  assert.equal(isShareReadyMessage({ type: "vibe-share:ready", version: SHARE_SNAPSHOT_VERSION }, SHARE_ORIGIN), true);
  assert.equal(isShareReadyMessage({ type: "vibe-share:ready", version: SHARE_SNAPSHOT_VERSION }, "https://lookalike.example"), false);
  assert.equal(isShareReadyMessage({ type: "vibe-share:ready", version: 999 }, SHARE_ORIGIN), false);
});

test("the public writer can require an image without breaking old stored articles", () => {
  const textOnly = cleanShareSnapshot({
    version: SHARE_SNAPSHOT_VERSION,
    title: "An older text-only article",
    kind: "article",
    markdown: "This remains readable after the publishing rule changes.",
    publishedAt: NOW,
  }, NOW);
  const pictured = cleanShareSnapshot({
    ...textOnly,
    visual: {
      imageUrl: "https://images.example.org/lead.webp",
      sourceUrl: "https://example.org/lead",
      alt: "A useful public photograph",
      credit: "Photograph · Example",
    },
  }, NOW);

  assert.equal(hasShareVisual(textOnly), false);
  assert.equal(hasShareVisual(pictured), true);
});
