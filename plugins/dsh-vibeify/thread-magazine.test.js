import test from "node:test";
import assert from "node:assert/strict";

import {
  completedHistoryMagazineChunks,
  installThreadMagazineBridge,
  readCompleteSessionHistory,
  sessionAllowsLiveMagazine,
  sessionNeedsMagazineScan,
} from "./client-src/experience/thread-magazine.js";
import { VIBE_CHAT_RESULT_EVENT, VIBE_STREAM_CHUNKS_EVENT } from "./client-src/experience/vibe-result.js";
import { BACKGROUND_SESSION_KEY } from "./client-src/experience/background-session.js";
import { UPDATE_SESSION_KEY } from "./client-src/experience/update-session.js";

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

test("completed Chat reasoning restores every closed music Vibe instead of only the short final answer", () => {
  const entries = [
    message({
      seq: 20,
      time: 700,
      id: "music-stream",
      content: [{
        type: "reasoning",
        text: [
          '<vibe-chunk id="chat-music-first" kind="music" title="First song">Play [the first song](https://soundcloud.com/example/first).</vibe-chunk>',
          '<vibe-chunk id="chat-music-second" kind="music" title="Second song">Play [the second song](https://soundcloud.com/example/second).</vibe-chunk>',
        ].join("\n"),
      }],
    }),
    message({ seq: 21, time: 710, step: 2, id: "music-final", content: [{ type: "text", text: "Both music cards are now in Vibe." }] }),
    turnEnd({ seq: 22, time: 711 }),
  ];
  const chunks = completedHistoryMagazineChunks("reader-session", entries);
  assert.deepEqual(chunks.map(({ id, kind, title }) => ({ id, kind, title })), [
    { id: "stream:chat-music-first", kind: "music", title: "First song" },
    { id: "stream:chat-music-second", kind: "music", title: "Second song" },
  ]);
  assert.match(chunks[0].markdown, /https:\/\/soundcloud\.com\/example\/first/);
  assert.doesNotMatch(JSON.stringify(chunks), /Both music cards/);
});

test("a dedicated update without a closed chunk never becomes a raw Chat article", () => {
  const entries = [
    message({ seq: 11, time: 510, id: "update-final", content: [{ type: "text", text: "Update `refill-one` completed with worker evidence." }] }),
    turnEnd({ seq: 12, time: 511 }),
  ];
  assert.deepEqual(completedHistoryMagazineChunks("update-session", entries, { allowChatFallback: false }), []);
});

test("only idle non-blank sessions with new durable activity are scanned", () => {
  const scanned = new Map([["same", 20]]);
  assert.equal(sessionNeedsMagazineScan({ id: "running", running: true, blank: false, updatedAt: 30 }, scanned), false);
  assert.equal(sessionNeedsMagazineScan({ id: "blank", running: false, blank: true, updatedAt: 30 }, scanned), false);
  assert.equal(sessionNeedsMagazineScan({ id: "same", running: false, blank: false, updatedAt: 20 }, scanned), false);
  assert.equal(sessionNeedsMagazineScan({ id: "worker", origin: "subagent", running: false, blank: false, updatedAt: 30 }, scanned), false);
  assert.equal(sessionNeedsMagazineScan({ id: "fresh", running: false, blank: false, updatedAt: 30 }, scanned), true);
});

test("live magazine streaming accepts only ordinary reader sessions", () => {
  const values = new Map([
    [BACKGROUND_SESSION_KEY, "background-session"],
    [UPDATE_SESSION_KEY, "update-session"],
  ]);
  const storage = { getItem(key) { return values.get(key) ?? null; } };
  assert.equal(sessionAllowsLiveMagazine({ id: "reader-session", title: "A reader request", blank: false }, storage), true);
  assert.equal(sessionAllowsLiveMagazine({ id: "worker-session", origin: "subagent", blank: false }, storage), false);
  assert.equal(sessionAllowsLiveMagazine({ id: "background-session", title: "VIBE background editor", blank: false }, storage), false);
  assert.equal(sessionAllowsLiveMagazine({ id: "update-session", title: "VIBE magazine updates", blank: false }, storage), false);
  assert.equal(sessionAllowsLiveMagazine({ id: "blank-session", blank: true }, storage), false);
});

test("the shared magazine receives a closed Chat chunk while that reader turn is still running", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalCustomEvent = Object.getOwnPropertyDescriptor(globalThis, "CustomEvent");
  const originalWebSocket = Object.getOwnPropertyDescriptor(globalThis, "WebSocket");
  class FakeCustomEvent extends Event {
    constructor(type, options = {}) { super(type); this.detail = options.detail; }
  }
  class FakeWebSocket extends EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    constructor() {
      super();
      this.readyState = FakeWebSocket.OPEN;
      FakeWebSocket.instance = this;
      queueMicrotask(() => this.dispatchEvent(new Event("open")));
    }
    emit(payload) {
      const event = new Event("message");
      Object.defineProperty(event, "data", { value: JSON.stringify({ payload }) });
      this.dispatchEvent(event);
    }
    close() { this.readyState = 3; this.dispatchEvent(new Event("close")); }
  }
  const values = new Map([
    [BACKGROUND_SESSION_KEY, "background-session"],
    [UPDATE_SESSION_KEY, "update-session"],
  ]);
  const browserWindow = new EventTarget();
  browserWindow.location = { origin: "http://127.0.0.1:3080" };
  browserWindow.setTimeout = setTimeout;
  browserWindow.clearTimeout = clearTimeout;
  browserWindow.localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: browserWindow });
  Object.defineProperty(globalThis, "CustomEvent", { configurable: true, writable: true, value: FakeCustomEvent });
  Object.defineProperty(globalThis, "WebSocket", { configurable: true, writable: true, value: FakeWebSocket });
  const summaries = {
    ids: ["reader-session", "worker-session", "background-session", "update-session"],
    byId: {
      "reader-session": { id: "reader-session", title: "A reader request", running: true, blank: false, updatedAt: 10 },
      "worker-session": { id: "worker-session", origin: "subagent", running: true, blank: false, updatedAt: 20 },
      "background-session": { id: "background-session", title: "VIBE background editor", running: true, blank: false, updatedAt: 30 },
      "update-session": { id: "update-session", title: "VIBE magazine updates", running: true, blank: false, updatedAt: 40 },
    },
  };
  const sessions = { list: { getSnapshot: () => summaries, subscribe: () => () => {} } };
  const connection = { api: { sessions: { async history() { assert.fail("running sessions must not be history-scanned"); } } } };
  const ctx = {
    get(name) { return name === "connection" ? connection : sessions; },
    effect(setup) { this.cleanup = setup(); },
  };
  const published = [];
  browserWindow.addEventListener(VIBE_STREAM_CHUNKS_EVENT, (event) => published.push(...event.detail.chunks));
  try {
    installThreadMagazineBridge(ctx);
    await new Promise(queueMicrotask);
    FakeWebSocket.instance.emit({
      type: "session/event",
      sessionId: "reader-session",
      event: { type: "assistant/chunk", data: { chunk: { type: "reasoning-delta", index: 0, text: '<vibe-chunk id="chat-jason-first" kind="article" title="First Jason article">Ready now.</vibe-chunk>' } } },
    });
    FakeWebSocket.instance.emit({
      type: "session/event",
      sessionId: "worker-session",
      event: { type: "assistant/chunk", data: { chunk: { type: "reasoning-delta", index: 0, text: '<vibe-chunk id="chat-worker" kind="article" title="Worker">Never.</vibe-chunk>' } } },
    });
    assert.deepEqual(published.map(({ title }) => title), ["First Jason article"]);
  } finally {
    ctx.cleanup?.();
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, "window", originalWindow);
    if (originalCustomEvent === undefined) delete globalThis.CustomEvent;
    else Object.defineProperty(globalThis, "CustomEvent", originalCustomEvent);
    if (originalWebSocket === undefined) delete globalThis.WebSocket;
    else Object.defineProperty(globalThis, "WebSocket", originalWebSocket);
  }
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
    ids: ["thread-a", "thread-b", "still-running", "worker"],
    byId: {
      "thread-a": { id: "thread-a", running: false, blank: false, updatedAt: 10 },
      "thread-b": { id: "thread-b", running: false, blank: false, updatedAt: 20 },
      "still-running": { id: "still-running", running: true, blank: false, updatedAt: 30 },
      worker: { id: "worker", origin: "subagent", running: false, blank: false, updatedAt: 40 },
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

test("the hidden background editor is never scanned into the visible magazine", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalCustomEvent = Object.getOwnPropertyDescriptor(globalThis, "CustomEvent");
  class FakeCustomEvent extends Event {
    constructor(type, options = {}) { super(type); this.detail = options.detail; }
  }
  const values = new Map([[BACKGROUND_SESSION_KEY, "background-session"]]);
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
    ids: ["reader-session", "background-session", "background-by-title"],
    byId: {
      "reader-session": { id: "reader-session", title: "A reader question", running: false, blank: false, updatedAt: 10 },
      "background-session": { id: "background-session", title: "VIBE background editor", running: false, blank: false, updatedAt: 20 },
      "background-by-title": { id: "background-by-title", title: "VIBE background editor", running: false, blank: false, updatedAt: 30 },
    },
  };
  const histories = {
    "reader-session": [message({ seq: 1, time: 100, id: "reader", content: [{ type: "text", text: "## A finished reader answer\n\nUseful copy." }] }), turnEnd({ seq: 2, time: 101 })],
    "background-session": [message({ seq: 3, time: 200, id: "reserve", content: [{ type: "text", text: '<vibe-chunk id="reserve-leak" kind="article" title="Hidden reserve">Never show this directly.</vibe-chunk>' }] }), turnEnd({ seq: 4, time: 201 })],
    "background-by-title": [message({ seq: 5, time: 300, id: "reserve-title", content: [{ type: "text", text: "Content note:\n<vibe-chunk id=\"broken\">" }] }), turnEnd({ seq: 6, time: 301 })],
  };
  const sessions = { list: { getSnapshot: () => summaries, subscribe: () => () => {} } };
  const connection = { api: { sessions: { async history(payload) {
    calls.push(payload);
    return { result: { ok: true, value: { events: histories[payload.sessionId], hasMore: false } } };
  } } } };
  const ctx = {
    get(name) { return name === "connection" ? connection : sessions; },
    effect(setup) { this.cleanup = setup(); },
  };
  try {
    installThreadMagazineBridge(ctx);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(calls.map(({ sessionId }) => sessionId), ["reader-session"]);
    assert.deepEqual(published.map(({ title }) => title), ["A finished reader answer"]);
  } finally {
    ctx.cleanup?.();
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, "window", originalWindow);
    if (originalCustomEvent === undefined) delete globalThis.CustomEvent;
    else Object.defineProperty(globalThis, "CustomEvent", originalCustomEvent);
  }
});
