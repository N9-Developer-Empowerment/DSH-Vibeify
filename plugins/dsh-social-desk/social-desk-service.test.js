import assert from "node:assert/strict";
import test from "node:test";

import { createSocialDeskService } from "./social-desk-service.js";

const oldQueue = Object.freeze({
  version: 1,
  items: Object.freeze([
    Object.freeze({ id: "legacy-approved", status: "approved", mode: "official-api", scheduledAt: "2026-09-26T12:00:00.000Z", text: "Keep for recovery." }),
    Object.freeze({ id: "legacy-posting", status: "posting", mode: "official-api", postingStartedAt: "2026-09-25T12:00:00.000Z", text: "Keep this uncertain record." }),
  ]),
});

test("legacy queues stay readable while every write, recovery and scheduled publish stays inert", async () => {
  let document = structuredClone(oldQueue);
  let writes = 0;
  let connectorCalls = 0;
  const store = {
    async read() { return structuredClone(document); },
    async write(next) { writes += 1; document = structuredClone(next); },
  };
  const service = createSocialDeskService({
    store,
    connectorFor() {
      connectorCalls += 1;
      return { async publish() { connectorCalls += 1; } };
    },
  });

  assert.deepEqual(await service.capabilities(), {
    name: "Vibe Social Desk",
    available: false,
    channels: [],
    approval: "disabled",
    automaticPublishing: false,
  });
  assert.deepEqual(await service.list(), { items: oldQueue.items });

  for (const operation of [
    () => service.prepare({}),
    () => service.approveAndSchedule({ id: "legacy-approved" }),
    () => service.cancel({ id: "legacy-approved" }),
    () => service.retry({ id: "legacy-approved" }),
    () => service.recordManualPost({ id: "legacy-approved" }),
  ]) {
    await assert.rejects(operation, { code: "disabled" });
  }
  assert.deepEqual(await service.recover(), { recovered: false });
  assert.deepEqual(await service.tick(), { attempted: 0 });

  assert.deepEqual(document, oldQueue);
  assert.equal(writes, 0);
  assert.equal(connectorCalls, 0);
});

test("returned legacy rows are copies, so reading cannot mutate the stored queue", async () => {
  let document = structuredClone(oldQueue);
  const service = createSocialDeskService({ store: { async read() { return structuredClone(document); } } });
  const result = await service.list();
  result.items[0].status = "posted";

  assert.deepEqual(document, oldQueue);
});
