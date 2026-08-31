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
