import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanVisualSearchResult,
  mediaFromVisualCandidate,
  publicVisualBriefForChunk,
  readVisualCache,
  writeVisualCache,
} from "./client-src/experience/visual-source-client.js";

test("only explicit magazine sources produce a public image brief", () => {
  const publicChunk = {
    id: "refill-1:city-bikes",
    kind: "article",
    source: "fresh-stream",
    title: "Why city bicycles are getting smaller",
    markdown: "Long private-to-the-browser article copy that must never cross the image RPC.",
  };
  const ordinaryChat = { ...publicChunk, id: "chat-result-private", source: "chat-directed", title: "My private health notes" };
  const questionnaire = { ...publicChunk, kind: "questionnaire" };

  assert.deepEqual(publicVisualBriefForChunk(publicChunk), {
    query: "Why city bicycles are getting smaller",
    orientation: "landscape",
  });
  assert.equal(publicVisualBriefForChunk(ordinaryChat), null);
  assert.equal(publicVisualBriefForChunk(questionnaire), null);
  assert.doesNotMatch(JSON.stringify(publicVisualBriefForChunk(publicChunk)), /Long private-to-the-browser/);
});

test("visual RPC results are fail-closed and preserve credit and licence", () => {
  const cleaned = cleanVisualSearchResult({
    candidates: [{
      provider: "pexels",
      imageUrl: "https://images.pexels.com/photos/7/red-bicycle.jpeg",
      sourceUrl: "https://www.pexels.com/photo/red-bicycle-7/",
      alt: "A red bicycle outside a shop",
      creator: "A Photographer",
      credit: "Photograph · A Photographer · Pexels",
      license: "Pexels licence",
      width: 1800,
      height: 1200,
      score: 9,
    }],
  });
  const rejected = cleanVisualSearchResult({ candidates: [{
    provider: "mystery",
    imageUrl: "http://example.com/image.jpg",
    sourceUrl: "https://example.com/",
    alt: "Mystery",
    credit: "Unknown",
    license: "unknown",
  }] });

  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0].license, "Pexels licence");
  assert.equal(mediaFromVisualCandidate(cleaned[0], "fallback").kind, "photograph");
  assert.equal(rejected.length, 0);
});

test("visual cache is bounded, expiring, and stores no article copy", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const now = 1_800_000_000_000;
  const candidate = {
    provider: "wikimedia",
    imageUrl: "https://upload.wikimedia.org/red-bicycle.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Red_bicycle.jpg",
    alt: "A red bicycle",
    creator: "Commons maker",
    credit: "Photograph · Commons maker · CC BY 4.0",
    license: "CC BY 4.0",
    width: 1600,
    height: 1067,
    score: 10,
  };

  writeVisualCache(storage, "refill-1:city-bikes", candidate, now);
  assert.equal(readVisualCache(storage, now).get("refill-1:city-bikes").imageUrl, candidate.imageUrl);
  assert.doesNotMatch(values.values().next().value, /article|markdown|private/i);
  assert.equal(readVisualCache(storage, now + 31 * 24 * 60 * 60 * 1000).size, 0);
});
