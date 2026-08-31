import test from "node:test";
import assert from "node:assert/strict";

import {
  formatVibeMath,
  parseVibeInline,
  parseVibeMarkdown,
  vibeMarkdownRuntimeSource,
} from "../../shared/vibe-markdown.js";

const title = "The flying car will not be a car";
const markdown = [
  `# ${title}`,
  "",
  "*Advanced-air-mobility concept art: NASA.*",
  "",
  "## There are only three bargains with gravity",
  "",
  "**Float in the air.** Helium gives lift with [NASA data](https://www.nasa.gov/).",
  "",
  String.raw`\[ L=\tfrac{1}{2}\rho V^2 S C_L \]`,
].join("\n");

test("one shared Markdown AST preserves hierarchy, emphasis, links and readable maths", () => {
  const blocks = parseVibeMarkdown(markdown, title);
  assert.deepEqual(blocks.map(({ type }) => type), ["paragraph", "heading", "paragraph", "math"]);
  assert.equal(blocks[0].value, "*Advanced-air-mobility concept art: NASA.*");
  assert.deepEqual(parseVibeInline(blocks[0].value), [{ type: "emphasis", value: "Advanced-air-mobility concept art: NASA." }]);
  assert.equal(blocks[1].level, 3);
  assert.deepEqual(parseVibeInline(blocks[2].value).map(({ type }) => type), ["strong", "text", "link", "text"]);
  assert.equal(blocks[3].value, "L=1⁄2ρ V² S Cₗ");
  assert.doesNotMatch(blocks[3].value, /\\tfrac|\\rho|\\\[/);
});

test("the standalone private preview embeds the same parser used by Vibe and public rendering", () => {
  const runtime = vibeMarkdownRuntimeSource();
  assert.match(runtime, /function parseVibeMarkdown/);
  assert.match(runtime, /function parseVibeInline/);
  assert.match(runtime, /function formatVibeMath/);
});

test("math formatting keeps common Vibe equations readable without leaking TeX controls", () => {
  const output = formatVibeMath(String.raw`P_\text{ideal}=\frac{W^{3/2}}{\sqrt{2\rho A}}\approx45\text{ kW}`);
  assert.equal(output, "Pᵢdₑₐₗ=W³⁄²⁄√(2ρ A)≈45 kW");
});
