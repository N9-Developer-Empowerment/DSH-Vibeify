import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_VIBE_LIBRARY_QUERY,
  searchableVibeChunks,
  vibeLibrarySummary,
} from "./client-src/experience/vibe-library.js";

function chunk(id, title, markdown, extra = {}) {
  return {
    id,
    kind: "article",
    source: "chat-directed",
    title,
    markdown,
    publishedAt: 1_700_000_000_000,
    ...extra,
  };
}

test("the library contains only durable reader Vibes and omits questionnaires", () => {
  const chunks = [
    chunk("chat-one", "A Chat Vibe", "Made in Chat."),
    chunk("update-one", "An updated Vibe", "Made by Update.", { source: "fresh-stream" }),
    chunk("reserve-one", "A reserve Vibe", "Released from the reserve.", { source: "radar-reserve" }),
    chunk("welcome-one", "Welcome", "Rebuilt on launch.", { source: "welcome" }),
    chunk("bundle-one", "Example", "Bundled with the plugin.", { source: "bundle" }),
    chunk("question-one", "A question", "- One\n- Two", { kind: "questionnaire" }),
  ];

  assert.deepEqual(searchableVibeChunks(chunks).map(({ id }) => id), ["chat-one", "update-one", "reserve-one"]);
});

test("search is case-insensitive and requires every word across title and article text", () => {
  const chunks = [
    chunk("claudia", "Remember Claudia Jones", "A newspaper became a public square."),
    chunk("cathy", "Cathy Freeman", "The camera turns away from the track."),
  ];

  assert.deepEqual(searchableVibeChunks(chunks, "CLAUDIA square").map(({ id }) => id), ["claudia"]);
  assert.deepEqual(searchableVibeChunks(chunks, "Claudia track"), []);
});

test("markdown punctuation does not prevent a plain-language search", () => {
  const chunks = [chunk("styled", "A **living** magazine", "Read [the source](https://example.com).")];
  assert.deepEqual(searchableVibeChunks(chunks, "living source").map(({ id }) => id), ["styled"]);
});

test("a blank or overlong query is bounded and never changes source order", () => {
  const chunks = [chunk("newer", "Newer", "First"), chunk("older", "Older", "Second")];
  assert.deepEqual(searchableVibeChunks(chunks, "   ").map(({ id }) => id), ["newer", "older"]);
  assert.doesNotThrow(() => searchableVibeChunks(chunks, "x".repeat(MAX_VIBE_LIBRARY_QUERY + 100)));
});

test("the library summary reports the retained count and oldest publication time", () => {
  const chunks = [
    chunk("newer", "Newer", "First", { publishedAt: 300 }),
    chunk("older", "Older", "Second", { publishedAt: 100 }),
    chunk("welcome", "Welcome", "Not retained", { source: "welcome", publishedAt: 1 }),
  ];
  assert.deepEqual(vibeLibrarySummary(chunks), { count: 2, oldestPublishedAt: 100 });
});
