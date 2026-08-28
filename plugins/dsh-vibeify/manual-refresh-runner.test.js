import test from "node:test";
import assert from "node:assert/strict";

import {
  RECIPE_RUN_EVENT,
  RECIPE_STATUS_EVENT,
  RECIPE_STOP_EVENT,
  installRecipeRunner,
} from "./client-src/experience/recipe-runner.js";

function installRunnerBrowser() {
  const originals = new Map();
  const remember = (name, value) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };
  class FakeCustomEvent extends Event {
    constructor(type, options = {}) { super(type); this.detail = options.detail; }
  }
  const values = new Map();
  const browserWindow = new EventTarget();
  browserWindow.localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  let timer = null;
  browserWindow.setTimeout = (callback) => { timer = callback; return 1; };
  browserWindow.clearTimeout = () => { timer = null; };
  remember("CustomEvent", FakeCustomEvent);
  remember("window", browserWindow);
  return {
    window: browserWindow,
    fireTimer() { const callback = timer; timer = null; callback?.(); },
    restore() {
      for (const [name, descriptor] of originals) {
        if (descriptor === undefined) delete globalThis[name];
        else Object.defineProperty(globalThis, name, descriptor);
      }
    },
  };
}

function waitForState(browserWindow, expected) {
  return new Promise((resolve) => {
    const listener = (event) => {
      if (event.detail?.state !== expected) return;
      browserWindow.removeEventListener(RECIPE_STATUS_EVENT, listener);
      resolve(event.detail);
    };
    browserWindow.addEventListener(RECIPE_STATUS_EVENT, listener);
  });
}

function runtime() {
  let snapshot = {
    current: "current-session",
    ids: ["current-session"],
    byId: {
      "current-session": { id: "current-session", cwd: "/project", agentPreset: "chatgpt-agent", running: false, blank: false, updatedAt: 1 },
    },
  };
  const listeners = new Set();
  const calls = [];
  let historyEnd = null;
  const api = {
    sessions: {
      async create(payload) {
        calls.push(["create", payload]);
        return { result: { ok: true, value: { sessionId: "magazine-session", agentPreset: payload.agentPreset } } };
      },
      async rename(payload) {
        calls.push(["rename", payload]);
        return { result: { ok: true, value: { title: payload.title, seq: 1 } } };
      },
      async prompt(payload) {
        calls.push(["prompt", payload]);
        return { result: { ok: true, value: { accepted: true } } };
      },
      async cancel(payload) {
        calls.push(["cancel", payload]);
        return { result: { ok: true, value: { accepted: true } } };
      },
      async history(payload) {
        calls.push(["history", payload]);
        const events = historyEnd === null ? [] : [{ event: historyEnd }];
        return { result: { ok: true, value: { events, hasMore: false } } };
      },
    },
  };
  const sessions = {
    list: {
      getSnapshot() { return snapshot; },
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    },
  };
  return {
    calls,
    ctx: {
      get(name) { return name === "connection" ? { api } : sessions; },
      effect(setup) { this.cleanup = setup(); },
    },
    setSummary(summary, { turnEnd = true } = {}) {
      if (turnEnd && summary.id === "magazine-session" && summary.running === false && summary.updatedAt > 1) {
        historyEnd = { type: "turn/end", seq: summary.updatedAt, time: summary.updatedAt, data: { turn: 1, reason: { kind: "completed" } } };
      }
      snapshot = { ...snapshot, ids: [...new Set([...snapshot.ids, summary.id])], byId: { ...snapshot.byId, [summary.id]: summary } };
      for (const listener of listeners) listener();
    },
  };
}

const recipe = Object.freeze({
  id: "manual-one",
  title: "VIBE magazine update",
  prompt: "x".repeat(2000),
  mode: "manual-stream-update",
});

test("one explicit update creates and prompts one dedicated session without opening it", async () => {
  const browser = installRunnerBrowser();
  const host = runtime();
  installRecipeRunner(host.ctx);
  const submitted = waitForState(browser.window, "submitted");
  browser.window.dispatchEvent(new CustomEvent(RECIPE_RUN_EVENT, { detail: recipe }));
  assert.equal((await submitted).sessionId, "magazine-session");
  assert.deepEqual(host.calls.map(([name]) => name), ["create", "rename", "history", "prompt"]);
  assert.equal(host.calls.find(([name]) => name === "prompt")[1].mode, "queue");
  assert.equal(host.calls.find(([name]) => name === "prompt")[1].content[0].text, recipe.prompt);
  host.ctx.cleanup();
  browser.restore();
});

test("a second update is refused until the first completed turn becomes idle", async () => {
  const browser = installRunnerBrowser();
  const host = runtime();
  installRecipeRunner(host.ctx);
  const submitted = waitForState(browser.window, "submitted");
  browser.window.dispatchEvent(new CustomEvent(RECIPE_RUN_EVENT, { detail: recipe }));
  await submitted;
  const busy = waitForState(browser.window, "busy");
  browser.window.dispatchEvent(new CustomEvent(RECIPE_RUN_EVENT, { detail: { ...recipe, id: "manual-two" } }));
  await busy;
  assert.equal(host.calls.filter(([name]) => name === "prompt").length, 1);

  host.setSummary({ id: "magazine-session", running: true, blank: false, updatedAt: 2 });
  const complete = waitForState(browser.window, "complete");
  host.setSummary({ id: "magazine-session", running: false, blank: false, updatedAt: 3 });
  assert.equal((await complete).id, "manual-one");
  assert.equal(host.calls.filter(([name]) => name === "prompt").length, 1);
  host.ctx.cleanup();
  browser.restore();
});

test("a very fast update completes from new durable activity even if running state was missed", async () => {
  const browser = installRunnerBrowser();
  const host = runtime();
  installRecipeRunner(host.ctx);
  const submitted = waitForState(browser.window, "submitted");
  browser.window.dispatchEvent(new CustomEvent(RECIPE_RUN_EVENT, { detail: recipe }));
  await submitted;
  const complete = waitForState(browser.window, "complete");
  host.setSummary({ id: "magazine-session", running: false, blank: false, updatedAt: 2 });
  assert.equal((await complete).id, "manual-one");
  host.ctx.cleanup();
  browser.restore();
});

test("a prompt timestamp alone is not mistaken for a completed answer", async () => {
  const browser = installRunnerBrowser();
  const host = runtime();
  installRecipeRunner(host.ctx);
  let completed = false;
  browser.window.addEventListener(RECIPE_STATUS_EVENT, (event) => {
    if (event.detail?.state === "complete") completed = true;
  });
  const submitted = waitForState(browser.window, "submitted");
  browser.window.dispatchEvent(new CustomEvent(RECIPE_RUN_EVENT, { detail: recipe }));
  await submitted;
  host.setSummary({ id: "magazine-session", running: false, blank: false, updatedAt: 2 }, { turnEnd: false });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(completed, false);
  const stopped = waitForState(browser.window, "stopped");
  browser.window.dispatchEvent(new CustomEvent(RECIPE_STOP_EVENT, { detail: { id: "manual-one" } }));
  await stopped;
  host.ctx.cleanup();
  browser.restore();
});

test("Stop cancels only the dedicated active magazine session", async () => {
  const browser = installRunnerBrowser();
  const host = runtime();
  installRecipeRunner(host.ctx);
  const submitted = waitForState(browser.window, "submitted");
  browser.window.dispatchEvent(new CustomEvent(RECIPE_RUN_EVENT, { detail: recipe }));
  await submitted;
  const stopped = waitForState(browser.window, "stopped");
  browser.window.dispatchEvent(new CustomEvent(RECIPE_STOP_EVENT, { detail: { id: "manual-one" } }));
  assert.equal((await stopped).sessionId, "magazine-session");
  assert.deepEqual(host.calls.filter(([name]) => name === "cancel")[0], ["cancel", { sessionId: "magazine-session" }]);
  host.ctx.cleanup();
  browser.restore();
});

test("a stuck magazine update is cancelled when its bounded timeout expires", async () => {
  const browser = installRunnerBrowser();
  const host = runtime();
  installRecipeRunner(host.ctx);
  const submitted = waitForState(browser.window, "submitted");
  browser.window.dispatchEvent(new CustomEvent(RECIPE_RUN_EVENT, { detail: recipe }));
  await submitted;
  const timedOut = waitForState(browser.window, "timed-out");
  browser.fireTimer();
  assert.equal((await timedOut).sessionId, "magazine-session");
  assert.deepEqual(host.calls.filter(([name]) => name === "cancel")[0], ["cancel", { sessionId: "magazine-session" }]);
  host.ctx.cleanup();
  browser.restore();
});
