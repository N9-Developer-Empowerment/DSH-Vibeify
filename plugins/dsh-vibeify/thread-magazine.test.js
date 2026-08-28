import test from "node:test";
import assert from "node:assert/strict";

import {
  completedHistoryMagazineChunks,
  installThreadMagazineBridge,
  readCompleteSessionHistory,
  sessionNeedsMagazineScan,
} from "./client-src/experience/thread-magazine.js";
import { VIBE_CHAT_RESULT_EVENT } from "./client-src/experience/vibe-result.js";

function message({ seq, time, turn = 1, step = 1, id, content, interrupted = false }) {
  return {
    event: {
      type: "assistant/message",
      seq,
      time,
      data: {
        turn,
        step,
        message: { id, role: "assistant", source: { kind: "model", provider: "test", model: "test" }, content },
        ...(interrupted ? { interrupted: true } : {}),
      },
    },
  };
}

function turnEnd({ seq, time, turn = 1, reason = "completed" }) {
  return { event: { type: "turn/end", seq, time, data: { turn, reason: { kind: reason } } } };
}

test("one completed answer becomes one deterministic shared-magazine card", () => {
  const entries = [
    { event: { type: "user/message", seq: 1, time: 100, data: { content: [{ type: "text", text: "private prompt" }] } } },
    message({
      seq: 2,
      time: 200,
      id: "answer-1",
      content: [{ type: "text", text: "## Clear answer\n\nA **formatted** result for the reader." }],
    }),
    turnEnd({ seq: 3, time: 201 }),
  ];
  const first = completedHistoryMagazineChunks("session-one", entries);
  const again = completedHistoryMagazineChunks("session-one", entries);
  assert.deepEqual(first, again);
  assert.equal(first.length, 1);
  assert.equal(first[0].source, "chat-directed");
  assert.equal(first[0].title, "Clear answer");
  assert.match(first[0].markdown, /formatted/);
  assert.doesNotMatch(JSON.stringify(first), /private prompt|session-one|answer-1/);
});

test("unfinished, aborted and interrupted turns never enter the magazine", () => {
  const incomplete = [message({ seq: 1, time: 100, id: "open", content: [{ type: "text", text: "Still working" }] })];
  const aborted = [
    message({ seq: 1, time: 100, id: "aborted", content: [{ type: "text", text: "Partial" }], interrupted: true }),
    turnEnd({ seq: 2, time: 101, reason: "aborted" }),
  ];
  assert.deepEqual(completedHistoryMagazineChunks("one", incomplete), []);
  assert.deepEqual(completedHistoryMagazineChunks("two", aborted), []);
});

test("closed Vibe chunks from one completed update are published without its summary card", () => {
  const entries = [
    message({
      seq: 10,
      time: 500,
      id: "update-step",
      content: [{
        type: "reasoning",
        text: '<vibe-chunk id="refill-one-opening" kind="editorial" title="A new opening">Ready to read.</vibe-chunk>',
      }],
    }),
    message({ seq: 11, time: 510, step: 2, id: "update-final", content: [{ type: "text", text: "The magazine update is complete." }] }),
    turnEnd({ seq: 12, time: 511 }),
  ];
  const chunks = completedHistoryMagazineChunks("update-session", entries);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].source, "fresh-stream");
  assert.equal(chunks[0].title, "A new opening");
  assert.doesNotMatch(chunks[0].markdown, /update is complete/);
});

test("only idle non-blank sessions with new durable activity are scanned", () => {
  const scanned = new Map([["same", 20]]);
  assert.equal(sessionNeedsMagazineScan({ id: "running", running: true, blank: false, updatedAt: 30 }, scanned), false);
  assert.equal(sessionNeedsMagazineScan({ id: "blank", running: false, blank: true, updatedAt: 30 }, scanned), false);
  assert.equal(sessionNeedsMagazineScan({ id: "same", running: false, blank: false, updatedAt: 20 }, scanned), false);
  assert.equal(sessionNeedsMagazineScan({ id: "fresh", running: false, blank: false, updatedAt: 30 }, scanned), true);
});

test("all local history pages are read backwards without resuming or prompting a thread", async () => {
  const calls = [];
  const api = {
    sessions: {
      async history(payload) {
        calls.push(payload);
        if (payload.beforeSeq === undefined) {
          return { result: { ok: true, value: { events: [{ event: { seq: 51 } }, { event: { seq: 75 } }], hasMore: true } } };
        }
        return { result: { ok: true, value: { events: [{ event: { seq: 1 } }, { event: { seq: 50 } }], hasMore: false } } };
      },
    },
  };
  const entries = await readCompleteSessionHistory(api, "idle-thread");
  assert.deepEqual(entries.map(({ event }) => event.seq), [1, 50, 51, 75]);
  assert.deepEqual(calls, [
    { sessionId: "idle-thread", maxMessages: 50 },
    { sessionId: "idle-thread", maxMessages: 50, beforeSeq: 51 },
  ]);
  assert.deepEqual(Object.keys(api.sessions), ["history"]);
});

test("the bridge combines completed answers from all idle threads using history reads only", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalCustomEvent = Object.getOwnPropertyDescriptor(globalThis, "CustomEvent");
  class FakeCustomEvent extends Event {
    constructor(type, options = {}) { super(type); this.detail = options.detail; }
  }
  const values = new Map();
  const browserWindow = new EventTarget();
  browserWindow.localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: browserWindow });
  Object.defineProperty(globalThis, "CustomEvent", { configurable: true, writable: true, value: FakeCustomEvent });
  const calls = [];
  const published = [];
  browserWindow.addEventListener(VIBE_CHAT_RESULT_EVENT, (event) => published.push(event.detail.chunk));
  const summaries = {
    ids: ["thread-a", "thread-b", "still-running"],
    byId: {
      "thread-a": { id: "thread-a", running: false, blank: false, updatedAt: 10 },
      "thread-b": { id: "thread-b", running: false, blank: false, updatedAt: 20 },
      "still-running": { id: "still-running", running: true, blank: false, updatedAt: 30 },
    },
  };
  const histories = {
    "thread-a": [message({ seq: 1, time: 100, id: "a", content: [{ type: "text", text: "## Answer A\n\nFirst." }] }), turnEnd({ seq: 2, time: 101 })],
    "thread-b": [message({ seq: 3, time: 200, id: "b", content: [{ type: "text", text: "## Answer B\n\nSecond." }] }), turnEnd({ seq: 4, time: 201 })],
  };
  const sessions = { list: { getSnapshot: () => summaries, subscribe: () => () => {} } };
  const connection = {
    api: {
      sessions: {
        async history(payload) {
          calls.push(payload);
          return { result: { ok: true, value: { events: histories[payload.sessionId], hasMore: false } } };
        },
      },
    },
  };
  const ctx = {
    get(name) { return name === "connection" ? connection : sessions; },
    effect(setup) { this.cleanup = setup(); },
  };
  try {
    installThreadMagazineBridge(ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(calls.map(({ sessionId }) => sessionId).sort(), ["thread-a", "thread-b"]);
    assert.deepEqual(published.map(({ title }) => title).sort(), ["Answer A", "Answer B"]);
    assert.deepEqual(Object.keys(connection.api.sessions), ["history"]);
  } finally {
    ctx.cleanup?.();
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, "window", originalWindow);
    if (originalCustomEvent === undefined) delete globalThis.CustomEvent;
    else Object.defineProperty(globalThis, "CustomEvent", originalCustomEvent);
  }
});
