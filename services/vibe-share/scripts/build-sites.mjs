import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = resolve(project, "dist/server");

await rm(resolve(project, "dist"), { force: true, recursive: true });
await mkdir(server, { recursive: true });

let worker = await readFile(resolve(project, "src/worker.mjs"), "utf8");
worker = worker.replace(
  'from "../../../shared/vibe-share-contract.js"',
  'from "./vibe-share-contract.js"',
);
let render = await readFile(resolve(project, "src/render.mjs"), "utf8");
render = render.replace(
  'from "../../../shared/vibe-markdown.js"',
  'from "./vibe-markdown.js"',
);
let appSource = await readFile(resolve(project, "src/app-source.mjs"), "utf8");
appSource = appSource.replace(
  'from "../../../shared/vibe-markdown.js"',
  'from "./vibe-markdown.js"',
);

await Promise.all([
  writeFile(resolve(server, "index.js"), worker),
  writeFile(resolve(server, "render.mjs"), render),
  writeFile(resolve(server, "app-source.mjs"), appSource),
  copyFile(resolve(project, "../../shared/vibe-share-contract.js"), resolve(server, "vibe-share-contract.js")),
  copyFile(resolve(project, "../../shared/vibe-markdown.js"), resolve(server, "vibe-markdown.js")),
]);
