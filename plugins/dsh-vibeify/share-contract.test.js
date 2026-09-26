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

test("public Commons visuals retain verified licences and reject bare or restricted credits", () => {
  const base = {
    version: SHARE_SNAPSHOT_VERSION,
    title: "A public portrait",
    kind: "article",
    markdown: "Finished public copy.",
    publishedAt: NOW,
  };
  const visual = {
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/a/aa/Portrait_(detail).jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Portrait_(detail).jpg",
    alt: "A musician on stage",
    credit: "Photograph · Example Creator · CC BY-SA 4.0",
  };
  assert.equal(cleanShareSnapshot({ ...base, visual }, NOW).visual.credit, visual.credit);
  assert.equal(cleanShareSnapshot({ ...base, visual: { ...visual, credit: "Photograph · Example Creator" } }, NOW).visual, null);
  assert.equal(cleanShareSnapshot({ ...base, visual: { ...visual, credit: "Photograph · Example Creator · CC BY-NC 4.0" } }, NOW).visual, null);
  const thumb = { ...visual, imageUrl: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/Portrait_(detail).jpg/960px-Portrait_(detail).jpg" };
  assert.equal(cleanShareSnapshot({ ...base, visual: thumb }, NOW).visual.imageUrl, thumb.imageUrl);
  assert.equal(cleanShareSnapshot({ ...base, visual: { ...thumb, credit: "Photograph · Example Creator · CC BY-ND 4.0" } }, NOW).visual, null);
});

test("only a bounded ChatGPT-generated PNG can cross as a generated visual", () => {
  const png = `data:image/png;base64,${Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, ...new Array(20).fill(0)]).toString("base64")}`;
  const base = { version: SHARE_SNAPSHOT_VERSION, title: "A generated scene", kind: "image", markdown: "Finished public copy.", publishedAt: NOW };
  const visual = { imageUrl: png, sourceUrl: "https://openai.com/index/image-generation/", alt: "An imagined concert stage", credit: "Generated illustration · ChatGPT", kind: "ai-generated" };
  assert.equal(cleanShareSnapshot({ ...base, visual }, NOW).visual.imageUrl, png);
  assert.equal(cleanShareSnapshot({ ...base, visual: { ...visual, kind: "photograph" } }, NOW).visual, null);
  assert.equal(cleanShareSnapshot({ ...base, visual: { ...visual, credit: "Photograph · ChatGPT" } }, NOW).visual, null);
  assert.equal(cleanShareSnapshot({ ...base, visual: { ...visual, imageUrl: "data:image/svg+xml;base64,PHN2Zz4=" } }, NOW).visual, null);
  assert.equal(cleanShareSnapshot({ ...base, visual: { ...visual, imageUrl: `${png}${"A".repeat(4_300_000)}` } }, NOW).visual, null);
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

test("bundled drawing identity preserves only canonical artwork and attribution", () => {
  const base = {version:SHARE_SNAPSHOT_VERSION,title:'A public story',kind:'article',markdown:'Finished copy.',publishedAt:NOW};
  const result = cleanShareSnapshot({...base,visual:{kind:'illustration',illustrationId:'doodles-reading',imageUrl:'data:image/svg+xml,<svg onload="steal()"/>',sourceUrl:'https://evil.example.org',credit:'Invented',alt:'private note'}},NOW);
  assert.equal(result.visual.kind,'illustration');
  assert.equal(result.visual.imageUrl,`${SHARE_ORIGIN}/illustrations/doodles-reading.svg`);
  assert.match(result.visual.credit,/Pablo Stanley.*CC0/);
  assert.doesNotMatch(JSON.stringify(result),/steal|evil|Invented|private note/);
  assert.equal(cleanShareSnapshot({...base,visual:{kind:'illustration',illustrationId:'untrusted'}},NOW).visual,null);
  const hosted=cleanShareSnapshot({...base,visual:{...result.visual,imageUrl:`${SHARE_ORIGIN}/i/abcdefgh1234.jpg`}},NOW);
  assert.equal(hosted.visual.imageUrl,`${SHARE_ORIGIN}/i/abcdefgh1234.jpg`);
});
