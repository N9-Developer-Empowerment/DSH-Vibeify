import test from "node:test";
import assert from "node:assert/strict";

import {
  createExperienceCatalog,
  episodesForSection,
  validateExperienceEpisode,
} from "./client-src/experience/catalog.js";

test("experience catalogue has resolvable rails and explicit creative provenance", () => {
  const catalog = createExperienceCatalog();
  assert.equal(catalog.byId[catalog.heroId].title, "Skin Care, Beautifully Sorted");
  assert.ok(catalog.episodes.length >= 6);

  for (const episode of catalog.episodes) {
    assert.equal(validateExperienceEpisode(episode), episode);
    assert.match(episode.creatorLine, /creator|writer|stylist|makeup/i);
    assert.match(episode.aiDisclosure, /AI/i);
    assert.equal("studioPrompt" in episode, false);
    assert.ok(episode.resultFeatures.length >= 3);
    assert.equal(episode.photo.kind, "photograph");
    assert.match(episode.photo.sourceUrl, /^https:\/\/unsplash\.com\/photos\//);
    assert.equal(episode.photo.licenseUrl, "https://unsplash.com/license");
    assert.ok(episode.photo.photographer.length > 0);
    assert.ok(episode.photo.alt.length > 0);
    assert.match(episode.aiDisclosure, /AI graphic treatment/i);
    assert.doesNotMatch(episode.aiDisclosure, /AI[- ]generated (photo|image)/i);
    assert.equal(episode.graphic.kind, "ai-graphic");
    assert.match(episode.graphic.artwork, /Graphic$/);
    assert.match(episode.graphic.provenanceUrl, /^https:\/\/github\.com\/N9-Developer-Empowerment\/DSH-Vibeify/);
    assert.ok(episode.editorialNotes.length >= 2);
  }

  for (const rail of catalog.rails) {
    assert.ok(rail.episodeIds.length >= 3);
    assert.ok(rail.episodeIds.every((id) => catalog.byId[id] !== undefined));
  }
});

test("section selection is intent-led rather than gender-coded", () => {
  const catalog = createExperienceCatalog();
  assert.deepEqual(episodesForSection(catalog, "worlds").map(({ id }) => id), ["neon-rain", "say-it-better"]);
  assert.equal(episodesForSection(catalog, "creators").length, catalog.episodes.length);
  assert.equal(episodesForSection(catalog, "home").length, catalog.episodes.length);
});

test("invalid experience content fails before reaching the browser", () => {
  assert.throws(() => validateExperienceEpisode({ id: "broken" }), /episode\.artwork/);
  const valid = createExperienceCatalog().episodes[0];
  assert.throws(() => validateExperienceEpisode({ ...valid, creatorStatus: "uncredited" }), /creatorStatus/);
  assert.throws(() => validateExperienceEpisode({ ...valid, photo: { ...valid.photo, kind: "synthetic" } }), /real photograph/);
  assert.throws(() => validateExperienceEpisode({ ...valid, graphic: { ...valid.graphic, kind: "photograph" } }), /AI-assisted graphic/);
});
