import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";
import { vibeifyArtworkPlugin } from "./artwork-plugin.mjs";

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const result = await build({
  entryPoints: [join(pluginRoot, "client-src", "experience", "index.js")],
  bundle: true,
  write: false,
  format: "cjs",
  platform: "browser",
  target: ["es2022"],
  external: ["react"],
  jsx: "transform",
  legalComments: "none",
  plugins: [vibeifyArtworkPlugin(pluginRoot)],
});

const template = await readFile(join(pluginRoot, "client-src", "legacy-client.template.js"), "utf8");
const reactRequire = '\t\tconst React = require("react");';
if (!template.includes(reactRequire)) throw new Error("legacy client template has no React require insertion point");
const experienceModule = `
\t\tconst __DshVibeifyExperience = (() => {
\t\t\tconst module = { exports: {} };
\t\t\tconst exports = module.exports;
${result.outputFiles[0].text.trim().split("\n").map((line) => line.length === 0 ? "" : `\t\t\t${line}`).join("\n")}
\t\t\treturn module.exports;
\t\t})();`;
const sharedTemplate = template.replace(reactRequire, `${reactRequire}${experienceModule}`);
const bundles = Object.freeze([
  Object.freeze({
    outputPath: join(pluginRoot, "client.js"),
    source: `${sharedTemplate.replace("__DSH_VIBEIFY_CODEX_FEATURES__", "true").trim()}\n`,
  }),
  Object.freeze({
    outputPath: join(pluginRoot, "..", "dsh-vibeify-experience", "client.js"),
    source: `${sharedTemplate
      .replace('id: "dsh-vibeify"', 'id: "dsh-vibeify-experience"')
      .replace("__DSH_VIBEIFY_CODEX_FEATURES__", "false")
      .trim()}\n`,
  }),
]);
const sharedServerModules = Object.freeze([
  Object.freeze({
    outputPath: join(pluginRoot, "..", "dsh-vibeify-experience", "update-check.js"),
    source: await readFile(join(pluginRoot, "update-check.js"), "utf8"),
  }),
]);

if (process.argv.includes("--check")) {
  for (const { outputPath, source } of [...bundles, ...sharedServerModules]) {
    let current = "";
    try {
      current = await readFile(outputPath, "utf8");
    } catch {
      // A missing bundle is reported as stale below.
    }
    if (current !== source) {
      console.error(`${outputPath} is stale; run npm run build:client`);
      process.exitCode = 1;
    }
  }
} else {
  for (const { outputPath, source } of [...bundles, ...sharedServerModules]) {
    await writeFile(outputPath, source);
    console.log(`built ${outputPath}`);
  }
}
