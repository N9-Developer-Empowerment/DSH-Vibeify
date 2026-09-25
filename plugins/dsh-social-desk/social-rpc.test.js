import assert from "node:assert/strict";
import test from "node:test";

import { createSocialDeskService } from "./social-desk-service.js";
import { SOCIAL_DESK_RPC_CHANNEL, registerSocialDeskRpc } from "./social-rpc.js";

test("loopback RPC keeps legacy queue reads and rejects every old write endpoint", async () => {
  const legacy = { version: 1, items: [{ id: "old-queue-item", status: "approved", text: "Saved for recovery." }] };
  let writes = 0;
  let connectorCalls = 0;
  let registration;
  const service = createSocialDeskService({
    store: {
      async read() { return structuredClone(legacy); },
      async write() { writes += 1; },
    },
    connectorFor() { connectorCalls += 1; return { async publish() { connectorCalls += 1; } }; },
  });
  const ctx = {
    connection: { rpc: { handle(channel, handler, options) { registration = { channel, handler, options }; return () => {}; } } },
    effect(factory) { return factory(); },
  };

  registerSocialDeskRpc(ctx, service);

  assert.equal(registration.channel, SOCIAL_DESK_RPC_CHANNEL);
  assert.deepEqual(registration.options, { authority: "loopback" });
  assert.equal((await registration.handler("capabilities", {})).value.automaticPublishing, false);
  assert.deepEqual((await registration.handler("list", {})).value.items, legacy.items);

  for (const endpoint of ["prepare", "approve-and-schedule", "cancel", "retry", "record-manual-post"]) {
    const result = await registration.handler(endpoint, { id: "old-queue-item" });
    assert.equal(result.ok, false, endpoint);
    assert.equal(result.error.code, "disabled", endpoint);
    assert.match(result.error.message, /disabled/i);
  }

  assert.deepEqual(legacy.items, [{ id: "old-queue-item", status: "approved", text: "Saved for recovery." }]);
  assert.equal(writes, 0);
  assert.equal(connectorCalls, 0);
});
