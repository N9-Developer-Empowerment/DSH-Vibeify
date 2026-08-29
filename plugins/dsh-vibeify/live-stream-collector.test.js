import test from "node:test";
import assert from "node:assert/strict";

import {
  createLiveChunkCollector,
  extractRunChunks,
  freshStreamChunksFromEvents,
  openLiveChatChunkStream,
  openLiveChunkStream,
} from "./client-src/experience/live-stream-collector.js";

function delta(text, type = "reasoning-delta") {
  return {
    type: "session/event",
    sessionId: "magazine-session",
    event: { type: "assistant/chunk", data: { chunk: { type, index: 0, text } } },
  };
}

test("a complete Vibe envelope is released before the parent answer completes", () => {
  let time = 1_700_000_000_000;
  const collector = createLiveChunkCollector({ runId: "refill-fast", now: () => time });
  assert.deepEqual(collector.push(delta('<vibe-chunk id="refill-fast-opening" kind="editorial" title="A fast opening">Half')), []);
  time += 25;
  const ready = collector.push(delta(" a thought.</vibe-chunk>"));
  assert.equal(ready.length, 1);
  assert.deepEqual(ready[0], {
    id: "stream:refill-fast-opening",
    kind: "editorial",
    source: "fresh-stream",
    title: "A fast opening",
    markdown: "Half a thought.",
    topicId: null,
    publishedAt: time,
  });
  assert.deepEqual(collector.push(delta(" more progress")), []);
});

test("worker prose and another run can never cross the publication boundary", () => {
  const text = [
    "Worker report: three candidates and unverified notes.",
    '<vibe-chunk id="refill-other-item" kind="article" title="Wrong run">No.</vibe-chunk>',
    '<vibe-chunk id="refill-safe-item" kind="questionnaire" title="Pick one">Choose.\n\n- Short\n- Deep</vibe-chunk>',
  ].join("\n");
  assert.deepEqual(extractRunChunks(text, "refill-safe").map(({ title }) => title), ["Pick one"]);
});

test("final history is a lossless fallback when the live stream disconnects", () => {
  const entries = [{
    event: {
      type: "assistant/message",
      data: { message: { content: [{ type: "reasoning", text: '<vibe-chunk id="refill-fallback-one" kind="article" title="Recovered">Complete.</vibe-chunk>' }] } },
    },
  }];
  assert.deepEqual(freshStreamChunksFromEvents(entries, "refill-fallback", 1234).map(({ id, title }) => ({ id, title })), [
    { id: "stream:refill-fallback-one", title: "Recovered" },
  ]);
});

test("the live mux subscriber releases chunks without selecting the update session", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalWebSocket = Object.getOwnPropertyDescriptor(globalThis, "WebSocket");
  class FakeWebSocket extends EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    constructor(url) {
      super();
      this.url = String(url);
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
  const browserWindow = {
    location: { origin: "http://127.0.0.1:3080" },
    setTimeout,
    clearTimeout,
  };
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: browserWindow });
  Object.defineProperty(globalThis, "WebSocket", { configurable: true, writable: true, value: FakeWebSocket });
  const published = [];
  try {
    const live = openLiveChunkStream({ sessionId: "magazine-session", runId: "refill-live", onChunks: (chunks) => published.push(...chunks) });
    FakeWebSocket.instance.emit({ type: "session/subscribed", sessionId: "magazine-session", lastSeq: 10 });
    assert.equal(await live.ready, true);
    FakeWebSocket.instance.emit({
      type: "session/event",
      sessionId: "magazine-session",
      event: { type: "assistant/chunk", data: { chunk: { type: "reasoning-delta", index: 0, text: '<vibe-chunk id="refill-live-now" kind="image" title="Now">Ready.</vibe-chunk>' } } },
    });
    assert.deepEqual(published.map(({ title }) => title), ["Now"]);
    assert.match(FakeWebSocket.instance.url, /^ws:\/\/127\.0\.0\.1:3080\/api\/events\.mux$/);
    live.close();
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, "window", originalWindow);
    if (originalWebSocket === undefined) delete globalThis.WebSocket;
    else Object.defineProperty(globalThis, "WebSocket", originalWebSocket);
  }
});

test("ordinary Chat publishes each closed semantic chunk before its turn ends", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalWebSocket = Object.getOwnPropertyDescriptor(globalThis, "WebSocket");
  class FakeWebSocket extends EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    constructor(url) {
      super();
      this.url = String(url);
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
  const browserWindow = {
    location: { origin: "http://127.0.0.1:3080" },
    setTimeout,
    clearTimeout,
  };
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: browserWindow });
  Object.defineProperty(globalThis, "WebSocket", { configurable: true, writable: true, value: FakeWebSocket });
  const published = [];
  try {
    const live = openLiveChatChunkStream({
      acceptSession: (sessionId) => sessionId === "reader-session",
      onChunks: (sessionId, chunks) => published.push({ sessionId, chunks }),
    });
    assert.equal(await live.ready, true);
    FakeWebSocket.instance.emit({
      type: "session/event",
      sessionId: "reader-session",
      event: { type: "assistant/chunk", data: { chunk: { type: "reasoning-delta", index: 0, text: '<vibe-chunk id="chat-jason-opening" kind="editorial" title="An opening">Half' } } },
    });
    assert.equal(published.length, 0);
    FakeWebSocket.instance.emit({
      type: "session/event",
      sessionId: "reader-session",
      event: { type: "assistant/chunk", data: { chunk: { type: "reasoning-delta", index: 0, text: " a page.</vibe-chunk>" } } },
    });
    FakeWebSocket.instance.emit({
      type: "session/event",
      sessionId: "worker-session",
      event: { type: "assistant/chunk", data: { chunk: { type: "reasoning-delta", index: 0, text: '<vibe-chunk id="chat-worker-report" kind="article" title="Worker">Never.</vibe-chunk>' } } },
    });
    FakeWebSocket.instance.emit({
      type: "session/event",
      sessionId: "reader-session",
      event: { type: "assistant/chunk", data: { chunk: { type: "reasoning-delta", index: 0, text: '<vibe-chunk id="refill-wrong-route" kind="article" title="Update">Never.</vibe-chunk>' } } },
    });
    FakeWebSocket.instance.emit({
      type: "session/event",
      sessionId: "reader-session",
      event: { type: "assistant/chunk", data: { chunk: { type: "reasoning-delta", index: 0, text: '<vibe-chunk id="chat-stale" kind="article" title="Stale">Old turn' } } },
    });
    FakeWebSocket.instance.emit({
      type: "session/event",
      sessionId: "reader-session",
      event: { type: "turn/end", data: { reason: "completed" } },
    });
    FakeWebSocket.instance.emit({
      type: "session/event",
      sessionId: "reader-session",
      event: { type: "assistant/chunk", data: { chunk: { type: "reasoning-delta", index: 0, text: " should not leak.</vibe-chunk>" } } },
    });
    assert.deepEqual(published.map(({ sessionId, chunks }) => ({ sessionId, titles: chunks.map(({ title }) => title) })), [
      { sessionId: "reader-session", titles: ["An opening"] },
    ]);
    live.close();
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, "window", originalWindow);
    if (originalWebSocket === undefined) delete globalThis.WebSocket;
    else Object.defineProperty(globalThis, "WebSocket", originalWebSocket);
  }
});
