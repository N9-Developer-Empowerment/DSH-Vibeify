import test from "node:test";
import assert from "node:assert/strict";
import { registerLocalRpc } from "./local-rpc.js";
import { rpcHarness, callRpc } from "./rpc-test-harness.js";

test("local RPC fences remote and unauthenticated requests before dispatch", async () => {
  let calls = 0;
  for (const [rejection, address, expected] of [[401, "127.0.0.1", 401], [403, "127.0.0.1", 403], [undefined, "192.168.1.10", 403]]) {
    const h = rpcHarness(rejection);
    registerLocalRpc(h.ctx, "/test", async () => { calls++; });
    assert.equal((await callRpc(h.route, "read", {}, { address, body: "not JSON" })).status, expected);
  }
  assert.equal(calls, 0);
});

test("local RPC bounds and validates requests, retains envelope and hides diagnostics", async () => {
  const h = rpcHarness(); let calls = 0;
  registerLocalRpc(h.ctx, "/test", async () => { calls++; return { ok: true, value: "ready" }; });
  const good = await callRpc(h.route, "read", {});
  assert.equal(good.status, 200); assert.equal(good.headers["cache-control"], "no-store");
  assert.equal(JSON.parse(good.body).rpcId, "test"); assert.equal(calls, 1);
  for (const [options, status] of [ [{body:"invalid"},400], [{body:"{}"},400], [{headers:{"content-type":"text/plain"}},415], [{headers:{"content-length":"32769"}},413], [{body:"x".repeat(32769)},413], [{method:"GET"},404] ]) {
    assert.equal((await callRpc(h.route, "read", {}, options)).status, status);
  }
  const mismatch = await callRpc(h.route, "read", {}, { endpointMethod: "save" });
  assert.equal(mismatch.result.error.code, "gateway/bad-request"); assert.equal(calls, 1);
  const failing = rpcHarness();
  registerLocalRpc(failing.ctx, "/test", async () => { throw Error("SECRET diagnostics"); });
  const failure = await callRpc(failing.route, "read", {});
  assert.equal(failure.status, 500); assert.doesNotMatch(failure.body, /SECRET/);
});
