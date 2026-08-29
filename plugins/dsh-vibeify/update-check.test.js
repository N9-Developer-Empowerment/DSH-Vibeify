import assert from "node:assert/strict";
import test from "node:test";

import {
  compareVersions,
  createUpdateChecker,
  registerUpdateRpc,
  updaterForPlatform,
} from "./update-check.js";

test("semantic versions compare release and prerelease identifiers correctly", () => {
  assert.equal(compareVersions("0.1.1-rc.2", "0.1.1-rc.2"), 0);
  assert.equal(compareVersions("0.1.1-rc.2", "0.1.1"), -1);
  assert.equal(compareVersions("0.150.1", "0.150.0"), 1);
  assert.equal(compareVersions("1.0.0-alpha.10", "1.0.0-alpha.2"), 1);
});

test("updater links disclose platform verification rather than offering a Mac file everywhere", () => {
  const mac = updaterForPlatform("darwin");
  assert.equal(mac.status, "verified");
  assert.match(mac.url, /macOS\.zip$/);
  assert.match(mac.label, /verified macOS/);

  for (const platform of ["win32", "linux"]) {
    const updater = updaterForPlatform(platform);
    assert.equal(updater.status, "preview");
    assert.match(updater.url, /docs\/FAQ\.md$/);
    assert.match(updater.label, /preview/);
  }
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
  let registration;
  const ctx = {
    connection: {
      rpc: {
        handle(channel, handler, options) {
          registration = { channel, handler, options };
          return async () => {};
        },
      },
    },
    effect(factory) {
      factory();
    },
  };
  registerUpdateRpc(ctx, {
    check: async ({ force } = {}) => ({ force: force === true }),
  });

  assert.equal(registration.channel, "/vibeify-updates");
  assert.deepEqual(registration.options, { authority: "loopback" });
  assert.deepEqual(
    await registration.handler("check", { force: true }),
    { ok: true, value: { force: true } },
  );
  assert.equal((await registration.handler("unknown", {})).ok, false);
  assert.equal((await registration.handler("check", { force: "yes" })).ok, false);
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
      : { version: "0.9.1", dependencies: { "@openai/codex": "0.147.0" } },
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
