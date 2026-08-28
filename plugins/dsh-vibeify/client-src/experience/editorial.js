function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function shuffle(values, seed) {
  const result = [...values];
  let state = seed || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const target = state % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function balanceCategories(values) {
  const remaining = [...values];
  const balanced = [];
  while (remaining.length > 0) {
    const previousCategory = balanced.at(-1)?.category;
    const nextIndex = remaining.findIndex((episode) => episode.category !== previousCategory);
    balanced.push(...remaining.splice(nextIndex < 0 ? 0 : nextIndex, 1));
  }
  return balanced;
}

function rail(editionEpisodes, seed, id, title, subtitle, offset) {
  const ordered = balanceCategories(shuffle(editionEpisodes, seed ^ offset));
  return Object.freeze({
    id,
    title,
    subtitle,
    episodeIds: Object.freeze(ordered.slice(0, 4).map(({ id: episodeId }) => episodeId)),
  });
}

export function createEditorialEdition(catalog, editionKey) {
  if (catalog === null || typeof catalog !== "object" || !Array.isArray(catalog.episodes)) {
    throw new TypeError("editorial catalogue is required");
  }
  if (typeof editionKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(editionKey)) {
    throw new TypeError("edition key must be an ISO calendar date");
  }
  const seed = hash(`vibe-editorial:${editionKey}`);
  const ordered = balanceCategories(shuffle(catalog.episodes, seed));
  const episodes = Object.freeze(ordered.map((episode, index) => Object.freeze({
    ...episode,
    editorialNote: episode.editorialNotes[(seed + index) % episode.editorialNotes.length],
  })));
  const byId = Object.freeze(Object.fromEntries(episodes.map((episode) => [episode.id, episode])));
  const rails = Object.freeze([
    rail(episodes, seed, "editors-cut", "The editor's cut", "A balanced selection across beauty, style, relationships and escape", 0x9e3779b9),
    rail(episodes, seed, "watch-and-learn", "Worth watching, not just scrolling", "Original tutorials, trailers and expert explainers with their creators attached", 0x85ebca6b),
    rail(episodes, seed, "real-sources", "Real people, real sources", "Photography, products and culture you can trace back to the humans who made them", 0xc2b2ae35),
  ]);
  return Object.freeze({
    ...catalog,
    heroId: episodes[0].id,
    episodes,
    byId,
    rails,
    editorial: Object.freeze({
      key: editionKey,
      label: `Editor's edition · ${editionKey}`,
      policy: "Real photographs and sourceable culture; AI graphics are labelled",
    }),
  });
}
