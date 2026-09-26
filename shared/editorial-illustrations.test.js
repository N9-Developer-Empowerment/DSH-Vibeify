import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { EDITORIAL_ILLUSTRATIONS, illustrationById, illustrationForChunk } from "./editorial-illustrations.js";

test("every topic and unfamiliar article receives a known bundled illustration", () => {
  assert.equal(EDITORIAL_ILLUSTRATIONS.length, 10);
  const cases = [
    ["A new song", "music", "doodles-dancing"],
    ["Learning to read", "article", "doodles-reading"],
    ["Supporting friends", "article", "doodles-loving"],
    ["A shared photo", "article", "doodles-selfie"],
    ["An unrelated private topic", "article", "doodles-strolling"],
  ];
  for (const [title, kind, expected] of cases) {
    const media = illustrationForChunk({ title, kind, markdown: "Private article prose must stay local." });
    assert.equal(media.illustrationId, expected);
    assert.equal(media, illustrationById(expected));
    assert.match(media.externalUrl, /^data:image\/svg\+xml;base64,/);
    assert.equal(media.kind, "illustration");
    assert.equal(media.mode, "cinema");
  }
  assert.equal(illustrationById("unknown"), null);
  assert.equal(illustrationForChunk(null).illustrationId, "doodles-strolling");
  assert.doesNotMatch(JSON.stringify(illustrationForChunk({ title: "Private phrase unique 99351" })), /Private phrase unique 99351/);
});

test("bundled SVGs match provenance and contain only inert drawing elements", () => {
  const provenance = readFileSync(new URL("./editorial-illustrations/PROVENANCE.md", import.meta.url), "utf8");
  for (const media of EDITORIAL_ILLUSTRATIONS) {
    const name = media.illustrationId.slice("doodles-".length);
    const bytes = readFileSync(new URL(`./editorial-illustrations/${name}.svg`, import.meta.url));
    const hash = createHash("sha256").update(bytes).digest("hex");
    assert.match(provenance, new RegExp(`${name}\\.svg[^\\n]*${hash}`));
    assert.equal(media.externalUrl, `data:image/svg+xml;base64,${bytes.toString("base64")}`);
    const svg = bytes.toString("utf8");
    assert.doesNotMatch(svg, /<\s*(?:script|image|foreignObject|use|iframe)|\b(?:href|src)\s*=|<!DOCTYPE|<!ENTITY|url\s*\(/i);
    assert.match(svg, /<svg\b/);
    assert.match(media.label, /Pablo Stanley/);
    assert.equal(media.href, "https://www.opendoodles.com/about");
  }
});
