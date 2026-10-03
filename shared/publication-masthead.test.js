import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { PUBLICATION_BRANDS, publicationBrand, renderPublicationMasthead, publicationMastheadRuntimeSource } from "./publication-masthead.js";
import { WEBSITE_LOOKS } from "./article-appearance.js";
import { saveAppearanceProfile, loadAppearanceProfile } from "../plugins/dsh-vibeify/client-src/experience/appearance-settings.js";

test("every selectable look has a stable, immutable publication identity", () => {
  assert.deepEqual(Object.keys(PUBLICATION_BRANDS), Object.keys(WEBSITE_LOOKS));
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
