import { createHash } from "node:crypto";

export const RADAR_SCHEMA_VERSION = 1;
export const MAX_RADAR_SIGNALS = 160;

const TRIBES = new Set([
  "global-curious",
  "gen-z",
  "creators-influencers",
  "builders-nerds",
  "entrepreneurs",
  "self-development",
  "parents-families",
  "life-experienced",
  "culture-arts",
  "music-communities",
  "gamers",
  "sports-communities",
  "sustainability",
  "politics-society",
  "local-life",
]);

const KEYWORDS = Object.freeze({
  "gen-z": ["gen z", "student", "campus", "tiktok", "youth", "young people"],
  "creators-influencers": ["creator", "influencer", "youtube", "instagram", "tiktok", "podcast", "streamer"],
  "builders-nerds": ["ai", "software", "developer", "science", "engineering", "robot", "space", "technology", "open source"],
  entrepreneurs: ["startup", "founder", "business", "entrepreneur", "market", "company", "investment"],
  "self-development": ["wellbeing", "habit", "psychology", "health", "learning", "productivity", "mindfulness"],
  "parents-families": ["parent", "family", "school", "children", "childcare", "home"],
  "life-experienced": ["retirement", "pension", "heritage", "history", "over 60", "older people"],
  "culture-arts": ["art", "book", "film", "fashion", "design", "museum", "theatre", "culture", "television"],
  "music-communities": ["music", "album", "song", "band", "concert", "festival", "singer", "spotify"],
  gamers: ["game", "gaming", "playstation", "xbox", "nintendo", "esports"],
  "sports-communities": ["sport", "football", "soccer", "cricket", "tennis", "olympic", "league", "cup"],
  sustainability: ["climate", "energy", "environment", "sustainability", "nature", "wildlife", "recycling"],
  "politics-society": ["politics", "government", "election", "law", "court", "crime", "protest", "society", "war"],
  "local-life": ["local", "city", "community", "transport", "housing", "weather", "restaurant"],
});

function cleanText(value, limit = 320) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(cleanText(value, 2000));
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return null;
  }
}

function timestamp(value, fallback) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function firstTag(xml, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"))?.[1] ?? "";
}

function idFor(...values) {
  return createHash("sha256").update(values.join("\u001f")).digest("hex").slice(0, 24);
}

export function tribeHintsForText(value) {
  const text = cleanText(value, 4000).toLowerCase();
  const hints = ["global-curious"];
  for (const [tribe, words] of Object.entries(KEYWORDS)) {
    if (words.some((word) => text.includes(word))) hints.push(tribe);
  }
  return Object.freeze(hints.slice(0, 6));
}

function boundedMomentum(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : 40;
}

function cleanSignal(candidate, generatedAt) {
  if (candidate === null || typeof candidate !== "object") return null;
  const headline = cleanText(candidate.headline, 220);
  const url = safeHttpsUrl(candidate.url);
  const publisher = cleanText(candidate.publisher, 100);
  const sourceId = cleanText(candidate.sourceId, 64).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const region = cleanText(candidate.region, 40).toLowerCase().replace(/[^a-z0-9_-]/g, "-") || "global";
  if (headline.length < 3 || url === null || publisher.length < 2 || sourceId.length < 2) return null;
  const tribeHints = [...new Set((Array.isArray(candidate.tribeHints) ? candidate.tribeHints : tribeHintsForText(headline))
    .filter((value) => TRIBES.has(value)))].slice(0, 6);
  if (!tribeHints.includes("global-curious")) tribeHints.unshift("global-curious");
  return Object.freeze({
    id: cleanText(candidate.id, 64).toLowerCase().replace(/[^a-z0-9_-]/g, "-") || idFor(sourceId, headline, url),
    type: ["search-trend", "community-story", "knowledge-interest", "news-signal"].includes(candidate.type)
      ? candidate.type
      : "news-signal",
    headline,
    summary: cleanText(candidate.summary, 520),
    url,
    publisher,
    sourceId,
    region,
    publishedAt: timestamp(candidate.publishedAt, generatedAt),
    momentum: boundedMomentum(candidate.momentum),
    tribeHints: Object.freeze(tribeHints),
    formats: Object.freeze([...new Set((Array.isArray(candidate.formats) ? candidate.formats : ["article"])
      .filter((value) => ["article", "image", "music", "video", "questionnaire"].includes(value)))].slice(0, 4)),
    ...(safeHttpsUrl(candidate.imageUrl) === null ? {} : { imageUrl: safeHttpsUrl(candidate.imageUrl) }),
  });
}

export function parseGoogleTrendsRss(xml, source, now = new Date()) {
  if (typeof xml !== "string" || source === null || typeof source !== "object") return Object.freeze([]);
  const generatedAt = now.toISOString();
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
  return Object.freeze(items.map((item, index) => {
    const headline = cleanText(firstTag(item, "title"), 220);
    const newsTitle = cleanText(firstTag(item, "ht:news_item_title"), 300);
    const newsUrl = safeHttpsUrl(firstTag(item, "ht:news_item_url"));
    const picture = safeHttpsUrl(firstTag(item, "ht:picture"));
    const trafficText = cleanText(firstTag(item, "ht:approx_traffic"), 40);
    const traffic = Number(trafficText.replace(/[^0-9]/g, ""));
    const searchUrl = safeHttpsUrl(firstTag(item, "link"));
    if (headline.length === 0 || (newsUrl ?? searchUrl) === null) return null;
    return cleanSignal({
      id: `trend-${source.region}-${idFor(headline)}`,
      type: "search-trend",
      headline,
      summary: newsTitle,
      url: newsUrl ?? searchUrl,
      publisher: "Google Trends",
      sourceId: source.id,
      region: source.region,
      publishedAt: firstTag(item, "pubDate"),
      momentum: Number.isFinite(traffic) ? Math.min(100, 45 + Math.round(Math.log10(Math.max(1, traffic)) * 10)) : 55 - index,
      tribeHints: tribeHintsForText(`${headline} ${newsTitle}`),
      formats: picture === null ? ["article"] : ["article", "image"],
      imageUrl: picture,
    }, generatedAt);
  }).filter(Boolean));
}

export function parseHackerNewsStories(stories, now = new Date()) {
  const generatedAt = now.toISOString();
  return Object.freeze((Array.isArray(stories) ? stories : []).map((story) => {
    if (story === null || typeof story !== "object" || story.type !== "story") return null;
    const headline = cleanText(story.title, 220);
    const url = safeHttpsUrl(story.url) ?? safeHttpsUrl(`https://news.ycombinator.com/item?id=${Number(story.id)}`);
    if (headline.length === 0 || url === null) return null;
    return cleanSignal({
      id: `hn-${Number(story.id)}`,
      type: "community-story",
      headline,
      summary: `${Number(story.score ?? 0)} points · ${Number(story.descendants ?? 0)} comments`,
      url,
      publisher: "Hacker News",
      sourceId: "hacker-news",
      region: "global",
      publishedAt: new Date(Number(story.time ?? now.getTime() / 1000) * 1000).toISOString(),
      momentum: 35 + Math.log10(Math.max(1, Number(story.score ?? 1))) * 20,
      tribeHints: ["global-curious", "builders-nerds", "entrepreneurs"],
      formats: ["article"],
    }, generatedAt);
  }).filter(Boolean));
}

export function parseWikimediaTop(payload, now = new Date()) {
  const generatedAt = now.toISOString();
  const articles = payload?.items?.[0]?.articles;
  return Object.freeze((Array.isArray(articles) ? articles : []).filter(({ article }) =>
    typeof article === "string" && !/^(?:Main_Page|Special:|Wikipedia:)/.test(article)
  ).slice(0, 60).map((item, index) => {
    const headline = cleanText(String(item.article).replaceAll("_", " "), 220);
    return cleanSignal({
      id: `wiki-${idFor(item.article)}`,
      type: "knowledge-interest",
      headline,
      summary: `${Number(item.views ?? 0).toLocaleString("en")} English Wikipedia views in the latest complete day`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.article)}`,
      publisher: "Wikimedia Pageviews",
      sourceId: "wikimedia-top",
      region: "global",
      publishedAt: generatedAt,
      momentum: Math.max(20, 78 - index),
      tribeHints: tribeHintsForText(headline),
      formats: ["article", "image"],
    }, generatedAt);
  }).filter(Boolean));
}

export function createRadarEdition({ signals, sources, now = new Date() }) {
  const generatedAt = now.toISOString();
  const unique = new Map();
  for (const candidate of Array.isArray(signals) ? signals : []) {
    const signal = cleanSignal(candidate, generatedAt);
    if (signal === null) continue;
    const key = signal.url.toLowerCase();
    const previous = unique.get(key);
    if (previous === undefined || signal.momentum > previous.momentum) unique.set(key, signal);
  }
  const ranked = [...unique.values()]
    .sort((left, right) => right.momentum - left.momentum || right.publishedAt.localeCompare(left.publishedAt) || left.id.localeCompare(right.id))
    .slice(0, MAX_RADAR_SIGNALS);
  const sourceRows = (Array.isArray(sources) ? sources : []).map((source) => Object.freeze({
    id: cleanText(source.id, 64),
    label: cleanText(source.label, 100),
    state: source.state === "ok" ? "ok" : "unavailable",
    count: Math.max(0, Math.floor(Number(source.count) || 0)),
  })).filter(({ id, label }) => id.length > 0 && label.length > 0);
  return Object.freeze({
    schemaVersion: RADAR_SCHEMA_VERSION,
    generatedAt,
    expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    editorialPolicy: Object.freeze({
      mission: "Entertain, educate and inform with freedom, creativity and humour; never optimise for anger or distress.",
      geography: Object.freeze(["global", "uk", "us", "canada", "australia", "india", "china"]),
      attributionRequired: true,
    }),
    sources: Object.freeze(sourceRows),
    signals: Object.freeze(ranked),
  });
}

export function validateRadarEdition(candidate, now = new Date()) {
  if (candidate === null || typeof candidate !== "object" || candidate.schemaVersion !== RADAR_SCHEMA_VERSION) return null;
  const generated = Date.parse(candidate.generatedAt);
  const expires = Date.parse(candidate.expiresAt);
  if (!Number.isFinite(generated) || !Number.isFinite(expires) || expires <= generated || generated > now.getTime() + 5 * 60 * 1000) return null;
  const edition = createRadarEdition({ signals: candidate.signals, sources: candidate.sources, now: new Date(generated) });
  if (edition.signals.length === 0) return null;
  return Object.freeze({ ...edition, expiresAt: new Date(expires).toISOString() });
}
