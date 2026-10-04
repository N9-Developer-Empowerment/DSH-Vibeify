import test from "node:test";
import assert from "node:assert/strict";
import {
  APPEARANCE_STORAGE_KEY,
  MAGAZINE_PALETTES,
  VIBE_MOODS,
  WEBSITE_LOOKS,
  createAppearanceProfile,
  loadAppearanceProfile,
  saveAppearanceProfile,
  shouldCloseAppearanceSettingsOnClick,
} from "./client-src/experience/appearance-settings.js";

function memoryStorage() {
  const values = new Map();
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("magazine appearance persists separately from Chat colour", () => {
  const storage = memoryStorage();
  const profile = saveAppearanceProfile(storage, { palette: "forest", textSize: "large", spacing: "roomy" });
  assert.deepEqual(profile, { version: 1, look: "vibe", mood: "lilac-pop", palette: "forest", textSize: "large", spacing: "roomy" });
  assert.deepEqual(loadAppearanceProfile(storage), profile);
  assert.deepEqual([...storage.values.keys()], [APPEARANCE_STORAGE_KEY]);
  assert.deepEqual(Object.keys(MAGAZINE_PALETTES), ["midnight", "paper", "forest", "ocean", "news", "lilac-pop", "cherry-soda", "matcha-break", "after-dark"]);
});

test("invalid or corrupt appearance values fall back to the default", () => {
  const storage = memoryStorage();
  assert.deepEqual(createAppearanceProfile({ palette: "url(evil)", textSize: "tiny", spacing: "cramped" }), createAppearanceProfile());
  storage.values.set(APPEARANCE_STORAGE_KEY, "not json");
  assert.deepEqual(loadAppearanceProfile(storage), createAppearanceProfile());
  storage.values.set(APPEARANCE_STORAGE_KEY, JSON.stringify({ version: 99, palette: "paper" }));
  assert.deepEqual(loadAppearanceProfile(storage), createAppearanceProfile());
});

test("blocked local storage still returns the chosen appearance for this page", () => {
  const storage = { setItem() { throw new Error("blocked"); }, getItem() { throw new Error("blocked"); } };
  assert.equal(saveAppearanceProfile(storage, { palette: "ocean" }).palette, "ocean");
  assert.equal(loadAppearanceProfile(storage).palette, "lilac-pop");
});

test("the magazine settings trigger does not close its freshly opened popup", () => {
  const picker = { contains: (target) => target === "inside" };
  assert.equal(shouldCloseAppearanceSettingsOnClick(picker, { closest: () => ({}) }), false);
  assert.equal(shouldCloseAppearanceSettingsOnClick(picker, "inside"), false);
  assert.equal(shouldCloseAppearanceSettingsOnClick(picker, { closest: () => null }), true);
});

test("old profiles migrate and website looks persist without touching editorial settings", () => {
  const storage = memoryStorage();
  storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ version: 1, palette: "ocean" }));
  assert.equal(loadAppearanceProfile(storage).look, "vibe");
  assert.equal(loadAppearanceProfile(storage).palette, "ocean");
  assert.equal(loadAppearanceProfile(storage).mood, "lilac-pop");
  const profile = saveAppearanceProfile(storage, { look: "bbc-news" });
  assert.equal(profile.palette, "lilac-pop");
  assert.deepEqual(loadAppearanceProfile(storage), profile);
  assert.match(WEBSITE_LOOKS.vibe.writingVoice, /playful, sharp gossip magazine/i);
  assert.match(WEBSITE_LOOKS["bbc-news"].writingVoice, /restrained British broadcast-news parody/i);
});

test("four VIBE moods persist independently of website look and keep fixed defaults", () => {
  const storage = memoryStorage();
  const moods = {
    "lilac-pop": /anime-editorial energy/i,
    "cherry-soda": /1990s and 2000s lifestyle-magazine rhythm/i,
    "matcha-break": /Gen Z-aware, sustainable, healthy and calm/i,
    "after-dark": /pansexual and furry communities/i,
  };
  for (const [id, voice] of Object.entries(moods)) {
    const saved = saveAppearanceProfile(storage, { look: "bbc-news", mood: id });
    assert.equal(saved.look, "bbc-news");
    assert.equal(saved.mood, id);
    assert.equal(saved.palette, id);
    assert.deepEqual(loadAppearanceProfile(storage), saved);
    assert.match(VIBE_MOODS[id].direction, voice);
  }
});
