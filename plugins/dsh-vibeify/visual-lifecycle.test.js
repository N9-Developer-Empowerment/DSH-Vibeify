import assert from "node:assert/strict";
import test from "node:test";
import { createVisualLifecycle, visualNeedsLocalCover } from "./client-src/experience/visual-lifecycle.js";

import { articleImageKey } from "./client-src/experience/article-image.js";

const chunk = (id, markdown = "") => ({ id, kind: "article", source: "fresh-stream", title: `Story ${id}`, markdown });
const photo = (url) => ({ provider: "pexels", imageUrl: url, sourceUrl: "https://www.pexels.com/photo/example/", alt: "A real photograph", creator: "Someone", credit: "Photograph · Someone · Pexels", license: "Pexels licence", width: 1200, height: 800 });
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("an unverified linked image remains local, and a tiny lead is never selected", async () => {
  const selected = [];
  const lead = "https://images.pexels.com/photos/1/tiny.jpeg";
  const lifecycle = createVisualLifecycle({
    capability: async () => true, search: async () => [], generate: async () => null,
    load: async (url) => url !== lead,
    onSelect: (id, image) => selected.push([id, image.imageUrl]),
  });
  lifecycle.enqueue([chunk("one", `![small](${lead})`)]);
  assert.deepEqual(selected, []);
  await lifecycle.whenIdle();
  assert.deepEqual(selected, []);
  lifecycle.dispose();
});

test("failed capability can recover through bounded retry and explicit Update without new chunks", async () => {
  let available = false;
  let calls = 0;
  const selected = [];
  const lifecycle = createVisualLifecycle({
    capability: async () => { calls++; return available; },
    search: async () => [photo("https://images.pexels.com/photos/2/ok.jpeg")],
    load: async () => true, generate: async () => null,
    onSelect: (id) => selected.push(id),
    retryDelays: [100000],
  });
  lifecycle.enqueue([chunk("one")]);
  await lifecycle.whenIdle();
  assert.equal(calls, 1);
  assert.deepEqual(selected, []);
  available = true;
  lifecycle.retry();
  await lifecycle.whenIdle();
  assert.equal(calls, 2);
  assert.deepEqual(selected, ["one"]);
  lifecycle.dispose();
});

test("chunk changes keep one queue and do not repeat completed searches", async () => {
  const searched = [];
  const lifecycle = createVisualLifecycle({
    capability: async () => true,
    search: async (item) => { searched.push(item.id); return [photo(`https://images.pexels.com/photos/${item.id}/ok.jpeg`)]; },
    load: async () => true, generate: async () => null,
    onSelect: () => {},
  });
  lifecycle.enqueue([chunk("one")]);
  await lifecycle.whenIdle();
  lifecycle.enqueue([chunk("one"), chunk("two")]);
  await lifecycle.whenIdle();
  assert.deepEqual(searched, ["one", "two"]);
  lifecycle.dispose();
});

test("disposal stops stale writes after a pending photo request", async () => {
  let release;
  const selected = [];
  const lifecycle = createVisualLifecycle({
    capability: async () => true,
    search: () => new Promise((resolve) => { release = resolve; }),
    load: async () => true, generate: async () => null,
    onSelect: (id) => selected.push(id),
  });
  lifecycle.enqueue([chunk("one")]);
  while (!release) await tick();
  lifecycle.dispose();
  release([photo("https://images.pexels.com/photos/2/ok.jpeg")]);
  await tick();
  assert.deepEqual(selected, []);
});

test("generated image is restored before search on reload", async () => {
  const selected = [];
  const generated = { provider: "chatgpt-image", imageUrl: "data:image/png;base64,generated" };
  let searched = 0;
  const lifecycle = createVisualLifecycle({
    capability: async () => true,
    generatedCache: { read: async () => new Map([[articleImageKey(chunk("one")), generated]]), write: async () => true },
    search: async () => { searched++; return []; }, load: async () => true,
    generate: async () => null,
    onSelect: (id) => selected.push(id),
  });
  lifecycle.enqueue([chunk("one")]);
  await lifecycle.whenIdle();
  assert.deepEqual(selected, ["one"]);
  assert.equal(searched, 0);
  lifecycle.dispose();
});

test("restored generated image outranks an older cached photograph", async () => {
  const selected = [];
  const generated = { provider: "chatgpt-image", imageUrl: "data:image/png;base64,generated" };
  const oldPhoto = photo("https://images.pexels.com/photos/old/photo.jpeg");
  const loaded = [];
  const lifecycle = createVisualLifecycle({
    capability: async () => true,
    generatedCache: { read: async () => new Map([[articleImageKey(chunk("one")), generated]]), write: async () => true },
    cached: new Map([[articleImageKey(chunk("one")), oldPhoto]]),
    search: async () => { throw Error("already restored"); },
    load: async (url) => { loaded.push(url); return true; },
    generate: async () => null,
    onSelect: (_, image) => selected.push(image.imageUrl),
  });
  lifecycle.enqueue([chunk("one")]);
  await lifecycle.whenIdle();
  assert.deepEqual(selected, [generated.imageUrl]);
  assert.deepEqual(loaded, [generated.imageUrl]);
  lifecycle.dispose();
});

test("failed generated and bundled image data uses the local illustration", () => {
  const generated = "data:image/png;base64,failed";
  const bundled = "data:image/jpeg;base64,failed";
  assert.equal(visualNeedsLocalCover({ externalUrl: generated }, null, new Set(), new Set([generated])), true);
  assert.equal(visualNeedsLocalCover({ artwork: "bundle" }, bundled, new Set(), new Set([bundled])), true);
  assert.equal(visualNeedsLocalCover({ externalUrl: generated }, null, new Set(), new Set()), false);
});
