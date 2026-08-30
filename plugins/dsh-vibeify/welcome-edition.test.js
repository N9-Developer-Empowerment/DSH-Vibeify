import test from "node:test";
import assert from "node:assert/strict";

import { createExperienceCatalog } from "./client-src/experience/catalog.js";
import {
  boundMagazinePresentation,
  composeOpeningStream,
  createWelcomeEdition,
} from "./client-src/experience/welcome-edition.js";
import { newestFirst } from "./client-src/experience/feed.js";

const catalog = createExperienceCatalog();

test("the opening edition sells the installed experience again without becoming a setup wizard", () => {
  const edition = createWelcomeEdition(catalog);
  const copy = edition.map(({ title, markdown }) => `${title}\n${markdown}`).join("\n");

  assert.ok(edition.length >= 20);
  assert.equal(new Set(edition.map(({ id }) => id)).size, edition.length);
  assert.ok(edition.every(({ source }) => source === "welcome"));
  assert.ok(edition.every(({ cta }) => cta === "chat"));
  assert.ok(edition.every(({ markdown }) => /\[[^\]]+\]\(https:\/\//.test(markdown)));
  assert.ok(edition.every(({ topicId }) => catalog.byId[topicId] !== undefined));

  for (const required of [
    /Chat/i,
    /stream/i,
    /pull/i,
    /Stop update/i,
    /editorial settings|editor note/i,
    /questionnaire/i,
    /local|on this device/i,
    /photograph|video|music/i,
    /save|Not for me/i,
    /share/i,
    /DeepSeek Harness/i,
    /open source/i,
    /plugin/i,
    /DeepSeek|ChatGPT/i,
    /permission|approval/i,
    /Queue.*Steer|Steer.*Queue/is,
    /Think|Trajectory/i,
    /attach|upload/i,
    /connected app/i,
    /Efficient|Balanced|Frontier|Maximum/i,
    /DeepSeek-only|ChatGPT-only|combined mode/i,
    /update/i,
  ]) assert.match(copy, required);

  assert.match(edition[0].title, /good choice|chose well/i);
  assert.doesNotMatch(copy, /configuration file|npm|pnpm|terminal command/i);
});

test("a relaunch places the current welcome edition above old local Chat cards without deleting them", () => {
  const cached = Object.freeze([
    Object.freeze({ id: "chat-old", source: "chat-directed", title: "Old result", markdown: "Earlier material.", publishedAt: 100 }),
    Object.freeze({ id: "fresh-old", source: "fresh-stream", title: "Earlier magazine", markdown: "Earlier editorial material.", publishedAt: 200 }),
    Object.freeze({ id: "bundle-yesterday", source: "bundle", title: "Stale bundle", markdown: "Do not restore this deterministic copy.", publishedAt: 300 }),
  ]);
  const bundle = Object.freeze([
    Object.freeze({ id: "bundle-current-a", source: "bundle", title: "Current example A", markdown: "A current example.", topicId: "neon-rain" }),
    Object.freeze({ id: "bundle-current-b", source: "bundle", title: "Current example B", markdown: "Another current example.", topicId: "mirror-minute" }),
  ]);
  const welcome = createWelcomeEdition(catalog);
  const composed = composeOpeningStream({ cached, bundle, welcome, now: 1_000, dynamicLimit: 160 });
  const visible = newestFirst(composed);

  assert.deepEqual(visible.slice(0, welcome.length).map(({ id }) => id), welcome.map(({ id }) => id));
  assert.deepEqual(visible.slice(welcome.length, welcome.length + bundle.length).map(({ id }) => id), bundle.map(({ id }) => id));
  assert.deepEqual(visible.slice(-2).map(({ id }) => id), ["fresh-old", "chat-old"]);
  assert.equal(visible.some(({ id }) => id === "bundle-yesterday"), false);
});

test("new material added during the visit still arrives above the orientation edition", () => {
  const welcome = createWelcomeEdition(catalog);
  const composed = composeOpeningStream({ cached: [], bundle: [], welcome, now: 1_000 });
  const newChat = Object.freeze({ id: "chat-new", source: "chat-directed", title: "Just finished", markdown: "A new answer.", publishedAt: 2_000 });
  assert.equal(newestFirst([...composed, newChat])[0].id, "chat-new");
});

test("welcome and bundled pages never consume the bounded reader-content allowance", () => {
  const cached = Object.freeze(Array.from({ length: 160 }, (_, index) => Object.freeze({
    id: `chat-${index}`,
    source: "chat-directed",
    title: `Chat ${index}`,
    markdown: "Reader-specific material.",
    publishedAt: index + 1,
  })));
  const bundle = Object.freeze([{ id: "bundle-current", source: "bundle", title: "Example", markdown: "Example material." }]);
  const welcome = createWelcomeEdition(catalog);
  const composed = composeOpeningStream({ cached, bundle, welcome, now: 1_000, dynamicLimit: 160 });
  assert.equal(composed.filter(({ source }) => source === "chat-directed").length, 160);
  assert.equal(composed.length, 160 + bundle.length + welcome.length);

  const next = boundMagazinePresentation([...composed, {
    id: "chat-new",
    source: "chat-directed",
    title: "New",
    markdown: "Newest reader-specific material.",
    publishedAt: 2_000,
  }], 160);
  assert.equal(next.some(({ id }) => id === "chat-0"), false);
  assert.equal(next.some(({ id }) => id === "chat-new"), true);
  assert.equal(next.filter(({ source }) => source === "welcome").length, welcome.length);
  assert.equal(next.filter(({ source }) => source === "bundle").length, bundle.length);
});

test("presentation refills keep a protected reserve of completed Chat Vibes", () => {
  const chat = Array.from({ length: 108 }, (_, index) => ({
    id: `chat-${index}`,
    source: "chat-directed",
    kind: "article",
    title: `Chat ${index}`,
    markdown: "Reader-requested Vibe.",
    publishedAt: index + 1,
  }));
  const editorial = Array.from({ length: 180 }, (_, index) => ({
    id: `editorial-${index}`,
    source: "fresh-stream",
    kind: "article",
    title: `Editorial ${index}`,
    markdown: "Editorial refill.",
    publishedAt: 1_000 + index,
  }));
  const visible = boundMagazinePresentation([...chat, ...editorial], 160);
  const retainedChat = visible.filter(({ source }) => source === "chat-directed");
  assert.equal(visible.length, 160);
  assert.equal(retainedChat.length, 96);
  assert.equal(retainedChat[0].id, "chat-12");
  assert.equal(retainedChat.at(-1).id, "chat-107");
});
