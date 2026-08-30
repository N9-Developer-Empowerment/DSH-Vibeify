#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createRadarEdition,
  parseGoogleTrendsRss,
  parseHackerNewsStories,
  parseWikimediaTop,
  validateRadarEdition,
} from "../radar/radar-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputArgument = process.argv.find((value) => value.startsWith("--output="))?.slice("--output=".length);
const outputPath = resolve(root, outputArgument ?? "dist/radar/latest.json");
const previousPath = resolve(root, process.argv.find((value) => value.startsWith("--previous="))?.slice("--previous=".length) ?? "radar/bootstrap.json");
const sources = JSON.parse(await readFile(join(root, "radar", "sources.json"), "utf8"));
const now = new Date();
const headers = { "user-agent": "DSH-Vibeify/0.15.4 (+https://github.com/N9-Developer-Empowerment/DSH-Vibeify)" };

async function fetchText(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

const signals = [];
const sourceStatus = [];
for (const source of sources.googleTrends) {
  try {
    const parsed = parseGoogleTrendsRss(await fetchText(source.url), source, now);
    signals.push(...parsed);
    sourceStatus.push({ id: source.id, label: source.label, state: "ok", count: parsed.length });
  } catch (error) {
    console.warn(`${source.label} unavailable: ${error.message}`);
    sourceStatus.push({ id: source.id, label: source.label, state: "unavailable", count: 0 });
  }
}

try {
  const ids = (await fetchJson(sources.hackerNews.top)).slice(0, 30);
  const stories = (await Promise.all(ids.map(async (id) => {
    try { return await fetchJson(sources.hackerNews.item.replace("{id}", String(id))); } catch { return null; }
  }))).filter(Boolean);
  const parsed = parseHackerNewsStories(stories, now);
  signals.push(...parsed);
  sourceStatus.push({ id: sources.hackerNews.id, label: sources.hackerNews.label, state: "ok", count: parsed.length });
} catch (error) {
  console.warn(`${sources.hackerNews.label} unavailable: ${error.message}`);
  sourceStatus.push({ id: sources.hackerNews.id, label: sources.hackerNews.label, state: "unavailable", count: 0 });
}

try {
  const date = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const values = {
    yyyy: String(date.getUTCFullYear()),
    mm: String(date.getUTCMonth() + 1).padStart(2, "0"),
    dd: String(date.getUTCDate()).padStart(2, "0"),
  };
  const url = sources.wikimedia.url.replace("{yyyy}", values.yyyy).replace("{mm}", values.mm).replace("{dd}", values.dd);
  const parsed = parseWikimediaTop(await fetchJson(url), now);
  signals.push(...parsed);
  sourceStatus.push({ id: sources.wikimedia.id, label: sources.wikimedia.label, state: "ok", count: parsed.length });
} catch (error) {
  console.warn(`${sources.wikimedia.label} unavailable: ${error.message}`);
  sourceStatus.push({ id: sources.wikimedia.id, label: sources.wikimedia.label, state: "unavailable", count: 0 });
}

let edition = createRadarEdition({ signals, sources: sourceStatus, now });
if (edition.signals.length < 12) {
  try {
    const previous = validateRadarEdition(JSON.parse(await readFile(previousPath, "utf8")), now);
    if (previous !== null) {
      edition = previous;
      console.warn("Live collection was too small; retained the last valid radar edition.");
    }
  } catch {
    // The explicit minimum check below reports the actionable failure.
  }
}
if (edition.signals.length < 12) throw new Error(`Refusing to publish a radar with only ${edition.signals.length} valid signals.`);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(edition, null, 2)}\n`);
console.log(`Published ${edition.signals.length} radar signals to ${outputPath}`);
