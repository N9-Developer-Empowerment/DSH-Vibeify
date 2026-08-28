import test from "node:test";
import assert from "node:assert/strict";

import {
  EXPERIENCE_STORAGE_KEY,
  createExperienceState,
  loadExperienceState,
  reduceExperience,
  saveExperienceState,
} from "./client-src/experience/state.js";

test("Vibe has one continuous home and an explicit Chat escape", () => {
  let state = createExperienceState();
  assert.equal(state.view, "home");
  state = reduceExperience(state, { type: "enter-chat" });
  assert.equal(state.view, "chat");
  state = reduceExperience(state, { type: "home" });
  assert.equal(state.view, "home");
});

test("guide, player and result actions no longer move the user out of the feed", () => {
  const initial = createExperienceState();
  assert.equal(reduceExperience(initial, { type: "play", episodeId: "neon-rain" }), initial);
  assert.equal(reduceExperience(initial, { type: "run-recipe", episodeId: "neon-rain" }), initial);
  assert.equal(reduceExperience(initial, { type: "enter-studio" }), initial);
});

test("saved and last-read stream entries persist without remembering Chat as home", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  let state = createExperienceState();
  state = reduceExperience(state, { type: "toggle-save", chunkId: "bundle:one" });
  state = reduceExperience(state, { type: "mark-read", chunkId: "bundle:two" });
  state = reduceExperience(state, { type: "enter-chat" });
  saveExperienceState(storage, state);
  const loaded = loadExperienceState(storage);
  assert.equal(loaded.view, "home");
  assert.deepEqual(loaded.savedChunkIds, ["bundle:one"]);
  assert.equal(loaded.lastReadChunkId, "bundle:two");
});

test("malformed persisted navigation data is sanitised", () => {
  const storage = {
    getItem: () => JSON.stringify({
      view: "studio",
      savedChunkIds: ["safe:one", "bad id", "safe:one"],
      lastReadChunkId: "bad id",
    }),
  };
  const loaded = loadExperienceState(storage);
  assert.equal(loaded.view, "home");
  assert.deepEqual(loaded.savedChunkIds, ["safe:one"]);
  assert.equal(loaded.lastReadChunkId, null);
});

test("persistence is non-blocking when browser storage is unavailable", () => {
  const initial = createExperienceState();
  assert.deepEqual(loadExperienceState(null), initial);
  assert.doesNotThrow(() => saveExperienceState({ setItem: () => { throw new Error("quota"); } }, initial));
  assert.equal(typeof EXPERIENCE_STORAGE_KEY, "string");
});
