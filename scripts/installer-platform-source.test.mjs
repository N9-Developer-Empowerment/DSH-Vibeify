import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const normalizeLineEndings = (source) => source.replace(/\r\n/g, "\n");
const read = async (relativePath) => normalizeLineEndings(await readFile(path.join(root, relativePath), "utf8"));

test("source checks normalize Windows CRLF line endings", () => {
  const windowsCheckout = 'if (ready) {\r\n  default_choice="3"\r\n}\r\n';
  assert.equal(normalizeLineEndings(windowsCheckout), 'if (ready) {\n  default_choice="3"\n}\n');
  const linuxCheckout = 'if p.dependencies?.["dsh-vibeify-deepseek"] ; then\r\n  default_choice="3"\r\nfi\r\n';
  assert.match(normalizeLineEndings(linuxCheckout), /\["dsh-vibeify-deepseek"\].*\n  default_choice="3"/);
});

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
  const linux = await read("scripts/install-dsh-vibeify-linux.sh");
  const liveGuard = windows.indexOf("if (-not (Confirm-IdleDshUpdate))");
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

  const linuxGuard = linux.indexOf("if local_dsh_responds; then");
  const linuxPin = linux.indexOf('qualified_pnpm_version="10.34.6"');
  const linuxPath = linux.indexOf('export PATH="$pnpm_directory/node_modules/.bin:$PATH"');
  const linuxInstall = linux.indexOf('"$project_directory/scripts/install-dsh.sh" --replace');
  assert.ok(linuxGuard >= 0 && linuxPin > linuxGuard);
  assert.ok(linuxPath > linuxPin && linuxInstall > linuxPath);
  assert.match(linux, /npm install --prefix "\$pnpm_directory" --no-save "pnpm@\$qualified_pnpm_version"/);
  assert.match(linux, /pnpm_command="\$pnpm_directory\/node_modules\/\.bin\/pnpm"/);
  assert.doesNotMatch(linux, /npm install --global "?pnpm|approve-builds|--allow-builds|ignore-scripts=false/i);
  assert.equal(linux.match(/qualified_pnpm_version="(\d+\.\d+\.\d+)"/)?.[1], /\$QualifiedPnpmVersion = "(\d+\.\d+\.\d+)"/.exec(windows)?.[1]);
});

test("Both selects DeepSeek leadership and preserves existing modes on both platforms", async () => {
  const windows = await read("scripts/Install DSH Vibeify.ps1");
  const linux = await read("scripts/install-dsh-vibeify-linux.sh");
  assert.match(windows, /Both - DeepSeek leads; ChatGPT assists/);
  assert.match(linux, /Both — DeepSeek leads; ChatGPT assists/);
  assert.match(windows, /\$Provider -eq "both"\) \{ "deepseek-codex" \} elseif \(\$Provider -eq "chatgpt"\) \{ "chatgpt" \} else \{ "deepseek" \}/);
  assert.match(linux, /"\$account_choice" == "3" \]\]; then provider_mode="deepseek-codex"; else provider_mode="chatgpt"/);
  assert.match(windows, /-contains "dsh-vibeify-deepseek"\) \{\s*\$defaultChoice = "3"/);
  assert.match(linux, /\["dsh-vibeify-deepseek"\].*\n  default_choice="3"/);
  assert.match(linux, /install-vibeify\.sh" --provider "\$provider_mode"/);
});

test("Windows restores owned defaults and installs the qualified worker before immutable routing bundle", async () => {
  const source = await read("scripts/Install DSH Vibeify.ps1");
  const restore = source.indexOf('"scripts\\configure-deepseek-lead.mjs") --restore');
  const remove = source.indexOf('remove --workspace-root "dsh-vibeify-deepseek"');
  const configure = source.indexOf('"scripts\\configure-deepseek-lead.mjs") $ProfileDirectory');
  const worker = source.indexOf('add --workspace-root "@deepseek-ai/dsh-subagent-codex@$TargetVersion"');
  const bundle = source.indexOf('Install-ImmutableDshPlugin $ProjectDirectory "dsh-vibeify-deepseek"');
  const install = source.indexOf('& dsh plugin --profile $ProfileName install', bundle);
  assert.ok(restore > 0 && remove > restore && configure > remove && worker > configure && bundle > worker && install > bundle);
  assert.match(source, /\$ProviderMode -ne "deepseek-codex"[\s\S]*?--restore/);
  assert.match(source, /\$ProviderMode -eq "deepseek-codex"[\s\S]*?Configuring DeepSeek leadership/);
  assert.match(source, /\$ProviderMode -eq "deepseek-codex"[\s\S]*?DeepSeek-led routing is not active/);
});

test("Linux choice routing executes against isolated profile fixtures", { skip: process.platform === "win32" }, async (t) => {
  const { mkdtemp, mkdir, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { spawnSync } = await import("node:child_process");
  const directory = await mkdtemp(path.join(tmpdir(), "vibeify-linux-choice-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const profileDir = path.join(directory, "profiles", "web");
  await mkdir(profileDir, { recursive: true });
  const source = await read("scripts/install-dsh-vibeify-linux.sh");
  const start = source.indexOf('default_choice="1"');
  const end = source.indexOf('say "Installing or updating DeepSeek Harness..."', start);
  assert.ok(start >= 0 && end > start);
  const fragment = source.slice(start, end);
  for (const [dependency, input, expected] of [
    ["dsh-vibeify-deepseek", "\n", "deepseek-codex"],
    ["dsh-vibeify", "\n", "chatgpt"],
    [null, "\n", "deepseek"],
    [null, "3\n", "deepseek-codex"],
    [null, "2\n", "chatgpt"],
    [null, "1\n", "deepseek"],
  ]) {
    await writeFile(path.join(profileDir, "package.json"), JSON.stringify({ dependencies: dependency ? { [dependency]: "test" } : {} }));
    const script = `set -e\nprofile=web\nsay() { :; }\nfail() { exit 1; }\ncodex() { echo 'Logged in using ChatGPT'; }\n${fragment}\nprintf '%s' "$provider_mode"`;
    const result = spawnSync("bash", ["-c", script], { input, encoding: "utf8", env: { ...process.env, DSH_HOME: directory } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, expected, `dependency=${dependency}, choice=${JSON.stringify(input)}`);
  }
});
