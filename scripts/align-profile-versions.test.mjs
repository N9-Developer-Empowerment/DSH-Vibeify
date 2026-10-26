import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./align-profile-versions.mjs", import.meta.url));
const qualified = JSON.parse(readFileSync(new URL("../plugins/dsh-vibeify/package.json", import.meta.url), "utf8")).peerDependencies["@deepseek-ai/dsh-agent"];
const framework = qualified === "0.2.1-rc.2" ? ["4.0.5", "3.18.5"] : ["4.0.4", "3.18.4"];

test("web profiles own both runtime bundles so agent scopes cannot fall back to another installation", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "vibeify-scope-"));
  t.after(async () => (await import("node:fs/promises")).rm(directory, { recursive: true, force: true }));
  const path = join(directory, "package.json");
  const original = {
    dependencies: { "@deepseek-ai/dsh-tools": qualified },
    dsh: { profile: { bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-vibeify"] } },
  };
  await writeFile(path, JSON.stringify(original));
  const runtime = join(directory, "runtime");
  await mkdir(runtime, { recursive: true });
  const anchor = join(runtime, "package.json");
  await writeFile(anchor, JSON.stringify({ name: "@deepseek-ai/dsh", version: qualified }));
  const manifests = {
    "dsh-base": { dependencies: { "@deepseek-ai/dsh-agent-preset": qualified, "@other/package": "1.0.0" } },
    "dsh-web-app": { dependencies: { "@deepseek-ai/dsh-agent-preset": qualified } },
    "dsh-app-boot": {},
    "cordis": { name: "@deepseek-ai/cordis", version: "4.0.8" },
    "schemastery": { name: "@deepseek-ai/schemastery", version: "3.18.8" },
    "dsh-agent-preset-registry": { peerDependencies: { "@deepseek-ai/dsh-agent": qualified } },
    "dsh-agent": { peerDependencies: { "@deepseek-ai/dsh-scope": qualified } },
    "dsh-scope": { dependencies: { "@deepseek-ai/dsh-session": qualified } },
    "dsh-session": {},
    "dsh-agent-preset": {},
  };
  for (const [name, manifest] of Object.entries(manifests)) {
    const folder = join(runtime, "node_modules", "@deepseek-ai", name);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "package.json"), JSON.stringify(manifest));
  }
  execFileSync(process.execPath, [script, path, anchor]);
  const updated = JSON.parse(await readFile(path, "utf8"));
  for (const name of ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"]) {
    assert.equal(updated.dependencies[name], qualified);
  }
  assert.equal(updated.pnpm.overrides["@deepseek-ai/cordis"], "4.0.8");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/schemastery"], "3.18.8");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/dsh-app-boot"], `link:${(await realpath(join(runtime, "node_modules", "@deepseek-ai", "dsh-app-boot"))).replaceAll("\\", "/")}`);
  assert.deepEqual(updated.dsh, original.dsh);
  for (const name of ["@deepseek-ai/dsh-agent-preset", "@deepseek-ai/dsh-agent", "@deepseek-ai/dsh-scope", "@deepseek-ai/dsh-session"]) {
    assert.equal(updated.dependencies[name], qualified, `${name} is a transitive qualified DSH runtime entry`);
  }
  assert.equal(updated.dependencies["@other/package"], undefined);
  const once = await readFile(path, "utf8");
  execFileSync(process.execPath, [script, path, anchor]);
  assert.equal(await readFile(path, "utf8"), once);
});

test("legacy profile pins are aligned and backed up without changing unrelated entries", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "vibeify-align-"));
  t.after(async () => {
    const { rm } = await import("node:fs/promises");
    await rm(directory, { recursive: true, force: true });
  });
  const path = join(directory, "package.json");
  const original = {
    dependencies: {
      "@deepseek-ai/dsh-subagent-codex": "0.1.5-rc.3",
      "@deepseek-ai/dsh-code-runtime": "0.1.5-rc.3",
      "dsh-vibeify": "file:private-snapshot.tgz",
    },
    pnpm: { overrides: {
      "@deepseek-ai/dsh-session": "0.1.5-rc.3",
      "@deepseek-ai/dsh-settings": "0.1.5-rc.3",
      "@deepseek-ai/cordis": "4.0.2",
      "@deepseek-ai/schemastery": "3.18.2",
      "@other/package": "0.1.5-rc.3",
    } },
  };
  await writeFile(path, `${JSON.stringify(original)}\n`);
  execFileSync(process.execPath, [script, path]);
  const updated = JSON.parse(await readFile(path, "utf8"));
  assert.equal(updated.dependencies["@deepseek-ai/dsh-code-runtime"], undefined);
  assert.equal(updated.dependencies["@deepseek-ai/dsh-subagent-codex"], qualified);
  assert.equal(updated.pnpm.overrides["@deepseek-ai/dsh-session"], qualified);
  assert.equal(updated.pnpm.overrides["@deepseek-ai/dsh-settings"], qualified);
  assert.equal(updated.pnpm.overrides["@deepseek-ai/cordis"], framework[0]);
  assert.equal(updated.pnpm.overrides["@deepseek-ai/schemastery"], framework[1]);
  assert.equal(updated.pnpm.overrides["@other/package"], "0.1.5-rc.3");
  assert.deepEqual(JSON.parse(await readFile(`${path}.vibeify-pre-dsh-${qualified}-backup`, "utf8")), original);
  const once = await readFile(path, "utf8");
  execFileSync(process.execPath, [script, path]);
  assert.equal(await readFile(path, "utf8"), once);
});


test("transitive runtime alignment preserves independent DSH versions and fails clearly", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "vibeify-align-independent-"));
  t.after(async () => (await import("node:fs/promises")).rm(directory, { recursive: true, force: true }));
  const path = join(directory, "package.json");
  const original = {
    dependencies: { "@deepseek-ai/dsh-scope": "0.9.0" },
    dsh: { profile: { bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"] } },
  };
  await writeFile(path, JSON.stringify(original));
  const runtime = join(directory, "runtime");
  await mkdir(runtime, { recursive: true });
  const anchor = join(runtime, "package.json");
  await writeFile(anchor, JSON.stringify({ name: "@deepseek-ai/dsh", version: qualified }));
  for (const [name, manifest] of Object.entries({
    "dsh-app-boot": {},
    "cordis": { name: "@deepseek-ai/cordis", version: framework[0] },
    "schemastery": { name: "@deepseek-ai/schemastery", version: framework[1] },
    "dsh-base": {},
    "dsh-web-app": {},
    "dsh-agent-preset-registry": { peerDependencies: { "@deepseek-ai/dsh-agent": qualified } },
  })) {
    const folder = join(runtime, "node_modules", "@deepseek-ai", name);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "package.json"), JSON.stringify(manifest));
  }
  const agent = join(runtime, "node_modules", "@deepseek-ai", "dsh-agent");
  const scope = join(runtime, "node_modules", "@deepseek-ai", "dsh-scope");
  await mkdir(agent, { recursive: true });
  await mkdir(scope, { recursive: true });
  await writeFile(join(agent, "package.json"), JSON.stringify({ peerDependencies: { "@deepseek-ai/dsh-scope": qualified } }));
  await writeFile(join(scope, "package.json"), "{}");
  const result = await import("node:child_process").then(({ spawnSync }) => spawnSync(process.execPath, [script, path, anchor], { encoding: "utf8" }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /independently configured runtime dependency: @deepseek-ai\/dsh-scope/);
  assert.deepEqual(JSON.parse(await readFile(path, "utf8")), original);
});


test("independent framework pins and private profile configuration survive alignment", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "vibeify-private-"));
  t.after(async () => (await import("node:fs/promises")).rm(directory, { recursive: true, force: true }));
  const path = join(directory, "package.json");
  const original = {
    dependencies: { "private-plugin": "file:private.tgz" },
    pnpm: { overrides: { "@deepseek-ai/cordis": "4.9.0", "@deepseek-ai/schemastery": "3.99.0" } },
    dsh: { profile: { bundles: ["@deepseek-ai/dsh-web-app"], privateSetting: "keep" } },
  };
  await writeFile(path, JSON.stringify(original));
  execFileSync(process.execPath, [script, path]);
  const updated = JSON.parse(await readFile(path, "utf8"));
  assert.equal(updated.pnpm.overrides["@deepseek-ai/cordis"], "4.9.0");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/schemastery"], "3.99.0");
  assert.equal(updated.dependencies["private-plugin"], "file:private.tgz");
  assert.deepEqual(updated.dsh, original.dsh);
});


test("previous runtime and framework pins migrate together while independent pins survive", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "vibeify-upgrade-"));
  t.after(async () => (await import("node:fs/promises")).rm(directory, { recursive: true, force: true }));
  const path = join(directory, "package.json");
  const fixtureScriptDirectory = join(directory, "scripts");
  const fixturePluginDirectory = join(directory, "plugins", "dsh-vibeify");
  await mkdir(fixtureScriptDirectory, { recursive: true });
  await mkdir(fixturePluginDirectory, { recursive: true });
  const fixtureScript = join(fixtureScriptDirectory, "align-profile-versions.mjs");
  await writeFile(fixtureScript, await readFile(script));
  await writeFile(join(fixturePluginDirectory, "package.json"), JSON.stringify({ peerDependencies: { "@deepseek-ai/dsh-agent": "0.2.1-rc.2" } }));
  const original = {
    dependencies: { "@deepseek-ai/dsh-base": "0.2.0-rc.2", "@deepseek-ai/dsh-web-app": "0.2.0-rc.2", "@deepseek-ai/cordis-plugin-include": "1.0.9", "@deepseek-ai/dsh-invariants": "0.2.0-rc.2", "@deepseek-ai/dsh-subagent-in-process-driver": "0.2.1-rc.2", "private-plugin": "file:private.tgz" },
    pnpm: { overrides: { "@deepseek-ai/cordis": "4.0.4", "@deepseek-ai/schemastery": "3.18.4" } },
    dsh: { profile: { bundles: ["@deepseek-ai/dsh-web-app"] } },
  };
  await writeFile(path, JSON.stringify(original));
  execFileSync(process.execPath, [fixtureScript, path]);
  const updated = JSON.parse(await readFile(path, "utf8"));
  assert.equal(updated.dependencies["@deepseek-ai/dsh-base"], "0.2.1-rc.2");
  assert.equal(updated.dependencies["@deepseek-ai/dsh-web-app"], "0.2.1-rc.2");
  assert.equal(updated.dependencies["@deepseek-ai/dsh-invariants"], undefined);
  assert.equal(updated.dependencies["@deepseek-ai/dsh-subagent-in-process-driver"], undefined);
  assert.equal(updated.dependencies["@deepseek-ai/cordis-plugin-include"], "1.0.10");
  assert.equal(updated.dependencies["private-plugin"], "file:private.tgz");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/cordis"], "4.0.5");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/schemastery"], "3.18.5");
});
