#!/usr/bin/env node

import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(import.meta.url);

export function relativeModuleSpecifiers(source) {
  const specifiers = new Set();
  const patterns = [
    /(?:import|export)\s+(?:[^'";]*?\s+from\s*)?["'](\.[^"']+)["']/g,
    /import\s*\(\s*["'](\.[^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers];
}

function candidateTargets(importer, specifier) {
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  if (target.startsWith("../") || target === "..") return [];
  if (path.posix.extname(target)) return [target];
  return [target, `${target}.js`, path.posix.join(target, "index.js")];
}

export function missingRelativeModules(files) {
  const names = new Set(files.keys());
  const missing = [];
  for (const [filename, source] of files) {
    if (!filename.endsWith(".js") && !filename.endsWith(".mjs")) continue;
    for (const specifier of relativeModuleSpecifiers(source)) {
      const candidates = candidateTargets(filename, specifier);
      if (candidates.length === 0 || !candidates.some((candidate) => names.has(candidate))) {
        missing.push({ filename, specifier });
      }
    }
  }
  return missing;
}

async function archiveFiles(archive) {
  const { stdout } = await execFileAsync("tar", ["-tzf", archive], { maxBuffer: 20 * 1024 * 1024 });
  return stdout.split("\n")
    .filter((entry) => entry.startsWith("package/") && !entry.endsWith("/"))
    .map((entry) => entry.slice("package/".length));
}

async function archiveText(archive, filename) {
  const { stdout } = await execFileAsync("tar", ["-xOzf", archive, `package/${filename}`], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return stdout;
}

async function validateArchive(archive) {
  const filenames = await archiveFiles(archive);
  const filenameSet = new Set(filenames);
  if (!filenameSet.has("package.json")) throw new Error("Package archive does not contain package.json.");
  const packageJson = JSON.parse(await archiveText(archive, "package.json"));
  const declaredEntries = [
    packageJson.main,
    packageJson.dsh?.bundle?.patch,
    packageJson.dsh?.client ? packageJson.exports?.["./client"] : null,
  ]
    .filter(Boolean)
    .map((entry) => String(entry).replace(/^\.\//, ""));
  for (const entry of declaredEntries) {
    if (!filenameSet.has(entry)) throw new Error(`Package archive is missing declared entry ${entry}.`);
  }
  const sourceFiles = new Map();
  for (const filename of filenames.filter((name) => name.endsWith(".js") || name.endsWith(".mjs"))) {
    sourceFiles.set(filename, await archiveText(archive, filename));
  }
  const missing = missingRelativeModules(sourceFiles);
  if (missing.length > 0) {
    const detail = missing.map(({ filename, specifier }) => `${filename} -> ${specifier}`).join(", ");
    throw new Error(`Package archive has missing relative module imports: ${detail}`);
  }
  process.stdout.write(`Validated immutable Vibeify package: ${filenames.length} files, ${sourceFiles.size} JavaScript modules.\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const archive = process.argv[2];
  if (!archive) {
    process.stderr.write("Usage: validate-package-archive.mjs <archive.tgz>\n");
    process.exitCode = 2;
  } else {
    validateArchive(path.resolve(archive)).catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
  }
}
