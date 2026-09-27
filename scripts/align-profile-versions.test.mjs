import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const script = new URL("./align-profile-versions.mjs", import.meta.url).pathname;

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
  assert.equal(updated.dependencies["@deepseek-ai/dsh-subagent-codex"], "0.1.7-rc.2");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/dsh-session"], "0.1.7-rc.2");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/dsh-settings"], "0.1.7-rc.2");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/cordis"], "4.0.4");
  assert.equal(updated.pnpm.overrides["@deepseek-ai/schemastery"], "3.18.4");
  assert.equal(updated.pnpm.overrides["@other/package"], "0.1.5-rc.3");
  assert.deepEqual(JSON.parse(await readFile(`${path}.vibeify-pre-dsh-0.1.7-backup`, "utf8")), original);
  const once = await readFile(path, "utf8");
  execFileSync(process.execPath, [script, path]);
  assert.equal(await readFile(path, "utf8"), once);
});
