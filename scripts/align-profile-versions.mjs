import { copyFile, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const packagePath = process.argv[2];
if (!packagePath) throw new Error("usage: node align-profile-versions.mjs <profile-package.json>");

let source;
try {
  source = await readFile(packagePath, "utf8");
} catch (error) {
  if (error?.code === "ENOENT") process.exit(0);
  throw error;
}
const profile = JSON.parse(source);
// These packages were retired or split after 0.1.5; keeping their old pins
// forces an incompatible legacy runtime into the current bundle.
const retired = new Set([
  "@deepseek-ai/dsh-code-runtime",
  "@deepseek-ai/dsh-code-runtime-worker-thread",
  "@deepseek-ai/dsh-agent-presets",
  "@deepseek-ai/dsh-settings-file",
  "@deepseek-ai/dsh-workflow-worker-thread",
]);
let changes = 0;
for (const entries of [profile.dependencies, profile.devDependencies, profile.pnpm?.overrides]) {
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) continue;
  for (const [name, version] of Object.entries(entries)) {
    if (retired.has(name) && version === "0.1.5-rc.3") {
      delete entries[name];
      changes += 1;
      continue;
    }
    let qualified;
    if ((name === "@deepseek-ai/dsh" || name.startsWith("@deepseek-ai/dsh-")) && version === "0.1.5-rc.3") {
      qualified = "0.1.7-rc.2";
    } else if (name === "@deepseek-ai/cordis" && version === "4.0.2") {
      qualified = "4.0.4";
    } else if (name === "@deepseek-ai/schemastery" && version === "3.18.2") {
      qualified = "3.18.4";
    }
    if (qualified) {
      entries[name] = qualified;
      changes += 1;
    }
  }
}
if (changes) {
  const backupPath = `${packagePath}.vibeify-pre-dsh-0.1.7-backup`;
  const temporaryPath = join(dirname(packagePath), `.vibeify-profile-${process.pid}.tmp`);
  await copyFile(packagePath, backupPath);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(profile, null, 2)}\n`, { mode: 0o600 });
    await rename(temporaryPath, packagePath);
  } catch (error) {
    await import("node:fs/promises").then(({ rm }) => rm(temporaryPath, { force: true }));
    throw error;
  }
}
process.stdout.write(`Aligned ${changes} legacy DSH profile version pins.\n`);
