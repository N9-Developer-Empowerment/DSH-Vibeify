import test from "node:test";
import assert from "node:assert/strict";

import { registerVisualRpc, VISUAL_RPC_CHANNEL } from "./visual-rpc.js";

test("visual search is exposed only to the local DSH browser", () => {
  let registration;
  const ctx = {
    connection: {
      rpc: {
        handle(channel, handler, options) {
          registration = { channel, handler, options };
          return () => {};
        },
      },
    },
    effect(factory) {
      return factory();
    },
  };

  registerVisualRpc(ctx, {
    capabilities: async () => ({}),
    search: async () => ({ candidates: [] }),
  });

  assert.equal(registration.channel, VISUAL_RPC_CHANNEL);
  assert.deepEqual(registration.options, { authority: "loopback" });
});
