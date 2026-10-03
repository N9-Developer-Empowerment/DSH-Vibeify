import test from "node:test";
import assert from "node:assert/strict";
import { createVisualCredentials } from "./client-src/experience/visual-credentials.js";

for (const modern of [true, false]) test(`${modern ? "current" : "legacy"} credential API keeps status reads and explicit writes separate`, async () => {
  const calls = [];
  const views = { PEXELS_API_KEY: { configured: true, writable: true } };
  const host = modern ? {
    describe: async refs => { calls.push(["describe", refs]); return { ok: true, value: views }; },
    set: async (ref, value) => { calls.push(["set", ref, value]); return { ok: true }; },
    unset: async ref => { calls.push(["unset", ref]); return { ok: true }; },
  } : {
    describe: async request => { calls.push(["describe", request.refs]); return { result: { ok: true, value: { credentials: views } } }; },
    set: async request => { calls.push(["set", request.ref, request.value]); return { result: { ok: true } }; },
    unset: async request => { calls.push(["unset", request.ref]); return { result: { ok: true } }; },
  };
  const client = createVisualCredentials(modern ? { remote: host } : { legacy: host });
  assert.deepEqual(await client.describe(["PEXELS_API_KEY"]), views);
  assert.deepEqual(calls, [["describe", ["PEXELS_API_KEY"]]]);
  await client.set("PEXELS_API_KEY", "synthetic-test-key");
  await client.unset("PEXELS_API_KEY");
  assert.deepEqual(calls.slice(1), [["set", "PEXELS_API_KEY", "synthetic-test-key"], ["unset", "PEXELS_API_KEY"]]);
});

test("failed status and write responses never claim success or repeat provider errors", async () => {
  const rejected = async () => ({ ok: false, error: { message: "sensitive provider detail" } });
  const client = createVisualCredentials({ remote: { describe: rejected, set: rejected, unset: rejected } });
  for (const action of [() => client.describe([]), () => client.set("PEXELS_API_KEY", "synthetic-test-key"), () => client.unset("PEXELS_API_KEY")]) {
    await assert.rejects(action, error => error.message === "Image credential operation failed.");
  }
});
