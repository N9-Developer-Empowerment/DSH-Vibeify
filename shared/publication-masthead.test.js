import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { PUBLICATION_BRANDS, PUBLICATION_MOOD_BRANDS, publicationBrand, renderPublicationMasthead, publicationMastheadRuntimeSource } from "./publication-masthead.js";
import { VIBE_MOODS, WEBSITE_LOOKS } from "./article-appearance.js";
import { saveAppearanceProfile, loadAppearanceProfile } from "../plugins/dsh-vibeify/client-src/experience/appearance-settings.js";

test("every selectable look has a stable, immutable publication identity", () => {
  assert.deepEqual(Object.keys(PUBLICATION_BRANDS), Object.keys(WEBSITE_LOOKS));
  assert.deepEqual(Object.keys(PUBLICATION_MOOD_BRANDS), Object.keys(VIBE_MOODS));
  assert.equal(new Set(Object.values(PUBLICATION_BRANDS).map(brand => brand.id)).size, Object.keys(WEBSITE_LOOKS).length);
  for (const look of Object.keys(WEBSITE_LOOKS)) assert.ok(Object.isFrozen(publicationBrand(look)));
});

test("saved look restores the same masthead across visits and look switches", () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  for (const look of ["vibe", "bbc-news", "vibe"]) {
    saveAppearanceProfile(storage, { look });
    assert.equal(renderPublicationMasthead(loadAppearanceProfile(storage).look), renderPublicationMasthead(look));
  }
});

test("saved mood restores its masthead and can combine with each website look", () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  for (const look of Object.keys(WEBSITE_LOOKS)) {
    for (const mood of Object.keys(VIBE_MOODS)) {
      const saved = saveAppearanceProfile(storage, { look, mood });
      const markup = renderPublicationMasthead(saved.look, saved.mood);
      if (mood === "classic") {
        assert.equal(markup, renderPublicationMasthead(look));
      } else {
        assert.match(markup, new RegExp(PUBLICATION_MOOD_BRANDS[mood].label));
        assert.match(markup, new RegExp(PUBLICATION_MOOD_BRANDS[mood].id));
      }
      if (look === "bbc-news") assert.match(markup, /vibe-brand-tile/);
    }
  }
});

test("browser preview and server derive identical mastheads without reader HTML", () => {
  for (const look of ["vibe", "bbc-news", '<img src=x onerror=alert(1)>', null, "__proto__"]) {
    const browser = vm.runInNewContext(`${publicationMastheadRuntimeSource()}\nrenderPublicationMasthead(input)`, { input: look });
    assert.equal(browser, renderPublicationMasthead(look));
    assert.doesNotMatch(browser, /<img|onerror|BBC|inspired|independent/);
  }
  assert.match(renderPublicationMasthead("vibe"), /A little intrigue/);
  assert.match(renderPublicationMasthead("bbc-news"), /vibe-brand-tile/);
  assert.match(renderPublicationMasthead("bbc-news"), />NEWS</);
});

test("missing mood keeps the exact legacy masthead identity for each website look", () => {
  assert.equal(renderPublicationMasthead("vibe"), '<span class="vibe-masthead" data-brand="vibe-magazine-v1" data-treatment="magazine"><span class="vibe-brand-wordmark" aria-label="VIBE">VIBE</span><span class="vibe-brand-tagline">People. Culture. A little intrigue.</span></span>');
  assert.equal(renderPublicationMasthead("bbc-news"), '<span class="vibe-masthead" data-brand="vibe-news-v1" data-treatment="news"><span class="vibe-brand-wordmark" aria-label="VIBE"><span class="vibe-brand-tile">V</span><span class="vibe-brand-tile">I</span><span class="vibe-brand-tile">B</span><span class="vibe-brand-tile">E</span></span><span class="vibe-brand-section">NEWS</span></span>');
});
