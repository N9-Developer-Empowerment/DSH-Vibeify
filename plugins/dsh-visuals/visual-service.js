const REQUEST_TIMEOUT_MS = 12_000;
const MAX_QUERY = 180;
const MAX_EXCLUSIONS = 80;
const MAX_RESULTS = 24;
const OPEN_IMAGE_HOSTS = Object.freeze(new Set([
  "upload.wikimedia.org",
  "live.staticflickr.com",
  "images-assets.nasa.gov",
  "tile.loc.gov",
  "ids.si.edu",
]));
const REUSABLE_LICENSE = /^(?:cc0|pdm|by|by-sa|public domain)$/i;
const WIKIMEDIA_LICENSE = /^(?:CC0|CC BY(?:-SA)?(?: \d(?:\.\d)?)?|Public domain)$/i;

function cleanText(value, limit = 240) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function cleanHttps(value, allowedHosts = null) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
    const host = url.hostname.toLowerCase();
    if (allowedHosts !== null && !allowedHosts.has(host)) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function positiveDimension(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

function words(value) {
  return [...new Set(cleanText(value, MAX_QUERY).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])].slice(0, 16);
}

function relevanceScore(candidate, query) {
  const terms = words(query);
  const haystack = `${candidate.alt} ${candidate.tags ?? ""} ${candidate.creator}`.toLowerCase();
  const matches = terms.filter((term) => haystack.includes(term)).length;
  const exact = cleanText(candidate.alt).toLowerCase().includes(cleanText(query).toLowerCase()) ? 5 : 0;
  const size = (candidate.width ?? 0) >= 1200 && (candidate.height ?? 0) >= 630 ? 2 : 0;
  return exact + matches * 2 + size;
}

function candidate({ provider, imageUrl, sourceUrl, alt, creator, credit, license, width, height, tags = "" }, query) {
  const cleaned = {
    provider,
    imageUrl: cleanHttps(imageUrl),
    sourceUrl: cleanHttps(sourceUrl),
    alt: cleanText(alt, 240),
    creator: cleanText(creator || "Unknown creator", 120),
    credit: cleanText(credit, 220),
    license: cleanText(license, 80),
    width: positiveDimension(width),
    height: positiveDimension(height),
    tags: cleanText(tags, 300),
  };
  if (cleaned.imageUrl === null || cleaned.sourceUrl === null || cleaned.alt === "" || cleaned.credit === "" || cleaned.license === "") return null;
  const score = relevanceScore(cleaned, query);
  return Object.freeze({
    provider: cleaned.provider,
    imageUrl: cleaned.imageUrl,
    sourceUrl: cleaned.sourceUrl,
    alt: cleaned.alt,
    creator: cleaned.creator,
    credit: cleaned.credit,
    license: cleaned.license,
    width: cleaned.width,
    height: cleaned.height,
    score,
  });
}

function openLicense(value, version) {
  const id = cleanText(value, 32).toLowerCase();
  const release = cleanText(version, 12);
  if (!REUSABLE_LICENSE.test(id)) return null;
  if (id === "cc0") return release === "" ? "CC0" : `CC0 ${release}`;
  if (id === "pdm" || id === "public domain") return "Public domain";
  return `CC ${id.toUpperCase()}${release === "" ? "" : ` ${release}`}`;
}

export function normalizePexels(document, query) {
  const rows = Array.isArray(document?.photos) ? document.photos : [];
  return Object.freeze(rows.flatMap((photo) => {
    const item = candidate({
      provider: "pexels",
      imageUrl: photo?.src?.large2x ?? photo?.src?.large,
      sourceUrl: photo?.url,
      alt: photo?.alt || `${query} photograph`,
      creator: photo?.photographer,
      credit: `Photograph · ${cleanText(photo?.photographer || "Pexels contributor", 120)} · Pexels`,
      license: "Pexels licence",
      width: photo?.width,
      height: photo?.height,
      tags: query,
    }, query);
    return item === null ? [] : [item];
  }));
}

export function normalizePixabay(document, query) {
  const rows = Array.isArray(document?.hits) ? document.hits : [];
  return Object.freeze(rows.flatMap((photo) => {
    const item = candidate({
      provider: "pixabay",
      imageUrl: photo?.largeImageURL ?? photo?.webformatURL,
      sourceUrl: photo?.pageURL,
      alt: cleanText(photo?.tags, 240) || `${query} photograph`,
      creator: photo?.user,
      credit: `Photograph · ${cleanText(photo?.user || "Pixabay contributor", 120)} · Pixabay`,
      license: "Pixabay Content License",
      width: photo?.imageWidth ?? photo?.webformatWidth,
      height: photo?.imageHeight ?? photo?.webformatHeight,
      tags: photo?.tags,
    }, query);
    return item === null ? [] : [item];
  }));
}

export function normalizeWikimedia(document, query) {
  const pages = Array.isArray(document?.query?.pages)
    ? document.query.pages
    : Object.values(document?.query?.pages ?? {});
  return Object.freeze(pages.flatMap((page) => {
    const info = page?.imageinfo?.[0];
    const metadata = info?.extmetadata ?? {};
    const license = cleanText(metadata?.LicenseShortName?.value, 80);
    if (!WIKIMEDIA_LICENSE.test(license)) return [];
    const creator = cleanText(metadata?.Artist?.value || metadata?.Credit?.value || "Wikimedia Commons contributor", 120);
    const title = cleanText(metadata?.ImageDescription?.value || page?.title?.replace(/^File:/i, "") || query, 240);
    const item = candidate({
      provider: "wikimedia",
      imageUrl: info?.thumburl ?? info?.url,
      sourceUrl: page?.fullurl,
      alt: title,
      creator,
      credit: `Photograph · ${creator} · ${license}`,
      license,
      width: info?.thumbwidth ?? info?.width,
      height: info?.thumbheight ?? info?.height,
      tags: page?.title,
    }, query);
    return item === null || cleanHttps(item.imageUrl, new Set(["upload.wikimedia.org"])) === null ? [] : [item];
  }));
}

export function normalizeOpenverse(document, query) {
  const rows = Array.isArray(document?.results) ? document.results : [];
  return Object.freeze(rows.flatMap((row) => {
    const license = openLicense(row?.license, row?.license_version);
    if (license === null || cleanHttps(row?.url, OPEN_IMAGE_HOSTS) === null) return [];
    const creator = cleanText(row?.creator || "Openverse contributor", 120);
    const item = candidate({
      provider: "openverse",
      imageUrl: row?.url,
      sourceUrl: row?.foreign_landing_url,
      alt: row?.title || `${query} open image`,
      creator,
      credit: `Image · ${creator} · ${license}`,
      license,
      width: row?.width,
      height: row?.height,
      tags: row?.tags?.map?.((tag) => tag?.name).join(" ") ?? "",
    }, query);
    return item === null ? [] : [item];
  }));
}

function validateSearch(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError("visual search request is invalid");
  const query = typeof input.query === "string" ? input.query.trim().replace(/\s+/g, " ") : "";
  if (query.length < 3 || query.length > MAX_QUERY || /[\u0000-\u001f\u007f]/.test(input.query)) throw new TypeError("visual search query is invalid");
  const orientation = input.orientation === "portrait" || input.orientation === "square" ? input.orientation : "landscape";
  const limit = Number.isInteger(input.limit) ? Math.max(1, Math.min(MAX_RESULTS, input.limit)) : 12;
  const excludeUrls = new Set((Array.isArray(input.excludeUrls) ? input.excludeUrls : []).slice(0, MAX_EXCLUSIONS).flatMap((value) => {
    const cleaned = cleanHttps(value);
    return cleaned === null ? [] : [cleaned];
  }));
  return Object.freeze({ query, orientation, limit, excludeUrls });
}

async function defaultFetchJson(url, options = {}) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout]);
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json", ...options.headers },
    signal,
  });
  if (!response.ok) throw new Error(`provider-http-${response.status}`);
  const document = await response.json();
  if (document === null || typeof document !== "object" || Array.isArray(document)) throw new Error("provider-invalid-json");
  return document;
}

function providerPlans(input, config, credentials, fetchJson, signal) {
  const perProvider = Math.max(3, Math.min(12, Math.ceil(input.limit / 2)));
  const plans = [];
  if (config.wikimedia !== false) {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    for (const [key, value] of Object.entries({
      action: "query", generator: "search", gsrsearch: input.query, gsrnamespace: "6", gsrlimit: String(perProvider),
      prop: "imageinfo|info", iiprop: "url|extmetadata", iiurlwidth: "1800", inprop: "url", format: "json", formatversion: "2",
    })) url.searchParams.set(key, value);
    plans.push({ provider: "wikimedia", run: () => fetchJson(url, { signal }).then((value) => normalizeWikimedia(value, input.query)) });
  }
  if (config.openverse !== false) {
    const url = new URL("https://api.openverse.org/v1/images/");
    url.searchParams.set("q", input.query);
    url.searchParams.set("page_size", String(perProvider));
    url.searchParams.set("license_type", "commercial");
    url.searchParams.set("mature", "false");
    plans.push({ provider: "openverse", run: () => fetchJson(url, { signal }).then((value) => normalizeOpenverse(value, input.query)) });
  }
  if (config.pexels !== false && credentials.pexels !== undefined) {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", input.query);
    url.searchParams.set("per_page", String(perProvider));
    url.searchParams.set("orientation", input.orientation);
    plans.push({ provider: "pexels", run: () => fetchJson(url, { signal, headers: { Authorization: credentials.pexels } }).then((value) => normalizePexels(value, input.query)) });
  }
  if (config.pixabay !== false && credentials.pixabay !== undefined) {
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", credentials.pixabay);
    url.searchParams.set("q", input.query);
    url.searchParams.set("image_type", "photo");
    url.searchParams.set("orientation", input.orientation === "square" ? "all" : input.orientation === "portrait" ? "vertical" : "horizontal");
    url.searchParams.set("safesearch", "true");
    url.searchParams.set("per_page", String(perProvider));
    plans.push({ provider: "pixabay", run: () => fetchJson(url, { signal }).then((value) => normalizePixabay(value, input.query)) });
  }
  return plans;
}

function configuredRef(config, field, fallback) {
  const value = config?.[field];
  return typeof value === "string" && /^[A-Z_][A-Z0-9_]*$/.test(value) ? value : fallback;
}

export function createVisualService({ getConfig, resolveCredential, fetchJson = defaultFetchJson } = {}) {
  if (typeof getConfig !== "function") throw new TypeError("getConfig must be a function");
  if (typeof resolveCredential !== "function") throw new TypeError("resolveCredential must be a function");

  async function state() {
    const config = getConfig() ?? {};
    const pexelsRef = configuredRef(config, "pexelsApiKeyEnv", "PEXELS_API_KEY");
    const pixabayRef = configuredRef(config, "pixabayApiKeyEnv", "PIXABAY_API_KEY");
    const [pexels, pixabay] = await Promise.all([
      config.pexels === false ? undefined : resolveCredential(pexelsRef),
      config.pixabay === false ? undefined : resolveCredential(pixabayRef),
    ]);
    return {
      config,
      credentials: {
        pexels: typeof pexels === "string" && pexels.length > 0 ? pexels : undefined,
        pixabay: typeof pixabay === "string" && pixabay.length > 0 ? pixabay : undefined,
      },
      refs: { pexels: pexelsRef, pixabay: pixabayRef },
    };
  }

  return Object.freeze({
    async capabilities() {
      const current = await state();
      return Object.freeze({
        wikimedia: Object.freeze({ enabled: current.config.wikimedia !== false, configured: true, requiresKey: false }),
        openverse: Object.freeze({ enabled: current.config.openverse !== false, configured: true, requiresKey: false }),
        pexels: Object.freeze({ enabled: current.config.pexels !== false, configured: current.credentials.pexels !== undefined, requiresKey: true, credentialRef: current.refs.pexels }),
        pixabay: Object.freeze({ enabled: current.config.pixabay !== false, configured: current.credentials.pixabay !== undefined, requiresKey: true, credentialRef: current.refs.pixabay }),
      });
    },
    async search(request, signal) {
      const input = validateSearch(request);
      const current = await state();
      const plans = providerPlans(input, current.config, current.credentials, fetchJson, signal);
      const settled = await Promise.all(plans.map(async (plan) => {
        try {
          return { provider: plan.provider, candidates: await plan.run(), failed: false };
        } catch {
          return { provider: plan.provider, candidates: [], failed: true };
        }
      }));
      const seen = new Set(input.excludeUrls);
      const candidates = settled.flatMap((item) => item.candidates)
        .sort((left, right) => right.score - left.score || left.provider.localeCompare(right.provider))
        .filter((item) => {
          if (seen.has(item.imageUrl)) return false;
          seen.add(item.imageUrl);
          return true;
        })
        .slice(0, input.limit);
      return Object.freeze({
        candidates: Object.freeze(candidates),
        providers: Object.freeze(plans.map(({ provider }) => provider)),
        failedProviders: Object.freeze(settled.filter(({ failed }) => failed).map(({ provider }) => provider)),
      });
    },
  });
}
