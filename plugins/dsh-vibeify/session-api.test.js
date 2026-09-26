import test from "node:test";
import assert from "node:assert/strict";

import { createSessionApi } from "./client-src/experience/session-api.js";

test("current DSH Session Remote accepts create, prompt, cancel and rename with a request id", async () => {
  const calls = [];
  const remote = {
    async create(request) { calls.push(["create", request]); return { ok: true, value: { sessionId: "update-one" } }; },
    async rename(request) { calls.push(["rename", request]); return { ok: true, value: { title: request.title, seq: 1 } }; },
    async prompt(request, signal) { calls.push(["prompt", request, signal]); return { ok: true, value: { accepted: true } }; },
    async cancel(request) { calls.push(["cancel", request]); return { ok: true, value: { accepted: true } }; },
    async page() { throw new Error("unused"); },
    async *follow() { throw new Error("unused"); },
  };
  const api = createSessionApi({ remote: { session: remote }, get() { throw new Error("legacy API must not be touched"); } });
  assert.equal((await api.create({ cwd: "/tmp/editorial", agentPreset: "editor" })).result.value.sessionId, "update-one");
  assert.equal((await api.rename({ sessionId: "update-one", title: "VIBE magazine updates" })).result.ok, true);
  assert.equal((await api.prompt({ sessionId: "update-one", mode: "queue", content: [{ type: "text", text: "An article" }] })).result.ok, true);
  assert.equal((await api.cancel({ sessionId: "update-one" })).result.ok, true);
  assert.match(calls[2][1].requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(calls[2][1].sessionId, "update-one");
  assert.equal(calls[2][2] instanceof AbortSignal, true);
  assert.deepEqual(calls[0][1], { cwd: "/tmp/editorial", agentPreset: "editor" });
});

test("history closes after the follow snapshot, then pages against its fixed cursor", async () => {
  const calls = [];
  const remote = {
    create() {}, prompt() {},
    async page(request, signal) {
      calls.push(["page", request, signal]);
      return { ok: true, value: { records: [{ type: "event", event: { seq: 1, type: "assistant/message" } }], hasMore: false } };
    },
    async *follow(request, signal) {
      calls.push(["follow", request, signal]);
      try {
        yield { type: "snapshot", cursor: 7, records: [{ type: "event", event: { seq: 6, type: "turn/end" } }], hasMore: true };
        calls.push(["resumed"]);
      } finally { calls.push(["closed"]); }
    },
  };
  const api = createSessionApi({ remote: { session: remote } });
  const first = await api.history({ sessionId: "reader", maxMessages: 50 });
  assert.equal(first.result.value.throughSeq, 7);
  assert.equal(first.result.value.events[0].event.seq, 6);
  assert.equal(calls.some(([name]) => name === "resumed"), false);
  assert.equal(calls.some(([name]) => name === "closed"), true);
  const older = await api.history({ sessionId: "reader", maxMessages: 50, throughSeq: 7, beforeSeq: 6 });
  assert.equal(older.result.value.events[0].event.seq, 1);
  assert.equal(calls[2][1].throughSeq, 7);
  assert.equal(calls[2][1].beforeSeq, 6);
});

test("a stalled history opening fails within its bound", async () => {
  let followSignal;
  const remote = {
    create() {}, prompt() {}, page() {},
    async *follow(_request, signal) {
      followSignal = signal;
      await new Promise(() => {});
    },
  };
  const api = createSessionApi({ remote: { session: remote } }, { historyOpenTimeoutMs: 20 });
  const result = await api.history({ sessionId: "stalled" });
  assert.equal(result.result.ok, false);
  assert.match(result.result.error.message, /timed out/i);
  assert.equal(followSignal.aborted, true);
});
