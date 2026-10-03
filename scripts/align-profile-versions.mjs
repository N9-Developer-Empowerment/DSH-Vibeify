import { copyFile, readFile, rename, realpath, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const packagePath = process.argv[2];
const runtimeAnchor = process.argv[3];
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
const qualified = JSON.parse(await readFile(new URL("../plugins/dsh-vibeify/package.json", import.meta.url), "utf8")).peerDependencies["@deepseek-ai/dsh-agent"];
const previous = new Set(["0.1.5-rc.3", "0.1.7-rc.2"]);

let changes = 0;
// A profile that only owns selected peer packages mixes its scope registry with
// CLI fallback bundles. Equal versions still have different Symbols/WeakMaps.
// Install the declared core bundles into the same dependency graph as plugins.
const bundles = profile.dsh?.profile?.bundles;
if (Array.isArray(bundles) && bundles.includes("@deepseek-ai/dsh-web-app")) {
  profile.dependencies ??= {};
  profile.pnpm ??= {};
  profile.pnpm.overrides ??= {};
  for (const name of ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"]) {
    const version = profile.dependencies[name];
    if (version === undefined || previous.has(version)) {
      profile.dependencies[name] = qualified;
      changes += 1;
    }
  }
  for (const [name, version] of [["@deepseek-ai/cordis", "4.0.4"], ["@deepseek-ai/schemastery", "3.18.4"]]) {
    if (profile.pnpm.overrides[name] === undefined) {
      profile.pnpm.overrides[name] = version;
      changes += 1;
    }
  }
  if (runtimeAnchor) {
    const runtime = JSON.parse(await readFile(runtimeAnchor, "utf8"));
    if (runtime.name !== "@deepseek-ai/dsh" || runtime.version !== qualified) {
      throw new Error("Profile alignment requires the qualified DSH installation.");
    }
    const require = createRequire(runtimeAnchor);
    // DSH 0.2 bootstrap owns a private WeakMap used by settings/profile reload.
    // The launcher and profile consumers must resolve the same physical module.
    const bootPath = await realpath(require.resolve("@deepseek-ai/dsh-app-boot/package.json"));
    const bootLink = `link:${dirname(bootPath).replaceAll("\\", "/")}`;
    if (profile.pnpm.overrides["@deepseek-ai/dsh-app-boot"] !== bootLink) {
      profile.pnpm.overrides["@deepseek-ai/dsh-app-boot"] = bootLink;
      changes += 1;
    }
    if (profile.dependencies["@deepseek-ai/dsh-agent-preset-registry"] !== qualified) {
      profile.dependencies["@deepseek-ai/dsh-agent-preset-registry"] = qualified;
      changes += 1;
    }
    // Use the upstream manifests as the single list of loader-visible runtime
    // entries. With pnpm, transitive dependencies alone are not root entries:
    // an absent entry falls back to the CLI copy even when bundles are local.
    for (const bundle of ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"]) {
      const manifest = JSON.parse(await readFile(require.resolve(`${bundle}/package.json`), "utf8"));
      for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.peerDependencies })) {
        if (!name.startsWith("@deepseek-ai/dsh-") || version !== qualified) continue;
        const existing = profile.dependencies[name];
        if (existing !== undefined && !previous.has(existing) && existing !== version) {
          throw new Error(`Cannot align an independently configured runtime dependency: ${name}`);
        }
        if (existing !== version) {
          profile.dependencies[name] = version;
          changes += 1;
        }
      }
    }
  }
}
for (const entries of [profile.dependencies, profile.devDependencies, profile.pnpm?.overrides]) {
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) continue;
  for (const [name, version] of Object.entries(entries)) {
    if (retired.has(name) && previous.has(version)) {
      delete entries[name];
      changes += 1;
      continue;
    }
    let replacement;
    if ((name === "@deepseek-ai/dsh" || name.startsWith("@deepseek-ai/dsh-")) && previous.has(version)) {
      replacement = qualified;
    } else if (name === "@deepseek-ai/cordis" && version === "4.0.2") {
      replacement = "4.0.4";
    } else if (name === "@deepseek-ai/schemastery" && version === "3.18.2") {
      replacement = "3.18.4";
    }
    if (replacement) {
      entries[name] = replacement;
      changes += 1;
    }
  }
}
if (changes) {
  const backupPath = `${packagePath}.vibeify-pre-dsh-${qualified}-backup`;
  const temporaryPath = join(dirname(packagePath), `.vibeify-profile-${process.pid}.tmp`);
  try { await copyFile(packagePath, backupPath, 1); } catch (error) { if (error?.code !== "EEXIST") throw error; }
  try {
    await writeFile(temporaryPath, `${JSON.stringify(profile, null, 2)}\n`, { mode: 0o600 });
    await rename(temporaryPath, packagePath);
  } catch (error) {
    await import("node:fs/promises").then(({ rm }) => rm(temporaryPath, { force: true }));
    throw error;
  }
}
process.stdout.write(`Aligned ${changes} legacy DSH profile version pins.\n`);
