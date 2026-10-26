import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const source = await readFile(join(root, "scripts/install-vibeify.sh"), "utf8");
const start = source.indexOf('install_immutable_plugin "$plugin_name"');
const end = source.indexOf('node "$script_directory/align-profile-versions.mjs"', start);
assert.ok(start >= 0 && end > start);
const fragment = source.slice(start, end);
const runtimeAnchor = process.env.DSH_RUNTIME_ANCHOR || join(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim(), "@deepseek-ai/dsh/package.json");

async function runFixture(t, mode, existing) {
  const dir = await mkdtemp(join(tmpdir(), "vibeify-fresh-profile-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const trace = join(dir, "trace");
  const profile = join(dir, "profile");
  if (existing) {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(profile);
    await writeFile(join(profile, "package.json"), JSON.stringify(existing));
    await writeFile(join(profile, "cordis.patch.yml"), "- id: permission\n  config:\n    defaultPreset: ask\n");
  }
  const script = `set -eu
profile_directory="$PROFILE_DIRECTORY"
script_directory="$REPO_ROOT/scripts"
repository_root="$REPO_ROOT"
runtime_anchor="$RUNTIME_ANCHOR"
provider_mode="$PROVIDER_MODE"
profile=web
qualified_dsh_version=0.2.1-rc.2
plugin_name=dsh-vibeify-experience
visual_plugin_name=dsh-visuals
social_plugin_name=dsh-social-desk
plugin_directory=unused
visual_plugin_directory=unused
social_plugin_directory=unused
install_immutable_plugin() {
  printf 'plugin:%s\\n' "$1" >> "$TRACE_PATH"
  if [ ! -f "$profile_directory/package.json" ]; then
    mkdir -p "$profile_directory"
    printf '%s\\n' '{"dependencies":{},"privateSetting":"keep"}' > "$profile_directory/package.json"
    printf '%s\\n' '- id: permission' '  config:' '    defaultPreset: ask' > "$profile_directory/cordis.patch.yml"
  fi
}
dsh() {
  test -f "$profile_directory/package.json"
  if [ "$provider_mode" = deepseek-codex ]; then
    node -e 'const p=require(process.argv[1]);if(p.pnpm?.overrides?.["@deepseek-ai/dsh-subagent-codex>@openai/codex"]!=="0.164.0")process.exit(1)' "$profile_directory/package.json"
  fi
  printf 'worker:%s\\n' "$*" >> "$TRACE_PATH"
}
${fragment}`;
  const result = spawnSync("bash", ["-c", script], { encoding: "utf8", env: { ...process.env, PROFILE_DIRECTORY: profile, TRACE_PATH: trace, REPO_ROOT: root, RUNTIME_ANCHOR: runtimeAnchor, PROVIDER_MODE: mode } });
  assert.equal(result.status, 0, result.stderr);
  return { trace: await readFile(trace, "utf8"), profile: JSON.parse(await readFile(join(profile, "package.json"), "utf8")), patch: await readFile(join(profile, "cordis.patch.yml"), "utf8") };
}

test("fresh DeepSeek-led install creates profile before real helper and installs qualified worker before routing", async (t) => {
  const result = await runFixture(t, "deepseek-codex");
  assert.equal(result.profile.privateSetting, "keep");
  assert.equal(result.profile.pnpm.overrides["@deepseek-ai/dsh-subagent-codex>@openai/codex"], "0.164.0");
  assert.match(result.patch, /defaultPreset: ask/);
  assert.match(result.patch, /selectedDefault: vibeify-deepseek/);
  assert.match(result.trace, /worker:.*@deepseek-ai\/dsh-subagent-codex@0\.2\.1-rc\.2\nplugin:dsh-vibeify-deepseek/);
});

test("other modes do not configure DeepSeek leadership and preserve existing worker upgrades", async (t) => {
  for (const mode of ["chatgpt", "deepseek"]) {
    const result = await runFixture(t, mode, { dependencies: { "@deepseek-ai/dsh-subagent-codex": "0.2.0-rc.2" }, privateSetting: "keep" });
    assert.equal(result.profile.privateSetting, "keep");
    assert.equal(result.profile.pnpm, undefined);
    assert.doesNotMatch(result.patch, /vibeify-deepseek/);
    assert.match(result.trace, /worker:.*@deepseek-ai\/dsh-subagent-codex@0\.2\.1-rc\.2/);
    assert.doesNotMatch(result.trace, /plugin:dsh-vibeify-deepseek/);
  }
});
