import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createExperienceCatalog } from "./client-src/experience/catalog.js";

const creditsUrl = new URL("./assets/experience/PHOTO_CREDITS.json", import.meta.url);
const graphicFiles = Object.freeze([
  "graphic-neon.svg",
  "graphic-care.svg",
  "graphic-conversation.svg",
  "graphic-style.svg",
  "graphic-makeup.svg",
  "graphic-street.svg",
]);

test("every bundled editorial photograph has a matching source and credit", async () => {
  const catalog = createExperienceCatalog();
  const credits = JSON.parse(await readFile(creditsUrl, "utf8"));
  const byArtwork = new Map(credits.photos.map((entry) => [entry.artwork, entry]));
  assert.equal(byArtwork.size, catalog.episodes.length);
  assert.equal(credits.license.url, "https://unsplash.com/license");

  for (const episode of catalog.episodes) {
    const credit = byArtwork.get(episode.artwork);
    assert.ok(credit, `missing photo credit for ${episode.artwork}`);
    assert.equal(credit.photographer, episode.photo.photographer);
    assert.equal(credit.source, episode.photo.sourceUrl);
    const bytes = await readFile(new URL(`./assets/experience/${credit.file}`, import.meta.url));
    assert.ok(bytes.length > 100_000, `${credit.file} is unexpectedly small`);
    assert.deepEqual([...bytes.subarray(0, 3)], [0xff, 0xd8, 0xff]);
  }
});

test("AI-assisted editorial graphics are local labelled SVG assets", async () => {
  for (const file of graphicFiles) {
    const source = await readFile(new URL(`./assets/experience/${file}`, import.meta.url), "utf8");
    assert.match(source, /^<svg/);
    assert.match(source, /<title/);
    assert.match(source, /<desc/);
    assert.doesNotMatch(source, /<image\b|href=["']https?:\/\//i);
  }
});
