import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";
import { vibeifyArtworkPlugin } from "./artwork-plugin.mjs";

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = join(pluginRoot, "..", "..", "tmp", "vibeify-preview");
await mkdir(outputRoot, { recursive: true });
await copyFile(join(pluginRoot, "preview", "index.html"), join(outputRoot, "index.html"));
await build({
  entryPoints: [join(pluginRoot, "preview", "preview.jsx")],
  bundle: true,
  outfile: join(outputRoot, "app.js"),
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  jsx: "transform",
  legalComments: "none",
  plugins: [vibeifyArtworkPlugin(pluginRoot)],
});
console.log(`preview built at ${outputRoot}`);
