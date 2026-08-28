const CREATOR_STATUS = new Set(["creator-led", "source-led"]);
const PHOTO_LICENSE = "https://unsplash.com/license";

function photo(photographer, sourceUrl, alt, focalPoint) {
  return Object.freeze({ kind: "photograph", photographer, sourceUrl, licenseUrl: PHOTO_LICENSE, alt, focalPoint });
}

const EPISODES = Object.freeze([
  Object.freeze({
    id: "neon-rain",
    artwork: "neonRain",
    title: "Anime Night, Sorted",
    eyebrow: "The watch desk",
    description: "A current, legal route into anime nights, with credited creators, official artwork and trailers.",
    duration: "Continuous edit",
    maturity: "UK sources",
    category: "escape",
    moods: Object.freeze(["dreamy", "cinematic", "after-hours"]),
    creatorLine: "Source-led edit · original creators linked",
    creatorStatus: "source-led",
    aiDisclosure: "AI graphic treatment: colour, type and layout; the photograph and recommended works are real",
    photo: photo("Komorebi Photo", "https://unsplash.com/photos/woman-in-sunglasses-at-night-with-neon-lights-qfhEfyK7xaY", "A woman wearing sunglasses beneath city lights at night", "center 50%"),
    editorialNotes: Object.freeze(["A vivid route into tonight's real watch options", "Picked for mood-first discovery, not hype", "An after-dark edit with legal links and creator credits"]),
    resultFeatures: Object.freeze(["Legal UK availability", "Official trailers", "Creator credits", "Mood routes"]),
    accent: "#ff5d8f",
  }),
  Object.freeze({
    id: "mirror-minute",
    artwork: "getReady",
    title: "Skin Care, Beautifully Sorted",
    eyebrow: "The beauty desk",
    description: "An evidence-aware look at routines, products, official images and useful expert videos—beautifully organised.",
    duration: "Continuous edit",
    maturity: "No diagnosis",
    category: "beauty",
    moods: Object.freeze(["glow", "grounded", "going-out"]),
    creatorLine: "Source-led edit · experts and creators linked",
    creatorStatus: "source-led",
    aiDisclosure: "AI graphic treatment: colour, type and layout; the photograph, products and evidence are real",
    photo: photo("Christian Agbede", "https://unsplash.com/photos/woman-applying-face-cream-in-front-of-a-mirror-Vpcy3ytvQVw", "A woman applying face cream while looking in a mirror", "center 30%"),
    editorialNotes: Object.freeze(["A calm starting point for a noisy category", "Picked for evidence, range and useful demonstrations", "The beauty desk's no-hype route into skin care"]),
    resultFeatures: Object.freeze(["Routine routes", "Product cards", "Image and video links", "Safety context"]),
    accent: "#ffb25e",
  }),
  Object.freeze({
    id: "say-it-better",
    artwork: "sayItBetter",
    title: "Say It Better, With Experts",
    eyebrow: "The conversation desk",
    description: "Credible expert resources, useful videos and humane ways to think through a difficult conversation.",
    duration: "Continuous edit",
    maturity: "Not therapy",
    category: "relationships",
    moods: Object.freeze(["brave", "clear", "soft"]),
    creatorLine: "Source-led edit · educators and creators linked",
    creatorStatus: "source-led",
    aiDisclosure: "AI graphic treatment: colour, type and layout; the photograph and expert sources are real",
    photo: photo("Haberdoedas", "https://unsplash.com/photos/two-women-talking-at-a-cafe-table-EyNU9nims7c", "Two women talking together at a cafe counter", "center 48%"),
    editorialNotes: Object.freeze(["Useful language for a conversation you keep postponing", "Picked for warmth, clarity and credible educators", "Three routes through one recognisably human moment"]),
    resultFeatures: Object.freeze(["Expert sources", "Creator videos", "Three approaches", "Safety signposting"]),
    accent: "#9f8cff",
  }),
  Object.freeze({
    id: "shop-the-scene",
    artwork: "shopScene",
    title: "Find My Look, With Receipts",
    eyebrow: "The style desk",
    description: "A cinematic look considered through honest alternatives, image links, tutorials and no pressure to buy.",
    duration: "Continuous edit",
    maturity: "Prices dated",
    category: "shopping",
    moods: Object.freeze(["playful", "considered", "editorial"]),
    creatorLine: "Source-led edit · stylists and creators linked",
    creatorStatus: "source-led",
    aiDisclosure: "AI graphic treatment: colour, type and layout; the photograph and linked products are real",
    photo: photo("Max Omen", "https://unsplash.com/photos/a-woman-walks-towards-the-camera-outdoors-V7oBvq1qsxw", "A woman wearing casual street style beneath an urban bridge", "center 25%"),
    editorialNotes: Object.freeze(["One strong visual idea, translated without the shopping avalanche", "Picked for useful alternatives and honest prices", "A cinematic look with a wear-again reality check"]),
    resultFeatures: Object.freeze(["Hero look", "Budget remix", "Official product images", "Styling videos"]),
    accent: "#55e0d1",
  }),
  Object.freeze({
    id: "makeup-lessons",
    artwork: "makeupArtist",
    title: "Makeup Lessons Worth Watching",
    eyebrow: "The beauty video edit",
    description: "Real artists, original tutorials and the exact techniques worth your time—products stay secondary to the craft.",
    duration: "Continuous edit",
    maturity: "Creators credited",
    category: "beauty",
    moods: Object.freeze(["glow", "creative", "going-out"]),
    creatorLine: "Creator-led edit · working makeup artists linked",
    creatorStatus: "creator-led",
    aiDisclosure: "AI graphic treatment: colour, type and layout; the photograph, artists and tutorials are real",
    photo: photo("Ashim Das", "https://unsplash.com/photos/a-woman-putting-makeup-on-another-womans-face-n42VxNU5288", "A makeup artist applying eye makeup to a model", "center 20%"),
    editorialNotes: Object.freeze(["The tutorial shelf chosen for technique, not product placement", "Picked to put working artists before shopping links", "A creator-first route from five minutes to full expression"]),
    resultFeatures: Object.freeze(["Original tutorials", "Artist credits", "Technique routes", "Minimal product lists"]),
    accent: "#ff7b5f",
  }),
  Object.freeze({
    id: "street-style-edit",
    artwork: "cityStyle",
    title: "The Street-Style Edit",
    eyebrow: "The real-world fashion edit",
    description: "Credited street photography becomes wearable ideas, use-what-you-own routes and a small number of honest links.",
    duration: "Continuous edit",
    maturity: "No body scoring",
    category: "shopping",
    moods: Object.freeze(["editorial", "wearable", "city"]),
    creatorLine: "Photo-led edit · photographers and stylists linked",
    creatorStatus: "creator-led",
    aiDisclosure: "AI graphic treatment: colour, type and layout; the photograph, editorials and clothes are real",
    photo: photo("Ignacio Estevo", "https://unsplash.com/photos/two-young-women-walk-down-a-busy-city-street-gEfyNyCshQY", "Two women walking down a busy city street in layered outfits", "center 30%"),
    editorialNotes: Object.freeze(["A real-photography route to clothes you might actually wear", "Picked for observation, not manufactured trend claims", "The street-style desk's wear-what-you-own edition"]),
    resultFeatures: Object.freeze(["Credited photography", "Three visual directions", "Wear-what-you-own routes", "Dated product links"]),
    accent: "#79d3ff",
  }),
]);

const RAILS = Object.freeze([
  Object.freeze({
    id: "continue",
    title: "Start with something good",
    subtitle: "Useful material is already present while deeper pages are assembled",
    episodeIds: Object.freeze(["neon-rain", "makeup-lessons", "say-it-better", "shop-the-scene"]),
  }),
  Object.freeze({
    id: "ten-minutes",
    title: "Good content, beautifully sorted",
    subtitle: "Current links, useful images and videos, with no blank prompt first",
    episodeIds: Object.freeze(["mirror-minute", "street-style-edit", "say-it-better", "neon-rain"]),
  }),
  Object.freeze({
    id: "creator-first",
    title: "Built from real sources",
    subtitle: "Experts and creators stay visible; AI does the finding and organising",
    episodeIds: Object.freeze(["mirror-minute", "makeup-lessons", "street-style-edit", "say-it-better"]),
  }),
]);

function assertText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
}

export function validateExperienceEpisode(episode) {
  if (episode === null || typeof episode !== "object") throw new TypeError("episode must be an object");
  for (const field of ["id", "artwork", "title", "eyebrow", "description", "duration", "maturity", "category", "creatorLine", "aiDisclosure", "accent"]) {
    assertText(episode[field], `episode.${field}`);
  }
  if (!CREATOR_STATUS.has(episode.creatorStatus)) {
    throw new TypeError(`episode.creatorStatus is unsupported: ${String(episode.creatorStatus)}`);
  }
  if (!Array.isArray(episode.moods) || episode.moods.length === 0) {
    throw new TypeError("episode.moods must contain at least one mood");
  }
  if (!Array.isArray(episode.resultFeatures) || episode.resultFeatures.length < 3) {
    throw new TypeError("episode.resultFeatures must explain the resulting stream item");
  }
  if (!Array.isArray(episode.editorialNotes) || episode.editorialNotes.length < 2 || episode.editorialNotes.some((note) => typeof note !== "string" || note.trim().length === 0)) {
    throw new TypeError("episode.editorialNotes must contain authored selection reasons");
  }
  if (episode.photo === null || typeof episode.photo !== "object" || episode.photo.kind !== "photograph") {
    throw new TypeError("episode.photo must identify a real photograph");
  }
  for (const field of ["photographer", "sourceUrl", "licenseUrl", "alt", "focalPoint"]) assertText(episode.photo[field], `episode.photo.${field}`);
  for (const field of ["sourceUrl", "licenseUrl"]) {
    if (!/^https:\/\//i.test(episode.photo[field])) throw new TypeError(`episode.photo.${field} must be an HTTPS URL`);
  }
  if (!/AI graphic treatment/i.test(episode.aiDisclosure)) {
    throw new TypeError("episode.aiDisclosure must limit AI to graphic treatment");
  }
  return episode;
}

export function createExperienceCatalog() {
  const episodes = EPISODES.map((episode) => validateExperienceEpisode(episode));
  const byId = Object.freeze(Object.fromEntries(episodes.map((episode) => [episode.id, episode])));
  for (const rail of RAILS) {
    assertText(rail.id, "rail.id");
    assertText(rail.title, "rail.title");
    for (const id of rail.episodeIds) {
      if (byId[id] === undefined) throw new TypeError(`rail ${rail.id} references unknown episode ${id}`);
    }
  }
  return Object.freeze({
    heroId: "mirror-minute",
    episodes: Object.freeze(episodes),
    byId,
    rails: RAILS,
  });
}

export function episodesForSection(catalog, section) {
  if (section === "worlds") return catalog.episodes.filter((episode) => episode.category === "escape" || episode.category === "relationships");
  if (section === "creators") return catalog.episodes;
  if (section === "saved") return [];
  return catalog.episodes;
}
