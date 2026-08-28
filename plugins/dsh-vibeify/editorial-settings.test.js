import test from "node:test";
import assert from "node:assert/strict";

import {
  EDITORIAL_STORAGE_KEY,
  createEditorialProfile,
  loadEditorialProfile,
  saveEditorialProfile,
} from "./client-src/experience/editorial-settings.js";

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("editorial direction has a broad non-demographic default", () => {
  const profile = loadEditorialProfile(null);
  assert.equal(profile.preset, "open");
  assert.equal(profile.label, "Open mix");
  assert.match(profile.direction, /without assuming a demographic profile/i);
});

test("explicit preset direction is stored locally as bounded configuration", () => {
  const storage = memoryStorage();
  const profile = saveEditorialProfile(storage, "machines");
  assert.equal(profile.label, "Football, AI & cars");
  assert.deepEqual(loadEditorialProfile(storage), profile);
  assert.deepEqual(JSON.parse(storage.values.get(EDITORIAL_STORAGE_KEY)), {
    version: 1,
    preset: "machines",
    customDirection: "",
  });
});

test("a free-text editor note augments any selected preset and survives reload", () => {
  const storage = memoryStorage();
  const profile = saveEditorialProfile(storage, "machines", "More local voices, fewer product launches.");
  assert.equal(profile.preset, "machines");
  assert.equal(profile.customDirection, "More local voices, fewer product launches.");
  assert.match(profile.direction, /football culture/i);
  assert.match(profile.direction, /more local voices, fewer product launches/i);
  assert.deepEqual(loadEditorialProfile(storage), profile);
});

test("custom direction removes controls, collapses whitespace and remains bounded", () => {
  const profile = createEditorialProfile("custom", `  Quiet\narchitecture\u0000 and local radio ${"x".repeat(500)}  `);
  assert.equal(profile.preset, "custom");
  assert.ok(profile.direction.startsWith("Quiet architecture and local radio"));
  assert.equal(profile.direction.includes("\u0000"), false);
  assert.equal(profile.direction.length, 360);
});

test("empty or corrupt custom settings fall back to the open mix", () => {
  const storage = memoryStorage();
  storage.values.set(EDITORIAL_STORAGE_KEY, JSON.stringify({ version: 1, preset: "custom", customDirection: "  " }));
  assert.equal(loadEditorialProfile(storage).preset, "open");
  storage.values.set(EDITORIAL_STORAGE_KEY, "not json");
  assert.equal(loadEditorialProfile(storage).preset, "open");
});
