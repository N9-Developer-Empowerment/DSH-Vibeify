import test from "node:test";
import assert from "node:assert/strict";

import { createExperienceCatalog } from "./client-src/experience/catalog.js";
import { createEditorialEdition } from "./client-src/experience/editorial.js";

function ids(edition) {
  return edition.episodes.map(({ id }) => id);
}

function hasAdjacentDuplicateCategory(episodes) {
  return episodes.some((episode, index) => index > 0 && episode.category === episodes[index - 1].category);
}

test("an editorial edition is deterministic for a calendar day", () => {
  const catalog = createExperienceCatalog();
  const first = createEditorialEdition(catalog, "2026-08-27");
  const repeated = createEditorialEdition(catalog, "2026-08-27");
  assert.deepEqual(ids(first), ids(repeated));
  assert.deepEqual(first.rails, repeated.rails);
  assert.deepEqual(first.episodes.map(({ editorialNote }) => editorialNote), repeated.episodes.map(({ editorialNote }) => editorialNote));
});

test("the editorial desk changes the slate across editions", () => {
  const catalog = createExperienceCatalog();
  const editions = Array.from({ length: 7 }, (_, offset) => createEditorialEdition(catalog, `2026-09-0${offset + 1}`));
  assert.ok(new Set(editions.map((edition) => ids(edition).join(","))).size >= 4);
  assert.ok(new Set(editions.map(({ heroId }) => heroId)).size >= 3);
});

test("editorial selection balances categories and keeps authored reasons", () => {
  const catalog = createExperienceCatalog();
  const edition = createEditorialEdition(catalog, "2026-08-27");
  assert.equal(hasAdjacentDuplicateCategory(edition.episodes), false);
  for (const episode of edition.episodes) {
    assert.ok(episode.editorialNotes.includes(episode.editorialNote));
    assert.equal(episode.studioPrompt, catalog.byId[episode.id].studioPrompt);
    assert.equal(episode.photo.kind, "photograph");
  }
  for (const rail of edition.rails) {
    const episodes = rail.episodeIds.map((id) => edition.byId[id]);
    assert.equal(hasAdjacentDuplicateCategory(episodes), false);
    assert.equal(new Set(rail.episodeIds).size, rail.episodeIds.length);
  }
});

test("invalid edition inputs fail before presentation", () => {
  const catalog = createExperienceCatalog();
  assert.throws(() => createEditorialEdition(catalog, "tonight"), /ISO calendar date/);
  assert.throws(() => createEditorialEdition(null, "2026-08-27"), /catalogue/);
});
