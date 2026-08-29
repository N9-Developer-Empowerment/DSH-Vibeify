#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const repositoryRoot = path.resolve(process.argv[2] || path.join(import.meta.dirname, ".."));
const failures = [];

async function checkFile(relativePath) {
  try {
    await access(path.join(repositoryRoot, relativePath));
    console.log(`OK   ${relativePath}`);
  } catch {
    failures.push(`${relativePath} is missing`);
    console.log(`FAIL ${relativePath}`);
  }
}

async function readJson(relativePath) {
  try {
    return JSON.parse(await readFile(path.join(repositoryRoot, relativePath), "utf8"));
  } catch (error) {
    failures.push(`${relativePath} is not valid JSON: ${error.message}`);
    console.log(`FAIL ${relativePath} JSON`);
    return null;
  }
}

function checkJavaScript(relativePath) {
  const result = spawnSync(process.execPath, ["--check", path.join(repositoryRoot, relativePath)], {
    encoding: "utf8",
    timeout: 15_000,
  });
  if (result.status === 0) {
    console.log(`OK   ${relativePath} syntax`);
    return;
  }
  failures.push(`${relativePath} has invalid JavaScript syntax`);
  console.log(`FAIL ${relativePath} syntax`);
}

const requiredFiles = [
  "README.md",
  "docs/FAQ.md",
  "plugins/dsh-vibeify/package.json",
  "plugins/dsh-vibeify/client.js",
  "plugins/dsh-vibeify/index.js",
  "plugins/dsh-vibeify-experience/package.json",
  "plugins/dsh-vibeify-experience/client.js",
  "scripts/Install DSH Vibeify.command",
  "scripts/Install DSH Vibeify.ps1",
  "scripts/install-dsh-vibeify-linux.sh",
  "scripts/install-dsh.sh",
  "scripts/install-vibeify.sh",
  "scripts/validate-package-archive.mjs",
];

for (const relativePath of requiredFiles) await checkFile(relativePath);

const governedPackage = await readJson("plugins/dsh-vibeify/package.json");
const neutralPackage = await readJson("plugins/dsh-vibeify-experience/package.json");
if (governedPackage && neutralPackage) {
  if (governedPackage.version === neutralPackage.version) {
    console.log(`OK   package versions agree at ${governedPackage.version}`);
  } else {
    failures.push("the governed and provider-neutral package versions differ");
    console.log("FAIL package versions differ");
  }
  if (governedPackage.dsh?.bundle?.patch && neutralPackage.dsh?.bundle?.patch) {
    console.log("OK   both DSH bundle manifests are declared");
  } else {
    failures.push("one or both DSH bundle manifests are absent");
    console.log("FAIL DSH bundle manifest");
  }
}

for (const relativePath of [
  "plugins/dsh-vibeify/index.js",
  "plugins/dsh-vibeify/client.js",
  "plugins/dsh-vibeify-experience/index.js",
  "plugins/dsh-vibeify-experience/client.js",
  "scripts/validate-package-archive.mjs",
]) {
  checkJavaScript(relativePath);
}

if (failures.length > 0) {
  console.error(`\nInstaller source check failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nInstaller source check passed. Nothing was installed and no model was called.");
