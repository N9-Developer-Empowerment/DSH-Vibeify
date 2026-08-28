import test from "node:test";
import assert from "node:assert/strict";

import { createExperienceCatalog } from "./client-src/experience/catalog.js";
import { CONTENT_RECIPES } from "./client-src/experience/recipes.js";
import { buildContinuousStreamPrompt } from "./client-src/experience/stream-recipe.js";
import { createRecipeEnvelope, createStreamEnvelope, installRecipeRunner, RECIPE_RUN_EVENT, RECIPE_STATUS_EVENT } from "./client-src/experience/recipe-runner.js";

function installFakeBrowser(document) {
  const originals = new Map();
  const remember = (name, value) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };

  class FakeElement {
    constructor(text = "") { this.textContent = text; }
    getClientRects() { return [1]; }
    dispatchEvent() { return true; }
    focus() { this.focused = true; }
  }
  class FakeButton extends FakeElement {
    constructor(onClick = () => {}) { super(); this.disabled = false; this.onClick = onClick; }
    click() { this.onClick(); }
  }
  class FakeTextArea extends FakeElement {
    constructor(order) { super(); this._value = ""; this.order = order; this.seat = null; }
    get value() { return this._value; }
    set value(value) { this._value = value; this.order.push("fill"); }
    closest() { return this.seat; }
    dispatchEvent(event) { this.order.push(event.type); return true; }
  }
  class FakeCustomEvent extends Event {
    constructor(type, options = {}) { super(type); this.detail = options.detail; }
  }

  const browserWindow = new EventTarget();
  browserWindow.setTimeout = (callback) => { queueMicrotask(callback); return 1; };
  remember("HTMLElement", FakeElement);
  remember("HTMLButtonElement", FakeButton);
  remember("HTMLTextAreaElement", FakeTextArea);
  remember("InputEvent", Event);
  remember("CustomEvent", FakeCustomEvent);
  remember("window", browserWindow);
  remember("document", document);

  return {
    FakeElement,
    FakeButton,
    FakeTextArea,
    window: browserWindow,
    restore() {
      for (const [name, descriptor] of originals) {
        if (descriptor === undefined) delete globalThis[name];
        else Object.defineProperty(globalThis, name, descriptor);
      }
    },
  };
}

function waitForRecipeState(browserWindow, expected) {
  return new Promise((resolve) => {
    const listener = (event) => {
      if (event.detail?.state !== expected) return;
      browserWindow.removeEventListener(RECIPE_STATUS_EVENT, listener);
      resolve(event.detail);
    };
    browserWindow.addEventListener(RECIPE_STATUS_EVENT, listener);
  });
}

test("one-click runner receives a complete immutable recipe envelope", () => {
  const episode = { ...createExperienceCatalog().byId["mirror-minute"], studioPrompt: CONTENT_RECIPES.skincare.prompt };
  const envelope = createRecipeEnvelope(episode);
  assert.deepEqual(Object.keys(envelope), ["id", "title", "prompt", "preview", "preferences"]);
  assert.equal(envelope.id, "mirror-minute");
  assert.equal(envelope.title, "Skin Care, Beautifully Sorted");
  assert.ok(envelope.prompt.length >= 1800);
  assert.equal(envelope.preview.description, episode.description);
  assert.deepEqual(envelope.preview.features, episode.resultFeatures);
  assert.equal(Object.isFrozen(envelope), true);
});

test("stored preference labels shape a later refresh without blocking the first edition", () => {
  const episode = { ...createExperienceCatalog().byId["neon-rain"], studioPrompt: CONTENT_RECIPES.anime.prompt };
  const envelope = createRecipeEnvelope(episode, ["  Short episodes ", "Dreamy", "Dreamy"]);
  assert.deepEqual(envelope.preferences, ["Short episodes", "Dreamy"]);
  assert.match(envelope.prompt, /User-selected refresh priorities/);
  assert.match(envelope.prompt, /Short episodes, Dreamy/);
});

test("runner rejects a shallow prompt before touching the DSH composer", () => {
  assert.throws(() => createRecipeEnvelope({ id: "x", title: "x", studioPrompt: "write something" }), /not detailed enough/);
});

test("continuous refill envelope is automatic, immutable and shaped by earlier questionnaire content", () => {
  const prompt = buildContinuousStreamPrompt({
    runId: "refill-one",
    batchSize: 8,
    answerLabels: ["  More original creators ", "A deeper read", "A deeper read"],
    recentTitles: ["Opening page"],
    chatTopics: ["How football analytics changed scouting"],
    editorialProfile: { preset: "machines" },
  });
  const envelope = createStreamEnvelope({ id: "refill-one", prompt, batchSize: 8, answerLabels: ["More original creators", "A deeper read"] });
  assert.equal(envelope.mode, "continuous-stream");
  assert.equal(envelope.batchSize, 8);
  assert.deepEqual(envelope.answers, ["More original creators", "A deeper read"]);
  assert.match(envelope.prompt, /append-only/i);
  assert.match(envelope.prompt, /top of that same edition/i);
  assert.match(envelope.prompt, /Football, AI & cars/i);
  assert.match(envelope.prompt, /not as evidence of identity or protected traits/i);
  assert.match(envelope.prompt, /Recent completed Chat answer topics: How football analytics changed scouting/);
  assert.match(envelope.prompt, /not a demographic profile or permission to expose the reader's prompt/);
  assert.match(envelope.prompt, /<vibe-chunk/);
  assert.match(envelope.prompt, /music or audio route/i);
  assert.match(envelope.prompt, /questionnaire/i);
  assert.match(envelope.prompt, /More original creators/);
  assert.match(envelope.prompt, /Codex remains lead/i);
  assert.equal(Object.isFrozen(envelope), true);
});

test("runner fails closed instead of submitting into the current session", async () => {
  let hostComposer;
  const environment = installFakeBrowser({
    querySelector(selector) { return selector === "[data-composer-seat]" ? hostComposer : null; },
    querySelectorAll() { return []; },
  });
  hostComposer = new environment.FakeElement();
  let cleanup;
  installRecipeRunner({ effect(setup) { cleanup = setup(); } });
  const blocked = waitForRecipeState(environment.window, "blocked");
  environment.window.dispatchEvent(new CustomEvent(RECIPE_RUN_EVENT, { detail: { id: "skin", title: "Skin", prompt: "complete recipe" } }));
  assert.equal((await blocked).id, "skin");
  cleanup();
  environment.restore();
});

test("runner opens a fresh session before filling and submitting the recipe", async () => {
  const order = [];
  let selectedSession;
  let hostComposer;
  let composer;
  let send;
  let newSession;
  const document = {
    querySelector(selector) {
      if (selector === '[role="treeitem"][aria-selected="true"]') return selectedSession;
      if (selector === "[data-composer-seat]") return hostComposer;
      if (selector.includes("textarea")) return composer;
      return null;
    },
    querySelectorAll() { return [newSession]; },
  };
  const environment = installFakeBrowser(document);
  selectedSession = new environment.FakeElement("Existing work");
  hostComposer = new environment.FakeElement();
  send = new environment.FakeButton(() => order.push("send"));
  composer = new environment.FakeTextArea(order);
  composer.seat = { querySelector() { return send; } };
  newSession = new environment.FakeButton(() => { order.push("new-session"); selectedSession = null; });
  let cleanup;
  installRecipeRunner({ effect(setup) { cleanup = setup(); } });
  const submitted = waitForRecipeState(environment.window, "submitted");
  environment.window.dispatchEvent(new CustomEvent(RECIPE_RUN_EVENT, { detail: { id: "skin", title: "Skin", prompt: "complete recipe" } }));
  assert.equal((await submitted).id, "skin");
  assert.deepEqual(order, ["new-session", "fill", "input", "change", "send"]);
  assert.equal(composer.value, "complete recipe");
  cleanup();
  environment.restore();
});
