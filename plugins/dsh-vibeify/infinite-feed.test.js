import test from "node:test";
import assert from "node:assert/strict";

import { createExperienceCatalog } from "./client-src/experience/catalog.js";
import { createEditorialEdition } from "./client-src/experience/editorial.js";
import {
  contentLinkForMarkdown,
  createBundledStream,
  createInstantUpdateChunks,
  markdownWithoutLeadVisual,
  newestFirst,
  panelLayoutForChunk,
  questionnaireOptions,
  remoteVisualForMarkdown,
  visualMediaForChunk,
  visualEpisodeForChunk,
} from "./client-src/experience/feed.js";

const catalog = createEditorialEdition(createExperienceCatalog(), "2026-08-28");

test("the bundled stream is a deterministic substantial first-visit content well", () => {
  const first = createBundledStream(catalog, "2026-08-28", 72);
  const again = createBundledStream(catalog, "2026-08-28", 72);
  assert.deepEqual(first, again);
  assert.equal(first.length, 72);
  assert.equal(new Set(first.map(({ id }) => id)).size, 72);
  assert.ok(first.every(({ title, markdown }) => title.length > 0 && markdown.length > 40));
});

test("instant content mixes articles, images and optional questionnaires without a guide gate", () => {
  const stream = createBundledStream(catalog, "2026-08-28", 36);
  const kinds = new Set(stream.map(({ kind }) => kind));
  assert.ok(kinds.has("article"));
  assert.ok(kinds.has("image"));
  assert.ok(kinds.has("questionnaire"));
  const question = stream.find(({ kind }) => kind === "questionnaire");
  assert.ok(questionnaireOptions(question.markdown).length >= 2);
  for (const chunk of stream.filter(({ topicId }) => topicId !== null)) assert.ok(catalog.byId[chunk.topicId]);
});

test("every explicit update spends an immediate visual page and questionnaire from the local reserve", () => {
  const chunks = createInstantUpdateChunks(catalog, "refill-under-a-second", ["Anime Night, Sorted"], 1_700_000_000_000);
  assert.equal(chunks.length, 2);
  assert.deepEqual(chunks.map(({ kind }) => kind), ["questionnaire", "image"]);
  assert.equal(chunks[1].source, "fresh-stream");
  assert.notEqual(chunks[1].title, "Anime Night, Sorted");
  assert.ok(chunks[1].topicId !== null);
  assert.ok(questionnaireOptions(chunks[0].markdown).length >= 2);
  assert.ok(chunks.every(({ id }) => id.startsWith("refill-under-a-second-")));
});

test("the feed presents newest arrivals first without mutating append-only storage order", () => {
  const stored = Object.freeze([
    Object.freeze({ id: "oldest" }),
    Object.freeze({ id: "middle" }),
    Object.freeze({ id: "newest" }),
  ]);
  assert.deepEqual(newestFirst(stored).map(({ id }) => id), ["newest", "middle", "oldest"]);
  assert.deepEqual(stored.map(({ id }) => id), ["oldest", "middle", "newest"]);
});

test("every valid stream tile receives a stable locally bundled photograph", () => {
  const stream = createBundledStream(catalog, "2026-08-28", 36);
  const chatChunk = Object.freeze({ id: "chat-result-43", topicId: null });
  for (const chunk of [...stream, chatChunk]) {
    const first = visualEpisodeForChunk(catalog, chunk);
    const again = visualEpisodeForChunk(catalog, chunk);
    assert.ok(first?.photo?.kind === "photograph");
    assert.equal(first, again);
  }
  const topicChunk = stream.find(({ topicId }) => topicId !== null);
  assert.equal(visualEpisodeForChunk(catalog, topicChunk).id, topicChunk.topicId);
});

test("the visual resolver mixes credited photography with labelled AI-assisted graphics", () => {
  const stream = createBundledStream(catalog, "2026-08-28", 72);
  const media = stream.map((chunk) => visualMediaForChunk(catalog, chunk));
  assert.ok(media.every(({ artwork, alt, href, label }) => artwork.length > 0 && alt.length > 0 && href.startsWith("https://") && label.length > 0));
  assert.ok(media.some(({ kind }) => kind === "photograph"));
  assert.ok(media.some(({ kind }) => kind === "ai-graphic"));
  assert.ok(new Set(media.map(({ artwork }) => artwork)).size >= 10);
});

test("an approved generated image joins the rolling catalogue with visible provenance", () => {
  const imageUrl = "https://images.unsplash.com/photo-fresh-catalogue?auto=format&fit=crop&w=1600";
  const markdown = `![A bright studio with layered paper](https://images.unsplash.com/photo-fresh-catalogue?auto=format&fit=crop&w=1600)\n\n[Visual source · Alex Example](https://unsplash.com/photos/fresh-catalogue)\n\nA complete piece of reader-facing copy.`;
  const chunk = Object.freeze({
    id: "refill-fresh-catalogue-image",
    kind: "image",
    source: "fresh-stream",
    title: "Fresh visual catalogue",
    markdown,
    topicId: null,
  });

  const remote = remoteVisualForMarkdown(markdown);
  const media = visualMediaForChunk(catalog, chunk);
  assert.equal(remote.imageUrl, imageUrl);
  assert.equal(remote.sourceUrl, "https://unsplash.com/photos/fresh-catalogue");
  assert.equal(media.kind, "fresh-image");
  assert.equal(media.externalUrl, imageUrl);
  assert.equal(media.href, remote.sourceUrl);
  assert.equal(media.label, "Visual source · Alex Example");
  assert.ok(media.fallbackArtwork.length > 0);
  assert.doesNotMatch(markdownWithoutLeadVisual(markdown), /^!\[/);
  assert.doesNotMatch(markdownWithoutLeadVisual(markdown), /Visual source · Alex Example/);
});

test("article destinations exclude image files and visual-credit links", () => {
  const markdown = [
    "![A bright studio](https://images.unsplash.com/photo-story?auto=format&w=1600)",
    "[Visual source · Alex Example](https://unsplash.com/photos/story)",
    "The exhibition is explained by [the museum's full feature](https://museum.example/exhibitions/story?utm_source=vibe).",
  ].join("\n\n");
  assert.deepEqual(contentLinkForMarkdown(markdown), {
    href: "https://museum.example/exhibitions/story",
    label: "the museum's full feature",
  });
  assert.equal(contentLinkForMarkdown("A complete article without a link."), null);
});

test("unapproved remote images cannot enter the catalogue and receive a local fallback", () => {
  const markdown = "![Tracking image](https://tracker.example/pixel.jpg)\n\n[Source](https://example.com)\n\nUseful copy.";
  const chunk = Object.freeze({ id: "refill-rejected-image", kind: "image", source: "fresh-stream", title: "Rejected image", markdown, topicId: null });
  const media = visualMediaForChunk(catalog, chunk);
  assert.equal(remoteVisualForMarkdown(markdown), null);
  assert.notEqual(media.kind, "fresh-image");
  assert.ok(["photograph", "ai-graphic"].includes(media.kind));
});

test("rolling catalogue images require provenance and discard tracking parameters", () => {
  const tracked = "![Fresh subject](https://images.pexels.com/photos/123/example.jpeg?w=1600&utm_source=tracker#pixel)\n\n[Visual source · Pat Example](https://www.pexels.com/photo/example-123/#credit)\n\nUseful copy.";
  const accepted = remoteVisualForMarkdown(tracked);
  assert.equal(accepted.imageUrl, "https://images.pexels.com/photos/123/example.jpeg?w=1600");
  assert.equal(accepted.sourceUrl, "https://www.pexels.com/photo/example-123/");
  assert.equal(remoteVisualForMarkdown("![No credit](https://images.pexels.com/photos/123/example.jpeg)\n\nUseful copy."), null);
});

test("panel layout uses stable editorial spans instead of positional grid selectors", () => {
  assert.equal(panelLayoutForChunk({ kind: "image", source: "bundle", markdown: "Short" }, 0), "hero");
  assert.equal(panelLayoutForChunk({ kind: "questionnaire", source: "bundle", markdown: "Pick one" }, 4), "wide");
  assert.equal(panelLayoutForChunk({ kind: "article", source: "chat-directed", markdown: "Complete answer" }, 3), "wide");
  assert.equal(panelLayoutForChunk({ kind: "image", source: "bundle", markdown: "Short" }, 2), "compact");
  assert.equal(panelLayoutForChunk({ kind: "article", source: "bundle", markdown: "A useful short article" }, 3), "feature");
});
