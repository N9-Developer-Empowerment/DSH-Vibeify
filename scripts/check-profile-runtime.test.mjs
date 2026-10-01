import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkProfileRuntime } from "./check-profile-runtime.mjs";

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "vibeify-runtime-check-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const modules = join(directory, "node_modules", "@deepseek-ai");
  for (const name of ["dsh-agent", "dsh-agent-preset-registry", "dsh-tools", "dsh-subagent", "dsh-tool-subagent", "dsh-scope"]) {
    const folder = join(modules, name);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "package.json"), JSON.stringify({ name: `@deepseek-ai/${name}`, version: "0.1.7-rc.2" }));
  }
  const packagePath = join(directory, "package.json");
  await writeFile(packagePath, "{}");
  return { modules, packagePath };
}

test("one runtime scope serves every session consumer", async (t) => {
  const { packagePath } = await fixture(t);
  assert.equal(checkProfileRuntime(packagePath), 5);
});

test("equal versions in separate scope modules are rejected", async (t) => {
  const { modules, packagePath } = await fixture(t);
  const duplicate = join(modules, "dsh-tools", "node_modules", "@deepseek-ai", "dsh-scope");
  await mkdir(duplicate, { recursive: true });
  await writeFile(join(duplicate, "package.json"), '{"version":"0.1.7-rc.2"}');
  assert.throws(() => checkProfileRuntime(packagePath), /Split DSH session scopes/);
});

test("missing and unqualified runtime entries fail before activation", async (t) => {
  const { modules, packagePath } = await fixture(t);
  await writeFile(join(modules, "dsh-agent", "package.json"), '{"version":"0.1.5-rc.3"}');
  assert.throws(() => checkProfileRuntime(packagePath), /Unqualified profile runtime/);
  await rm(join(modules, "dsh-agent"), { recursive: true });
  assert.throws(() => checkProfileRuntime(packagePath), /Missing installed profile runtime/);
});
