export const MAX_VIBE_LIBRARY_QUERY = 120;
export const MAX_VIBE_LIBRARY_RESULTS = 160;

const LIBRARY_SOURCES = new Set(["chat-directed", "fresh-stream", "radar-reserve"]);

function retainedVibe(chunk) {
  return chunk !== null
    && typeof chunk === "object"
    && typeof chunk.id === "string"
    && typeof chunk.title === "string"
    && typeof chunk.markdown === "string"
    && LIBRARY_SOURCES.has(chunk.source)
    && chunk.kind !== "questionnaire";
}

function searchableText(chunk) {
  return `${chunk.title}\n${chunk.markdown}`
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[*_`~#[\]()>|{}-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchTerms(query) {
  if (typeof query !== "string") return Object.freeze([]);
  const bounded = query
    .normalize("NFKC")
    .slice(0, MAX_VIBE_LIBRARY_QUERY)
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return Object.freeze(bounded === "" ? [] : bounded.split(" "));
}

/**
 * Search the restart-safe reader cache without creating another store. Input
 * order is presentation order, so newest-first callers remain newest-first.
 */
export function searchableVibeChunks(chunks, query = "") {
  if (!Array.isArray(chunks)) return Object.freeze([]);
  const terms = searchTerms(query);
  return Object.freeze(chunks
    .filter(retainedVibe)
    .filter((chunk) => {
      if (terms.length === 0) return true;
      const haystack = searchableText(chunk);
      return terms.every((term) => haystack.includes(term));
    })
    .slice(0, MAX_VIBE_LIBRARY_RESULTS));
}

export function vibeLibrarySummary(chunks) {
  const retained = searchableVibeChunks(chunks);
  const timestamps = retained.map(({ publishedAt }) => Number(publishedAt)).filter(Number.isFinite);
  return Object.freeze({
    count: retained.length,
    oldestPublishedAt: timestamps.length === 0 ? null : Math.min(...timestamps),
  });
}
