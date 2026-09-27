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
worker = worker.replace('from "../../../shared/editorial-illustrations.js"', 'from "./editorial-illustrations.js"');
let render = await readFile(resolve(project, "src/render.mjs"), "utf8");
render = render.replace(
  'from "../../../shared/vibe-markdown.js"',
  'from "./vibe-markdown.js"',
);
render = render.replace('from "../../../shared/vibe-interactive.js"', 'from "./vibe-interactive.js"');
let appSource = await readFile(resolve(project, "src/app-source.mjs"), "utf8");
appSource = appSource.replace(
  'from "../../../shared/vibe-markdown.js"',
  'from "./vibe-markdown.js"',
);
appSource = appSource.replace('from "../../../shared/editorial-illustrations.js"', 'from "./editorial-illustrations.js"');
appSource = appSource.replace(
  'from "../../../shared/vibe-cover.js"',
  'from "./vibe-cover.js"',
);

appSource = appSource.replace('from "../../../shared/vibe-interactive.js"', 'from "./vibe-interactive.js"');

await Promise.all([
  copyFile(resolve(project, "../../shared/mochi-meadow.js"), resolve(server, "mochi-meadow.js")),
  copyFile(resolve(project, "../../shared/vibe-interactive.js"), resolve(server, "vibe-interactive.js")),
  writeFile(resolve(server, "index.js"), worker),
  writeFile(resolve(server, "render.mjs"), render),
  writeFile(resolve(server, "app-source.mjs"), appSource),
  copyFile(resolve(project, "../../shared/vibe-share-contract.js"), resolve(server, "vibe-share-contract.js")),
  copyFile(resolve(project, "../../shared/vibe-markdown.js"), resolve(server, "vibe-markdown.js")),
  copyFile(resolve(project, "../../shared/vibe-cover.js"), resolve(server, "vibe-cover.js")),
  copyFile(resolve(project, "../../shared/editorial-illustrations.js"), resolve(server, "editorial-illustrations.js")),
]);
