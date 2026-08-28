import test from "node:test";
import assert from "node:assert/strict";

import {
  EDITORIAL_STORAGE_KEY,
  EDITORIAL_TRIBES,
  MAX_DEEPSEEK_DAILY_BUDGET_USD,
  createEditorialProfile,
  loadEditorialProfile,
  saveEditorialProfile,
} from "./client-src/experience/editorial-settings.js";

function memoryStorage() {
  const values = new Map();
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("editorial direction defaults to a global magazine editor rather than a topic preset", () => {
  const profile = loadEditorialProfile(null);
  assert.deepEqual(profile.tribes, ["global-curious"]);
  assert.match(profile.direction, /freedom, creativity and humour/i);
  assert.match(profile.direction, /UK, US, Canada, Australia and India/i);
  assert.match(profile.direction, /including China/i);
  assert.equal(Object.hasOwn(EDITORIAL_TRIBES, "builders-nerds"), true);
});

test("multiple explicit tribes and editor note remain local bounded configuration", () => {
  const storage = memoryStorage();
  const profile = saveEditorialProfile(storage, {
    tribes: ["builders-nerds", "music-communities", "not-a-tribe", "builders-nerds"],
    customDirection: "More independent voices and dry humour.", serendipity: 0.25, dailyBudgetUsd: 1.5,
  });
  assert.deepEqual(profile.tribes, ["builders-nerds", "music-communities"]);
  assert.equal(profile.dailyBudgetUsd, 1.5);
  assert.match(profile.direction, /25%.*serendipity/i);
  assert.deepEqual(loadEditorialProfile(storage), profile);
  const persisted = JSON.parse(storage.values.get(EDITORIAL_STORAGE_KEY));
  assert.equal(persisted.version, 2);
  assert.equal(JSON.stringify(persisted).includes("direction"), false);
});

test("DeepSeek background budget is a hard two dollar maximum", () => {
  assert.equal(createEditorialProfile({ dailyBudgetUsd: 200 }).dailyBudgetUsd, MAX_DEEPSEEK_DAILY_BUDGET_USD);
  assert.equal(createEditorialProfile({ dailyBudgetUsd: -1 }).dailyBudgetUsd, 0);
  assert.equal(createEditorialProfile({ dailyBudgetUsd: 0.257 }).dailyBudgetUsd, 0.26);
});

test("version one topic presets migrate to audience lenses", () => {
  const storage = memoryStorage();
  storage.values.set(EDITORIAL_STORAGE_KEY, JSON.stringify({ version: 1, preset: "machines", customDirection: "Keep it witty." }));
  const profile = loadEditorialProfile(storage);
  assert.deepEqual(profile.tribes, ["builders-nerds", "sports-communities", "entrepreneurs"]);
  assert.equal(profile.customDirection, "Keep it witty.");
});

test("custom notes remove controls, collapse whitespace and remain bounded", () => {
  const profile = createEditorialProfile({ tribes: ["culture-arts"], customDirection: ` Quiet\narchitecture\u0000 and local radio ${"x".repeat(500)}` });
  assert.ok(profile.customDirection.startsWith("Quiet architecture and local radio"));
  assert.equal(profile.customDirection.includes("\u0000"), false);
  assert.equal(profile.customDirection.length, 360);
});

test("empty and corrupt settings fall back without inferring a reader identity", () => {
  const storage = memoryStorage();
  storage.values.set(EDITORIAL_STORAGE_KEY, "not json");
  assert.deepEqual(loadEditorialProfile(storage).tribes, ["global-curious"]);
});
