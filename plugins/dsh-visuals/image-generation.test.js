import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { createImageGenerator, pngInfo } from "./image-generation.js";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function png(width = 1370, height = 1148) {
  const bytes = Buffer.alloc(45);
  PNG_SIGNATURE.copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes.write("IEND", 37, "ascii");
  return bytes;
}

async function fixture(fn) {
  const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-image-test-"));
  try { await fn(cacheDir); } finally { await fs.rm(cacheDir, { recursive: true, force: true }); }
}

test("only one short public subject crosses the generation boundary", async () => {
  await fixture(async (cacheDir) => {
    let called = 0;
    const generator = createImageGenerator({ cacheDir, runner: async () => { called++; } });
    for (const invalid of [{ subject: "private\nnotes" }, { subject: "a".repeat(181) }, { subject: "public title", readerSettings: "secret" }, { query: "public title" }]) {
      await assert.rejects(() => generator.generate(invalid), TypeError);
    }
    assert.equal(called, 0);
    assert.deepEqual(await fs.readdir(cacheDir), []);
  });
});

test("a validated PNG is returned as a labelled illustration and cached by subject", async () => {
  await fixture(async (cacheDir) => {
    let called = 0;
    const generator = createImageGenerator({ cacheDir, now: () => new Date("2026-09-26T10:00:00Z"), runner: async ({ directory, subject }) => {
      assert.equal(subject, "Red bicycles in London");
      called++;
      await fs.writeFile(path.join(directory, "illustration.png"), png());
    } });
    const first = await generator.generate({ subject: "Red bicycles in London" });
    assert.equal(first.status, "generated");
    assert.equal(first.generated, true);
    assert.equal(first.credit, "Generated illustration · AI");
    assert.equal(first.width, 1370);
    assert.match(first.imageDataUrl, /^data:image\/png;base64,/);
    const second = await generator.generate({ subject: "Red bicycles in London" });
    assert.equal(second.status, "cached");
    assert.equal(second.imageDataUrl, first.imageDataUrl);
    assert.equal(called, 1);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(cacheDir, "quota-2026-09-26.json"), "utf8")), { attempts: 1 });
  });
});

test("invalid output never appears as generated, and four attempts exhaust the day", async () => {
  await fixture(async (cacheDir) => {
    let called = 0;
    const generator = createImageGenerator({ cacheDir, now: () => new Date("2026-09-26T10:00:00Z"), runner: async ({ directory }) => {
      called++;
      await fs.writeFile(path.join(directory, "illustration.png"), png(400, 400));
    } });
    for (let i = 0; i < 4; i++) assert.deepEqual(await generator.generate({ subject: `Subject ${i}` }), { status: "unavailable", reason: "invalid-image" });
    assert.deepEqual(await generator.generate({ subject: "Subject 4" }), { status: "unavailable", reason: "daily-limit" });
    assert.equal(called, 4);
    assert.equal(pngInfo(png(400, 400)), null);
  });
});

test("a second generation does not launch while the first is in flight", async () => {
  await fixture(async (cacheDir) => {
    let release;
    let started;
    const beginning = new Promise((resolve) => { started = resolve; });
    const held = new Promise((resolve) => { release = resolve; });
    const generator = createImageGenerator({ cacheDir, runner: async ({ directory }) => {
      started();
      await held;
      await fs.writeFile(path.join(directory, "illustration.png"), png());
    } });
    const first = generator.generate({ subject: "First public subject" });
    await beginning;
    assert.deepEqual(await generator.generate({ subject: "Second public subject" }), { status: "unavailable", reason: "busy" });
    release();
    assert.equal((await first).status, "generated");
  });
});

test("a stalled runner has a hard deadline and reports unavailability", async () => {
  await fixture(async (cacheDir) => {
    const generator = createImageGenerator({ cacheDir, timeoutMs: 10, runner: async () => new Promise(() => {}) });
    assert.deepEqual(await generator.generate({ subject: "Public garden benches" }), { status: "unavailable", reason: "timeout" });
  });
});
