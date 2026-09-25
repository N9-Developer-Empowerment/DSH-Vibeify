import assert from "node:assert/strict";
import test from "node:test";

import { SOCIAL_DESK_RPC_CHANNEL, registerSocialDeskRpc } from "./social-rpc.js";

test("Social Desk RPC is loopback-only and presents sanitized errors", async () => {
  let registration;
  const ctx = {
    connection: { rpc: { handle(channel, handler, options) { registration = { channel, handler, options }; return () => {}; } } },
    effect(factory) { return factory(); },
  };
  registerSocialDeskRpc(ctx, {
    capabilities: async () => ({ channels: [] }),
    list: async () => ({ items: [] }),
    prepare: async () => { throw Object.assign(new Error("Bearer secret remote response"), { code: "invalid-request" }); },
    approveAndSchedule: async () => ({}),
    cancel: async () => ({}),
    retry: async () => ({}),
    recordManualPost: async () => ({}),
  });

  assert.equal(registration.channel, SOCIAL_DESK_RPC_CHANNEL);
  assert.deepEqual(registration.options, { authority: "loopback" });
  const result = await registration.handler("prepare", {});
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "invalid-request");
  assert.doesNotMatch(JSON.stringify(result), /Bearer secret|remote response/);
});

