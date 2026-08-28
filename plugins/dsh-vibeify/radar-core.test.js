import assert from "node:assert/strict";
import test from "node:test";

import {
  createRadarEdition,
  parseGoogleTrendsRss,
  parseHackerNewsStories,
  parseWikimediaTop,
  tribeHintsForText,
  validateRadarEdition,
} from "../../radar/radar-core.mjs";

const NOW = new Date("2026-08-28T20:00:00.000Z");

test("Google Trends becomes bounded attributed public signals", () => {
  const xml = `<rss><channel><item><title><![CDATA[Creative AI music tools]]></title><link>https://trends.google.com/trending?x=1&amp;utm_source=no</link><pubDate>Fri, 28 Aug 2026 19:00:00 GMT</pubDate><ht:approx_traffic>200K+</ht:approx_traffic><ht:news_item><ht:news_item_title>Musicians test a new generation of tools</ht:news_item_title><ht:news_item_url>https://example.com/story?utm_source=tracking</ht:news_item_url><ht:picture>https://images.example.com/music.jpg</ht:picture></ht:news_item></item></channel></rss>`;
  const signals = parseGoogleTrendsRss(xml, { id: "google-trends-gb", region: "uk" }, NOW);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].publisher, "Google Trends");
  assert.equal(signals[0].url, "https://example.com/story");
  assert.deepEqual(signals[0].tribeHints, ["global-curious", "builders-nerds", "music-communities"]);
});

test("community and knowledge APIs remain links rather than copied articles", () => {
  const hn = parseHackerNewsStories([{ id: 42, type: "story", title: "A playful open source robot", url: "https://example.org/robot", score: 240, descendants: 63, time: 1787940000 }], NOW);
  const wiki = parseWikimediaTop({ items: [{ articles: [{ article: "A_new_film", views: 90_000 }, { article: "Main_Page", views: 2_000_000 }] }] }, NOW);
  assert.equal(hn[0].type, "community-story");
  assert.equal(wiki.length, 1);
  assert.match(wiki[0].url, /^https:\/\/en\.wikipedia\.org\/wiki\//);
  assert.ok(!Object.hasOwn(hn[0], "body"));
});

test("radar validates a public content-only edition and rejects empty payloads", () => {
  const signals = Array.from({ length: 14 }, (_value, index) => ({
    id: `signal-${index}`,
    type: "news-signal",
    headline: `Magazine-worthy signal ${index}`,
    summary: "A bounded public description.",
    url: `https://example.com/${index}`,
    publisher: "Example",
    sourceId: "fixture",
    region: index % 2 === 0 ? "global" : "india",
    publishedAt: NOW.toISOString(),
    momentum: 80 - index,
    tribeHints: tribeHintsForText(index % 2 === 0 ? "film and music" : "science and founders"),
    formats: ["article"],
  }));
  const edition = createRadarEdition({ signals, sources: [{ id: "fixture", label: "Fixture", state: "ok", count: 14 }], now: NOW });
  assert.equal(edition.signals.length, 14);
  assert.equal(validateRadarEdition(edition, NOW)?.signals.length, 14);
  assert.equal(validateRadarEdition({ ...edition, signals: [] }, NOW), null);
  assert.equal(JSON.stringify(edition).includes("session"), false);
});
