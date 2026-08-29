#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const downloadUrl = "https://dsh-vibeify.ezzye.chatgpt.site/DSH-Vibeify-Installer-macOS.zip";
const directory = await mkdtemp(path.join(os.tmpdir(), "dsh-vibeify-public-installer-"));
const archive = path.join(directory, "installer.zip");
const extracted = path.join(directory, "extracted");

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 30_000 });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

try {
  const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`download returned HTTP ${response.status}`);
  if (!`${response.headers.get("content-type")}`.includes("application/zip")) {
    throw new Error(`expected application/zip, received ${response.headers.get("content-type")}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(archive, bytes);
  run("unzip", ["-t", archive]);
  run("unzip", ["-q", archive, "-d", extracted]);
  const installer = path.join(extracted, "Install DSH Vibeify.command");
  const source = await readFile(installer);
  run("bash", ["-n", installer]);
  if (!source.includes(Buffer.from("github.com/N9-Developer-Empowerment/DSH-Vibeify"))) {
    throw new Error("the installer does not use the expected public GitHub source");
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  console.log(`OK   public macOS installer HTTP ${response.status}`);
  console.log(`OK   ZIP integrity and installer shell syntax`);
  console.log(`OK   expected public GitHub source`);
  console.log(`INFO bytes=${bytes.length} sha256=${hash}`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
