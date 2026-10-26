import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { apply, inject, ROUTING_POLICY } from "./index.js";

const fixture = new URL("./test-fixtures/standard-0.2.1-rc.2.patch.yml", import.meta.url);
let anchor = process.env.DSH_RUNTIME_ANCHOR;
if (!anchor) {
  try { anchor = `${execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim()}/@deepseek-ai/dsh/package.json`; }
  catch { /* The recorded upstream fixture keeps source checks portable. */ }
}
let runtimeRequire;
try {
  if (anchor) {
    const candidate = createRequire(anchor);
    const runtime = candidate(anchor);
    if (runtime.name === "@deepseek-ai/dsh" && runtime.version === "0.2.1-rc.2") runtimeRequire = candidate;
  }
} catch { /* Runtime is not installed or is a different version. */ }

test("preset preserves the qualified upstream standard and adds only the routing policy and Codex worker", async () => {
  const original = await readFile(fixture, "utf8");
  if (runtimeRequire) {
    const upstreamPath = runtimeRequire.resolve("@deepseek-ai/dsh-web-app/package.json");
    const upstream = await readFile(join(dirname(upstreamPath), "presets", "standard.patch.yml"), "utf8");
    assert.equal(upstream, original, "recorded fixture matches installed qualified upstream preset");
  }
  const patch = await readFile(new URL("./cordis.patch.yml", import.meta.url), "utf8");
  const prefix = `# Optional native DeepSeek-led mode; applied after the upstream host patches.
- id: agent-default-model
  config:
    provider: deepseek-official
    model: deepseek-flash
- id: subagent-codex
  config:
    providerName: codex
    model: gpt-6.1-sol
    permissionMode: approve-for-me
- id: agent-preset-registry
  config:
    default: vibeify-deepseek

`;
  const expected = original.replace("id: preset-standard", "id: preset-vibeify-deepseek")
    .replace("id: standard\n        order: 1", "id: vibeify-deepseek\n        order: 0")
    .replace("          - id: agent-instructions\n", "          - id: vibeify-deepseek-policy\n            name: dsh-vibeify-deepseek\n          - id: agent-instructions\n")
    .replace("              - id: workflow-ptc\n", "              - id: tool-subagent-codex\n                name: '@deepseek-ai/dsh-tool-subagent'\n                config:\n                  provider: codex\n                  toolName: subagent_codex\n                  backgroundMode: one-shot\n                  maxDepth: provider-managed\n              - id: workflow-ptc\n");
  assert.equal(patch, prefix + expected);
});

test("qualified runtime has fixed known section orders", async (t) => {
  if (!runtimeRequire) return t.skip("qualified DSH runtime not installed; recorded upstream fixture used");
  const { SystemPrompt } = await import(runtimeRequire.resolve("@deepseek-ai/dsh-system-prompt"));
  const order = SystemPrompt.prototype.getSectionOrder;
  assert.equal(order.call({}, "VIBEIFY_DEEPSEEK_ROUTING"), undefined);
  assert.equal(order.call({}, "TEAM_POLICY"), 600);
  assert.equal(order.call({}, "PTC_ONLY"), 800);
});

test("prompt section is scoped to the active agent and registers disposal with ctx.effect", () => {
  assert.deepEqual(inject, ["systemPrompt"]);
  const disposal = () => {};
  let section;
  let cleanup;
  apply({
    effect(fn) { cleanup = fn(); },
    systemPrompt: {
      getSectionOrder(name) { return ({ TEAM_POLICY: 600, PTC_ONLY: 800 })[name]; },
      section(value) { assert.ok(Number.isFinite(value.order), "section requires a finite order"); section = value; return disposal; },
    },
  });
  assert.equal(cleanup, disposal);
  assert.equal(section.order, 700);
  assert.equal(section.text, ROUTING_POLICY);
  for (const phrase of ["DeepSeek leads", "at most two", "text-only", "independently verify", "must not spawn", "protected external writes", "explicit permission"]) assert.ok(section.text.includes(phrase), phrase);
});

test("published package contains the runtime files and exact prompt peer", async () => {
  const manifest = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"));
  assert.equal(manifest.peerDependencies["@deepseek-ai/dsh-system-prompt"], "0.2.1-rc.2");
  const [info] = JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: new URL(".", import.meta.url), encoding: "utf8" }));
  assert.deepEqual(info.files.map((entry) => entry.path).sort(), ["cordis.patch.yml", "index.js", "package.json"]);
});
