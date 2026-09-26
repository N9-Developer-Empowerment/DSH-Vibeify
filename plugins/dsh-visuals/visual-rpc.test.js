import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";

import { registerVisualRpc, VISUAL_RPC_CHANNEL } from "./visual-rpc.js";

function harness(rejection) {
  let route;
  const ctx = {
    connection: { requestRejection: () => rejection },
    webServer: { register(value) { route = value; return () => {}; } },
    effect(factory) { return factory(); },
  };
  const service = {
    capabilities: async () => ({ wikimedia: { enabled: true } }),
    search: async () => ({ candidates: [] }),
    generate: async (request) => ({ status: "generated", subject: request.subject }),
  };
  registerVisualRpc(ctx, service);
  return route;
}

async function call(route, endpoint, body, { headers = {}, method = "POST" } = {}) {
  const bytes = Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
  const req = Readable.from([bytes]);
  req.method = method;
  req.url = `${VISUAL_RPC_CHANNEL}/${endpoint}`;
  req.headers = { "content-type": "application/json", host: "127.0.0.1:3080", ...headers };
  const res = new EventEmitter();
  res.writableEnded = false;
  res.destroyed = false;
  res.writeHead = (status, replyHeaders) => { res.status = status; res.headers = replyHeaders; };
  res.end = (text) => { res.body = text; res.writableEnded = true; };
  await route.handler(req, res);
  return res;
}

test("visual RPC registers an exact authenticated prefix route", async () => {
  const route = harness(undefined);
  assert.equal(route.kind, "prefix");
  assert.equal(route.path, VISUAL_RPC_CHANNEL);
  const response = await call(route, "generate", { type: "client-request", rpcId: "id-1", method: "generate", payload: { subject: "Public story" } });
  assert.equal(response.status, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.deepEqual(JSON.parse(response.body), { type: "server-response", rpcId: "id-1", result: { ok: true, value: { status: "generated", subject: "Public story" } } });
});

test("Connection's authentication fence rejects requests before reading an RPC body", async () => {
  const route = harness(401);
  const response = await call(route, "generate", "not-json");
  assert.equal(response.status, 401);
  assert.equal(response.body, "unauthorized");
});

test("visual RPC rejects malformed and oversized requests without dispatching", async () => {
  const route = harness(undefined);
  assert.equal((await call(route, "generate", "bad json")).status, 400);
  assert.equal((await call(route, "generate", { nope: true })).status, 400);
  assert.equal((await call(route, "generate", { type: "client-request", rpcId: "id", method: "generate", payload: { subject: "public" } }, { headers: { "content-length": "32769" } })).status, 413);
  assert.equal((await call(route, "generate", { type: "client-request", rpcId: "id", method: "generate", payload: { subject: "public" } }, { headers: { "content-type": "text/plain" } })).status, 415);
  const mismatch = await call(route, "generate", { type: "client-request", rpcId: "id", method: "search", payload: {} });
  assert.equal(JSON.parse(mismatch.body).result.error.code, "gateway/bad-request");
});
