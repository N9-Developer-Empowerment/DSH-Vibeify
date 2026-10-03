import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("Windows and Linux resolve their qualified DSH version from one package manifest", async () => {
  const windows = await read("scripts/Install DSH Vibeify.ps1");
  const linux = await read("scripts/install-dsh-vibeify-linux.sh");
  const dshInstaller = await read("scripts/install-dsh.sh");
  const manifest = JSON.parse(await read("plugins/dsh-vibeify/package.json"));
  const qualifiedVersion = manifest.peerDependencies["@deepseek-ai/dsh-agent"];

  assert.match(windows, /peerDependencies\['@deepseek-ai\/dsh-agent'\]/);
  assert.doesNotMatch(windows, /\$TargetVersion\s*=\s*["'][0-9]/);
  assert.match(linux, /install-dsh\.sh" --replace/);
  assert.match(dshInstaller, /peerDependencies\[['"]@deepseek-ai\/dsh-agent['"]\]/);
  assert.match(dshInstaller, /require\(process\.argv\[1\]\)/);
  assert.doesNotMatch(dshInstaller, /tested_version\s*=\s*["'][0-9]/);
  assert.match(qualifiedVersion, /^\d+\.\d+\.\d+/);
});

test("Windows source override matches the Mac environment contract and skips network download", async () => {
  const windows = await read("scripts/Install DSH Vibeify.ps1");
  const mac = await read("scripts/Install DSH Vibeify.command");
  const parameter = windows.indexOf("[string]$SourceDirectory = $env:DSH_VIBEIFY_SOURCE_DIRECTORY");
  const sourceBranch = windows.indexOf("if ($SourceDirectory)");
  const sourceResolve = windows.indexOf("Resolve-Path -LiteralPath $SourceDirectory", sourceBranch);
  const download = windows.indexOf("Invoke-WebRequest", sourceBranch);

  assert.ok(parameter >= 0 && sourceBranch > parameter);
  assert.ok(sourceResolve > sourceBranch && download > sourceResolve);
  assert.match(windows, /installer-self-check\.mjs/);
  assert.match(mac, /DSH_VIBEIFY_SOURCE_DIRECTORY/);
});

test("Windows and Linux keep the existing interactive provider mode by default", async () => {
  const windows = await read("scripts/Install DSH Vibeify.ps1");
  const linux = await read("scripts/install-dsh-vibeify-linux.sh");

  assert.match(windows, /dependencies\.PSObject\.Properties\.Name -contains "dsh-vibeify"/);
  assert.match(windows, /Choice \[\$defaultChoice\]/);
  assert.match(linux, /dependencies\?\.\["dsh-vibeify"\]/);
  assert.match(linux, /Choice \[\$default_choice\]/);
});


test("Windows qualifies pnpm in the user npm prefix before DSH plugin mutations", async () => {
  const windows = await read("scripts/Install DSH Vibeify.ps1");
  const liveGuard = windows.indexOf("if (Test-LocalDsh)");
  const pnpmPin = windows.indexOf('$QualifiedPnpmVersion = "10.34.6"');
  const prefixGuard = windows.indexOf("StartsWith($UserProfilePath");
  const pathPrepend = windows.indexOf('$env:PATH = "$GlobalNpmPrefix;$env:PATH"');
  const firstPluginMutation = windows.indexOf("Install-ImmutableDshPlugin $ProjectDirectory");
  const profileInstall = windows.indexOf("& dsh plugin --profile $ProfileName install");

  assert.ok(liveGuard >= 0 && pnpmPin > liveGuard);
  assert.ok(prefixGuard > pnpmPin && pathPrepend > prefixGuard);
  assert.ok(firstPluginMutation > pathPrepend && profileInstall > pathPrepend);
  assert.match(windows, /npm install --global "pnpm@\$QualifiedPnpmVersion"/);
  assert.match(windows, /InstalledPnpmVersion -ne \$QualifiedPnpmVersion/);
  assert.doesNotMatch(windows, /approve-builds|--allow-builds|ignore-scripts=false/i);
});
