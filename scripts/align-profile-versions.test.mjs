import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./align-profile-versions.mjs", import.meta.url));

test("web profiles own both runtime bundles so agent scopes cannot fall back to another installation", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "vibeify-scope-"));
  t.after(async () => (await import("node:fs/promises")).rm(directory, { recursive: true, force: true }));
  const path = join(directory, "package.json");
  const original = {
    dependencies: { "@deepseek-ai/dsh-tools": "0.2.0-rc.2" },
    dsh: { profile: { bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-vibeify"] } },
  };
  await writeFile(path, JSON.stringify(original));
  const runtime = join(directory, "runtime");
  await mkdir(runtime, { recursive: true });
  const anchor = join(runtime, "package.json");
  await writeFile(anchor, '{"name":"@deepseek-ai/dsh","version":"0.2.0-rc.2"}');
  const manifests = {
    "dsh-base": { dependencies: { "@deepseek-ai/dsh-agent-preset": "0.2.0-rc.2", "@other/package": "1.0.0" } },
    "dsh-web-app": { dependencies: { "@deepseek-ai/dsh-agent-preset": "0.2.0-rc.2" } },
    "dsh-app-boot": {},
    "dsh-agent-preset-registry": { peerDependencies: { "@deepseek-ai/dsh-agent": "0.2.0-rc.2" } },
    "dsh-agent": { peerDependencies: { "@deepseek-ai/dsh-scope": "0.2.0-rc.2" } },
    "dsh-scope": { dependencies: { "@deepseek-ai/dsh-session": "0.2.0-rc.2" } },
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
    assert.equal(updated.dependencies[name], "0.2.0-rc.2");
  }
  assert.equal(updated.pnpm.overrides["@deepseek-ai/cordis"], "4.0.4");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/schemastery"], "3.18.4");
  assert.deepEqual(updated.dsh, original.dsh);
  for (const name of ["@deepseek-ai/dsh-agent-preset", "@deepseek-ai/dsh-agent", "@deepseek-ai/dsh-scope", "@deepseek-ai/dsh-session"]) {
    assert.equal(updated.dependencies[name], "0.2.0-rc.2", `${name} is a transitive qualified DSH runtime entry`);
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
  assert.equal(updated.dependencies["@deepseek-ai/dsh-subagent-codex"], "0.2.0-rc.2");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/dsh-session"], "0.2.0-rc.2");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/dsh-settings"], "0.2.0-rc.2");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/cordis"], "4.0.4");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/schemastery"], "3.18.4");
  assert.equal(updated.pnpm.overrides["@other/package"], "0.1.5-rc.3");
  assert.deepEqual(JSON.parse(await readFile(`${path}.vibeify-pre-dsh-0.2.0-rc.2-backup`, "utf8")), original);
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
  await writeFile(anchor, '{"name":"@deepseek-ai/dsh","version":"0.2.0-rc.2"}');
  for (const [name, manifest] of Object.entries({
    "dsh-app-boot": {},
    "dsh-base": {},
    "dsh-web-app": {},
    "dsh-agent-preset-registry": { peerDependencies: { "@deepseek-ai/dsh-agent": "0.2.0-rc.2" } },
  })) {
    const folder = join(runtime, "node_modules", "@deepseek-ai", name);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "package.json"), JSON.stringify(manifest));
  }
  const agent = join(runtime, "node_modules", "@deepseek-ai", "dsh-agent");
  const scope = join(runtime, "node_modules", "@deepseek-ai", "dsh-scope");
  await mkdir(agent, { recursive: true });
  await mkdir(scope, { recursive: true });
  await writeFile(join(agent, "package.json"), JSON.stringify({ peerDependencies: { "@deepseek-ai/dsh-scope": "0.2.0-rc.2" } }));
  await writeFile(join(scope, "package.json"), "{}");
  const result = await import("node:child_process").then(({ spawnSync }) => spawnSync(process.execPath, [script, path, anchor], { encoding: "utf8" }));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /independently configured runtime dependency: @deepseek-ai\/dsh-scope/);
  assert.deepEqual(JSON.parse(await readFile(path, "utf8")), original);
});
