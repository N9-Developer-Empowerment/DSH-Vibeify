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

await Promise.all([
  writeFile(resolve(server, "index.js"), worker),
  copyFile(resolve(project, "src/render.mjs"), resolve(server, "render.mjs")),
  copyFile(resolve(project, "src/app-source.mjs"), resolve(server, "app-source.mjs")),
  copyFile(resolve(project, "../../shared/vibe-share-contract.js"), resolve(server, "vibe-share-contract.js")),
]);
