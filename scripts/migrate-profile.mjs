import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const profileDirectory = process.argv[2];
if (typeof profileDirectory !== "string" || profileDirectory.length === 0) {
  throw new Error("usage: node migrate-profile.mjs <profile-directory>");
}

const patchPath = join(profileDirectory, "cordis.patch.yml");
let source;
try {
  source = await readFile(patchPath, "utf8");
} catch (error) {
  if (error?.code === "ENOENT") process.exit(0);
  throw error;
}

const legacyBlock = /(?:^|\n)- insert:\n {4}- id: llm-codex-chatgpt\n {6}name: ['"]?dsh-llm-codex-chatgpt-local['"]?\n?/u;
if (!legacyBlock.test(source)) process.exit(0);

const timestamp = new Date().toISOString().replace(/[:.]/gu, "-");
const backupPath = `${patchPath}.vibeify-backup-${timestamp}`;
await copyFile(patchPath, backupPath);
const updated = source.replace(legacyBlock, (match) => match.startsWith("\n") ? "\n" : "");
await writeFile(patchPath, updated.endsWith("\n") ? updated : `${updated}\n`, "utf8");
process.stdout.write(`Removed the legacy Vibeify loader row. Backup: ${backupPath}\n`);
