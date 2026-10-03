import test from "node:test";
import assert from "node:assert/strict";
import { checkVisualSources } from "./client-src/experience/visual-source-check.js";

const photo = { provider: "wikimedia", imageUrl: "https://upload.wikimedia.org/bicycle.jpg", sourceUrl: "https://commons.wikimedia.org/wiki/File:Bicycle.jpg", alt: "Red bicycle", creator: "Creator", credit: "Image · Creator · CC BY 4.0", license: "CC BY 4.0", width: 1800, height: 1200, score: 10 };
test("source check sends only a fixed public phrase and verifies the displayed photograph", async () => {
  const connection = { rpc: { call: async (channel, method, payload) => {
    assert.equal(channel, "/dsh-visuals"); assert.equal(method, "search");
    assert.deepEqual(payload, { query: "red bicycle", orientation: "landscape", limit: 4 });
    return { ok: true, value: { providers: ["wikimedia", "pexels", "unknown"], failedProviders: ["pexels"], candidates: [photo] } };
  } } };
  const result = await checkVisualSources(connection, async url => url === photo.imageUrl);
  assert.deepEqual(result.ready, ["wikimedia"]); assert.deepEqual(result.failed, ["pexels"]);
  assert.equal(result.image.credit, photo.credit);
});
test("failed image loading keeps the sample empty and server rejection is reported", async () => {
  const connection = { rpc: { call: async () => ({ ok: true, value: { providers: ["wikimedia"], candidates: [photo] } }) } };
  assert.equal((await checkVisualSources(connection, async () => false)).image, null);
  await assert.rejects(() => checkVisualSources({ rpc: { call: async () => ({ ok: false }) } }), /could not be checked/);
});
