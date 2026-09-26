import assert from "node:assert/strict";
import test from "node:test";

import {
  createVisualService,
  normalizeOpenverse,
  normalizePexels,
  normalizePixabay,
  normalizeWikimedia,
} from "./visual-service.js";

test("Pexels and Pixabay responses become credited candidates without retaining credentials", () => {
  const pexels = normalizePexels({ photos: [{
    id: 7,
    alt: "A red bicycle outside a shop",
    photographer: "A Photographer",
    photographer_url: "https://www.pexels.com/@a-photographer/",
    url: "https://www.pexels.com/photo/red-bicycle-7/",
    width: 1800,
    height: 1200,
    src: { large2x: "https://images.pexels.com/photos/7/red-bicycle.jpeg" },
  }] }, "red bicycle");
  const pixabay = normalizePixabay({ hits: [{
    id: 8,
    tags: "red bicycle, street, transport",
    user: "B Photographer",
    pageURL: "https://pixabay.com/photos/red-bicycle-8/",
    webformatURL: "https://cdn.pixabay.com/photo/8/red-bicycle_1280.jpg",
    imageWidth: 1600,
    imageHeight: 1067,
  }] }, "red bicycle");

  assert.equal(pexels[0].provider, "pexels");
  assert.match(pexels[0].credit, /A Photographer.*Pexels/);
  assert.equal(pexels[0].license, "Pexels licence");
  assert.equal(pixabay[0].provider, "pixabay");
  assert.match(pixabay[0].credit, /B Photographer.*Pixabay/);
  assert.equal(pixabay[0].license, "Pixabay Content License");
  assert.doesNotMatch(JSON.stringify([pexels, pixabay]), /api[_-]?key|secret/i);
});

test("Wikimedia and Openverse keep only clearly reusable image families", () => {
  const wikimedia = normalizeWikimedia({ query: { pages: [{
    pageid: 12,
    title: "File:Red bicycle.jpg",
    fullurl: "https://commons.wikimedia.org/wiki/File:Red_bicycle.jpg",
    imageinfo: [{
      thumburl: "https://upload.wikimedia.org/red-bicycle.jpg",
      thumbwidth: 1600,
      thumbheight: 1067,
      extmetadata: {
        LicenseShortName: { value: "CC BY-SA 4.0" },
        Artist: { value: "<a>Commons maker</a>" },
        ImageDescription: { value: "Red bicycle outside a shop" },
      },
    }],
  }] } }, "red bicycle");
  const openverse = normalizeOpenverse({ results: [
    {
      id: "ok",
      title: "Red bicycle outside a shop",
      creator: "Open maker",
      license: "by",
      license_version: "4.0",
      url: "https://live.staticflickr.com/1/red-bicycle.jpg",
      foreign_landing_url: "https://www.flickr.com/photos/open-maker/1",
      width: 1600,
      height: 1067,
    },
    {
      id: "unclear",
      title: "Red bicycle",
      creator: "Unknown",
      license: "sampling+",
      url: "https://unknown.example/red-bicycle.jpg",
      foreign_landing_url: "https://unknown.example/page",
    },
  ] }, "red bicycle");

  assert.equal(wikimedia.length, 1);
  assert.equal(wikimedia[0].license, "CC BY-SA 4.0");
  assert.equal(openverse.length, 1);
  assert.equal(openverse[0].license, "CC BY 4.0");
});

test("service resolves credentials per search, uses every available provider, and never returns them", async () => {
  const requests = [];
  const credentials = new Map([
    ["PEXELS_API_KEY", "pexels-test-secret"],
    ["PIXABAY_API_KEY", "pixabay-test-secret"],
  ]);
  const fetchJson = async (url, options = {}) => {
    requests.push({ url: String(url), headers: options.headers ?? {} });
    if (String(url).includes("pexels.com")) return { photos: [] };
    if (String(url).includes("pixabay.com")) return { hits: [] };
    if (String(url).includes("openverse.org")) return { results: [] };
    return { query: { pages: [] } };
  };
  const service = createVisualService({
    getConfig: () => ({
      wikimedia: true,
      openverse: true,
      pexels: true,
      pixabay: true,
      pexelsApiKeyEnv: "PEXELS_API_KEY",
      pixabayApiKeyEnv: "PIXABAY_API_KEY",
    }),
    resolveCredential: async (ref) => credentials.get(ref),
    fetchJson,
  });

  const result = await service.search({ query: "red bicycle", orientation: "landscape", limit: 12, excludeUrls: [] });

  assert.deepEqual(result.providers, ["wikimedia", "openverse", "pexels", "pixabay"]);
  assert.equal(requests.length, 4);
  assert.equal(requests.find(({ url }) => url.includes("pexels.com")).headers.Authorization, "pexels-test-secret");
  assert.match(requests.find(({ url }) => url.includes("pixabay.com")).url, /key=pixabay-test-secret/);
  assert.doesNotMatch(JSON.stringify(result), /pexels-test-secret|pixabay-test-secret/);
});

test("service reports optional keyed providers as unavailable without making credential-free requests", async () => {
  const requests = [];
  const service = createVisualService({
    getConfig: () => ({
      wikimedia: true,
      openverse: true,
      pexels: true,
      pixabay: true,
      pexelsApiKeyEnv: "PEXELS_API_KEY",
      pixabayApiKeyEnv: "PIXABAY_API_KEY",
    }),
    resolveCredential: async () => undefined,
    fetchJson: async (url) => {
      requests.push(String(url));
      return String(url).includes("openverse") ? { results: [] } : { query: { pages: [] } };
    },
  });

  const capabilities = await service.capabilities();
  const result = await service.search({ query: "red bicycle", limit: 8, excludeUrls: [] });

  assert.equal(capabilities.pexels.configured, false);
  assert.equal(capabilities.pixabay.configured, false);
  assert.deepEqual(result.providers, ["wikimedia", "openverse"]);
  assert.equal(requests.some((url) => url.includes("pexels") || url.includes("pixabay")), false);
});

test("a provider's unrelated large photograph does not displace a story-specific image", async () => {
  const service = createVisualService({
    getConfig: () => ({ wikimedia: false, openverse: false, pexels: true, pixabay: false }),
    resolveCredential: async () => "test-key",
    fetchJson: async () => ({ photos: [
      {
        alt: "A woman relaxing on a tropical beach",
        photographer: "Beach maker",
        url: "https://www.pexels.com/photo/beach-1/",
        width: 3000, height: 2000,
        src: { large2x: "https://images.pexels.com/photos/1/beach.jpeg" },
      },
      {
        alt: "City bicycle beside a station",
        photographer: "Bike maker",
        url: "https://www.pexels.com/photo/bicycle-2/",
        width: 1800, height: 1200,
        src: { large2x: "https://images.pexels.com/photos/2/bicycle.jpeg" },
      },
      {
        alt: "",
        photographer: "Unknown scene maker",
        url: "https://www.pexels.com/photo/unknown-3/",
        width: 1800, height: 1200,
        src: { large2x: "https://images.pexels.com/photos/3/unknown.jpeg" },
      },
    ] }),
  });

  const result = await service.search({ query: "Why city bicycles are getting smaller", limit: 8 });
  assert.deepEqual(result.candidates.map(({ alt }) => alt), ["City bicycle beside a station"]);
});

test("private or oversized search material is rejected before network activity", async () => {
  let requests = 0;
  const service = createVisualService({
    getConfig: () => ({ wikimedia: true, openverse: false, pexels: false, pixabay: false }),
    resolveCredential: async () => undefined,
    fetchJson: async () => { requests += 1; return {}; },
  });

  await assert.rejects(() => service.search({ query: "x".repeat(181), limit: 8, excludeUrls: [] }), /query/i);
  await assert.rejects(() => service.search({ query: "normal\nprivate prompt", limit: 8, excludeUrls: [] }), /query/i);
  assert.equal(requests, 0);
});

test("an editor's Commons source is resolved with authoritative licence despite a poetic headline", async () => {
  const urls = [];
  const service = createVisualService({
    getConfig: () => ({}), resolveCredential: async () => undefined,
    fetchJson: async (url) => { urls.push(String(url)); return { query: { pages: [{
      title: 'File:Portrait_(1938).jpg', fullurl: 'https://commons.wikimedia.org/wiki/File:Portrait_(1938).jpg',
      imageinfo: [{ url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Portrait.jpg', thumburl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Portrait.jpg/1920px-Portrait.jpg', width: 1600, height: 1800,
        extmetadata: { LicenseShortName: { value: 'Public domain' }, Artist: { value: 'Named photographer' }, ImageDescription: { value: 'Portrait' } } }],
    }] } }; },
  });
  const result = await service.search({ query: 'Walking into the future', sourceUrls: ['https://commons.wikimedia.org/wiki/File:Portrait_(1938).jpg'] });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].license, 'Public domain');
  assert.equal(new URL(result.candidates[0].imageUrl).hostname, 'thumb.wikimedia.org');
  assert.equal(new URL(urls[0]).searchParams.get('titles'), 'File:Portrait_(1938).jpg');
  assert.equal(urls.length, 1);
});

test("source recovery never fetches arbitrary supplied URLs", async () => {
  const urls = [];
  const service = createVisualService({getConfig: () => ({openverse:false}), resolveCredential: async () => undefined,
    fetchJson: async (url) => { urls.push(String(url)); return {}; }});
  await service.search({ query: 'public subject', sourceUrls: ['https://127.0.0.1/private', 'https://commons.wikimedia.org.evil.test/wiki/File:Photo.jpg'] });
  assert.equal(urls.length, 1);
  assert.equal(new URL(urls[0]).searchParams.has('titles'), false);
});

test("a single generic word in a long headline cannot select an unrelated archival scan", async () => {
  const service = createVisualService({ getConfig: () => ({ wikimedia: false, openverse: true, pexels: false, pixabay: false }), resolveCredential: async () => undefined,
    fetchJson: async () => ({ results: [{url:'https://upload.wikimedia.org/book.jpg',foreign_landing_url:'https://commons.wikimedia.org/wiki/File:Book.jpg',title:'The adventures of Philip on his way through the world',creator:'Archivist',license:'pdm',width:2000,height:1400}] }) });
  assert.equal((await service.search({ query:'How to Remember Him From Admiration to a Year of Practice' })).candidates.length,0);
});
