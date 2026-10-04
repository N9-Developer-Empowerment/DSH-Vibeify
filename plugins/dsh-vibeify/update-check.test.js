import { rpcHarness, callRpc } from "./rpc-test-harness.js";
import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import {
  compareVersions,
  createUpdateChecker,
  installedDshVersion,
  registerUpdateRpc,
  updaterForPlatform,
} from "./update-check.js";

test("semantic versions compare release and prerelease identifiers correctly", () => {
  assert.equal(compareVersions("0.1.1-rc.2", "0.1.1-rc.2"), 0);
  assert.equal(compareVersions("0.1.1-rc.2", "0.1.1"), -1);
  assert.equal(compareVersions("0.150.1", "0.150.0"), 1);
  assert.equal(compareVersions("1.0.0-alpha.10", "1.0.0-alpha.2"), 1);
});

test("all updater actions open the public platform update guide", () => {
  for (const [platform, label] of [
    ["darwin", "Open macOS update guide"],
    ["win32", "Open Windows update guide"],
    ["linux", "Open Linux update guide"],
  ]) {
    const updater = updaterForPlatform(platform);
    assert.equal(updater.url, "https://dsh-vibeify.ezzye.chatgpt.site/#update");
    assert.equal(updater.label, label);
    assert.equal(updater.status, "guide");
    assert.match(updater.note, /terminal/i);
    assert.match(updater.note, /Finish active tasks first/);
    assert.equal(updater.restartRequiresIdleConfirmation, true);
  }
  assert.equal(updaterForPlatform("freebsd").status, "unsupported");
  assert.equal(updaterForPlatform("freebsd").url, "https://dsh-vibeify.ezzye.chatgpt.site/#update");
});

async function runtimeFixture(t, { name = "@deepseek-ai/dsh", version = "0.1.9-rc.8" } = {}) {
  const root = await mkdtemp(join(tmpdir(), "vibeify-runtime-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  // Match npm's Windows package layout, including spaces in its installation path.
  const runtime = join(root, "Windows user", "AppData", "Roaming", "npm", "node_modules", "@deepseek-ai", "dsh");
  const entrypoint = join(runtime, "lib", "bin.js");
  await mkdir(dirname(entrypoint), { recursive: true });
  await writeFile(join(runtime, "package.json"), JSON.stringify({ name, version, type: "module" }));
  await writeFile(entrypoint, "// runtime fixture\n");
  return { root, runtime, entrypoint };
}

test("installed DSH version needs neither a dsh.cmd launcher nor PATH", async (t) => {
  const { root, entrypoint } = await runtimeFixture(t);
  const moduleUrl = new URL("./update-check.js", import.meta.url).href;
  await writeFile(entrypoint, `import { installedDshVersion } from ${JSON.stringify(moduleUrl)};
    process.stdout.write(await installedDshVersion());`);
  const { stdout } = await promisify(execFile)(process.execPath, [entrypoint], {
    cwd: root,
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "path")), PATH: "" },
    timeout: 5_000,
  });
  assert.equal(stdout, "0.1.9-rc.8");
});

test("installed DSH version comes from the process runtime rather than profile or source peers", async (t) => {
  const { root, entrypoint } = await runtimeFixture(t);
  await writeFile(join(root, "package.json"), JSON.stringify({
    name: "dsh-vibeify", version: "9.9.9",
    peerDependencies: { "@deepseek-ai/dsh-agent": "9.9.8" },
  }));
  const profileAgent = join(root, "node_modules", "@deepseek-ai", "dsh-agent");
  await mkdir(profileAgent, { recursive: true });
  await writeFile(join(profileAgent, "package.json"), JSON.stringify({ name: "@deepseek-ai/dsh-agent", version: "9.9.7" }));
  assert.equal(await installedDshVersion({ entrypoint }), "0.1.9-rc.8");
});

test("installed DSH version follows the actual symlinked launcher", { skip: process.platform === "win32" && "Windows file symlinks require developer mode or elevated privileges" }, async (t) => {
  const { root, entrypoint } = await runtimeFixture(t);
  const launcher = join(root, "dsh");
  await symlink(entrypoint, launcher);
  assert.equal(await installedDshVersion({ entrypoint: launcher }), "0.1.9-rc.8");
});

test("installed DSH version refuses unrelated packages and invalid runtime versions", async (t) => {
  const unrelated = await runtimeFixture(t, { name: "@deepseek-ai/dsh-agent" });
  await assert.rejects(installedDshVersion({ entrypoint: unrelated.entrypoint }), /running DSH package/);
  const invalid = await runtimeFixture(t, { version: "^0.2.0" });
  await assert.rejects(installedDshVersion({ entrypoint: invalid.entrypoint }), /semantic version/);
  await assert.rejects(installedDshVersion({ entrypoint: join(invalid.root, "missing.js") }), /running DSH package/);
});

test("checker distinguishes installable updates from an unqualified Codex release", async () => {
  const checker = createUpdateChecker({
    current: {
      dsh: async () => "0.1.1-rc.2",
      vibeify: "0.9.1",
      codex: "0.147.0",
    },
    fetchJson: async (url) => {
      if (url.includes("deepseek-ai")) return { version: "0.1.1-rc.2" };
      if (url.includes("openai")) return { version: "0.150.1" };
      return {
        version: "0.9.1",
        peerDependencies: { "@deepseek-ai/dsh-agent": "0.1.1-rc.2" },
        dependencies: { "@openai/codex": "0.147.0" },
      };
    },
    now: () => new Date("2026-08-28T18:00:00.000Z"),
  });

  const result = await checker.check();
  assert.equal(result.components.dsh.state, "current");
  assert.equal(result.components.vibeify.state, "current");
  assert.equal(result.components.codex.state, "awaiting-vibeify");
  assert.equal(result.components.codex.latest, "0.150.1");
  assert.equal(result.components.codex.installable, "0.147.0");
  assert.equal(result.updateAvailable, false);
});

test("checker reports a Codex update only when the latest Vibeify bundle qualifies it", async () => {
  const checker = createUpdateChecker({
    current: {
      dsh: async () => "0.1.1-rc.2",
      vibeify: "0.9.1",
      codex: "0.147.0",
    },
    fetchJson: async (url) => {
      if (url.includes("deepseek-ai")) return { version: "0.1.1-rc.3" };
      if (url.includes("openai")) return { version: "0.150.1" };
      return {
        version: "0.10.0",
        peerDependencies: { "@deepseek-ai/dsh-agent": "0.1.1-rc.3" },
        dependencies: { "@openai/codex": "0.150.1" },
      };
    },
  });

  const result = await checker.check();
  assert.equal(result.components.dsh.state, "update-available");
  assert.equal(result.components.vibeify.state, "update-available");
  assert.equal(result.components.codex.state, "update-available");
  assert.equal(result.updateAvailable, true);
});

test("network failures are fail-soft and never hide installed versions", async () => {
  const checker = createUpdateChecker({
    current: {
      dsh: async () => "0.1.1-rc.2",
      vibeify: "0.9.1",
      codex: "0.147.0",
    },
    fetchJson: async () => {
      throw new Error("offline");
    },
  });

  const result = await checker.check();
  assert.equal(result.components.dsh.current, "0.1.1-rc.2");
  assert.equal(result.components.dsh.state, "unknown");
  assert.equal(result.components.vibeify.current, "0.9.1");
  assert.equal(result.components.codex.current, "0.147.0");
  assert.equal(result.updateAvailable, false);
});

test("checks are cached until a user explicitly asks to check again", async () => {
  let calls = 0;
  const checker = createUpdateChecker({
    current: {
      dsh: async () => "0.1.1-rc.2",
      vibeify: "0.9.1",
      codex: "0.147.0",
    },
    fetchJson: async (url) => {
      calls += 1;
      if (url.includes("deepseek-ai")) return { version: "0.1.1-rc.2" };
      if (url.includes("openai")) return { version: "0.147.0" };
      return {
        version: "0.9.1",
        peerDependencies: { "@deepseek-ai/dsh-agent": "0.1.1-rc.2" },
        dependencies: { "@openai/codex": "0.147.0" },
      };
    },
  });

  await checker.check();
  await checker.check();
  assert.equal(calls, 3);
  await checker.check({ force: true });
  assert.equal(calls, 6);
});

test("update RPC is loopback-only and accepts only its check endpoint", async () => {
  const harness = rpcHarness();
  registerUpdateRpc(harness.ctx, {
    check: async ({ force } = {}) => ({ force: force === true }),
  });

  assert.equal(harness.route.path, "/vibeify-updates");
  assert.deepEqual((await callRpc(harness.route, "check", { force: true })).result, { ok: true, value: { force: true } });
  assert.equal((await callRpc(harness.route, "unknown", {})).result.ok, false);
  assert.equal((await callRpc(harness.route, "check", { force: "yes" })).result.ok, false);
});

test("provider-neutral Vibeify omits the Codex row without weakening other checks", async () => {
  const checker = createUpdateChecker({
    current: {
      dsh: async () => "0.1.1-rc.2",
      vibeify: "0.9.1",
      codex: null,
    },
    fetchJson: async (url) => url.includes("deepseek-ai")
      ? { version: "0.1.1-rc.2" }
      : { version: "0.9.1", peerDependencies: { "@deepseek-ai/dsh-agent": "0.1.1-rc.2" },
        dependencies: { "@openai/codex": "0.147.0" } },
  });

  const result = await checker.check();
  assert.deepEqual(result.components.codex, {
    current: null,
    latest: null,
    installable: null,
    state: "not-included",
  });
  assert.equal(result.components.dsh.state, "current");
});

 test("DSH updates only offer the version qualified by the installable bundle", async () => {
 const c=createUpdateChecker({current:{dsh:async()=>"0.1.7-rc.2",vibeify:"0.16.3",codex:null},fetchJson:async(url)=>url.includes("registry")?{version:"0.2.1"}:{version:"0.16.4",peerDependencies:{"@deepseek-ai/dsh-agent":"0.1.7-rc.2"}}});
 const r=await c.check(); assert.equal(r.components.dsh.state,"awaiting-vibeify"); assert.equal(r.components.dsh.installable,"0.1.7-rc.2");
});
