import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("Windows installer defers before login, global install, or profile edits when DSH is listening", async () => {
  const source = await read("scripts/Install DSH Vibeify.ps1");
  const check = source.indexOf("if ($Check)");
  const guard = source.indexOf("if (Test-LocalDsh)", check);
  const providerPrompt = source.indexOf("if (-not $Provider)", guard);
  const login = source.indexOf("codex login", providerPrompt);
  const firstGlobalMutation = source.indexOf("npm install --global", providerPrompt);
  const firstProfileMutation = source.indexOf("align-profile-versions.mjs", providerPrompt);

  assert.ok(check >= 0 && guard > check);
  assert.ok(providerPrompt > guard);
  assert.ok(login > guard);
  assert.ok(firstGlobalMutation > guard);
  assert.ok(firstProfileMutation > guard);
  assert.match(source, /TcpClient/);
  assert.match(source, /change software\/profile files/);
});

test("Linux installer defers before provider setup or runtime/profile changes when DSH is listening", async () => {
  const source = await read("scripts/install-dsh-vibeify-linux.sh");
  const check = source.indexOf('if [[ "$check_only" == true ]]');
  const guard = source.indexOf("if local_dsh_responds; then", check);
  const providerPrompt = source.indexOf("Choose how you want the AI side to work", guard);
  const runtimeInstall = source.indexOf('install-dsh.sh" --replace', providerPrompt);
  const profileInstall = source.indexOf('install-vibeify.sh" --provider', providerPrompt);

  assert.ok(check >= 0 && guard > check);
  assert.ok(providerPrompt > guard);
  assert.ok(runtimeInstall > guard);
  assert.ok(profileInstall > guard);
  assert.match(source, /curl --silent --output \/dev\/null --max-time 2/);
  assert.match(source, /No software or profile files were changed/);
});

test("Windows and Linux open the token-aware local DSH URL only after its readiness check", async () => {
  const windows = await read("scripts/Install DSH Vibeify.ps1");
  const linux = await read("scripts/install-dsh-vibeify-linux.sh");

  assert.match(windows, /dsh-web-readiness\.mjs/);
  assert.match(windows, /\$ReadinessScript check \$Port \$ServerLog/);
  assert.match(windows, /\$ReadinessScript url \$Port \$ServerLog/);
  assert.match(windows, /Start-Process \$AuthenticatedUrl/);
  assert.doesNotMatch(windows, /Start-Process "http:\/\/127\.0\.0\.1:/);

  assert.match(linux, /dsh-web-readiness\.mjs" check/);
  assert.match(linux, /dsh-web-readiness\.mjs" url/);
  assert.match(linux, /xdg-open "\$authenticated_url"/);
  assert.doesNotMatch(linux, /xdg-open "http:\/\/127\.0\.0\.1:/);
});
