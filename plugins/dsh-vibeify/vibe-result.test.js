import test from "node:test";
import assert from "node:assert/strict";

import {
  chunkBelongsToPublication,
  collapseCompletedThinking,
  completedAnswer,
  createChatResultChunk,
  extractPublishedChunks,
  installVibeStreamBridge,
  isAssistantAnswer,
  isNativeResultTabList,
  markdownTableAt,
  markdownHasTable,
  stripDuplicatedLeadTitle,
  namespaceStreamChunks,
  VIBE_CHAT_RESULT_EVENT,
} from "./client-src/experience/vibe-result.js";

function textNode(text) {
  return { nodeType: 3, textContent: text };
}

function element(tagName, children = [], attributes = {}) {
  const node = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    childNodes: children,
    textContent: children.map((child) => child.textContent ?? "").join(""),
    getAttribute(name) { return attributes[name] ?? null; },
    querySelectorAll(selector) {
      const names = new Set(selector.split(",").map((part) => part.trim().replace(/\[.*$/, "").toUpperCase()));
      const matches = [];
      const visit = (candidate) => {
        if (candidate?.tagName !== undefined && names.has(candidate.tagName)) matches.push(candidate);
        for (const child of candidate?.childNodes ?? []) visit(child);
      };
      for (const child of children) visit(child);
      return matches;
    },
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; },
  };
  return node;
}

test("only complete closed Vibe chunks become feed content", () => {
  const text = [
    "Ordinary work progress.",
    '<vibe-chunk id="run-opening" kind="editorial" title="An editor\'s useful beginning">Ready to read.</vibe-chunk>',
    '<vibe-chunk id="run-watch" kind="video" title="Worth watching">[A credited film](https://example.com)</vibe-chunk>',
    '<vibe-chunk id="unfinished" kind="article" title="Not ready">Do not publish this yet',
  ].join("\n");
  assert.deepEqual(extractPublishedChunks(text), [
    { id: "run-opening", kind: "editorial", title: "An editor's useful beginning", markdown: "Ready to read." },
    { id: "run-watch", kind: "video", title: "Worth watching", markdown: "[A credited film](https://example.com)" },
  ]);
});

test("malformed generated questionnaires cannot enter the feed", () => {
  const text = [
    '<vibe-chunk id="run-broken-question" kind="questionnaire" title="A broken question">![A studio](https://example.com/studio.jpg)\n\nPick the third answer.\n\n- Which one?\n- Another?</vibe-chunk>',
    '<vibe-chunk id="run-useful-question" kind="questionnaire" title="Choose the next edit">Choose what the editor should explore next.\n\n- More tiny filmmaking projects\n- More constrained writing ideas</vibe-chunk>',
  ].join("\n");
  assert.deepEqual(extractPublishedChunks(text), [{
    id: "run-useful-question",
    kind: "questionnaire",
    title: "Choose the next edit",
    markdown: "Choose what the editor should explore next.\n\n- More tiny filmmaking projects\n- More constrained writing ideas",
  }]);
});

test("direct Chat publication accepts only explicit chat ids and refill publication stays run-scoped", () => {
  assert.equal(chunkBelongsToPublication(null, "chat-free-webcomics"), true);
  assert.equal(chunkBelongsToPublication(null, "tool-output"), false);
  assert.equal(chunkBelongsToPublication("refill-one", "refill-one-opening"), true);
  assert.equal(chunkBelongsToPublication("refill-one", "refill-two-opening"), false);
});

test("legacy closed section envelopes remain readable during migration", () => {
  assert.deepEqual(extractPublishedChunks('<vibe-section id="hero"># A previous page\n\nStill useful.</vibe-section>'), [
    { id: "hero", kind: "article", title: "A previous page", markdown: "# A previous page\n\nStill useful." },
  ]);
});

test("run namespacing makes repeated semantic ids append instead of replace", () => {
  const source = [{ id: "opening", kind: "article", title: "Opening", markdown: "First" }];
  const first = namespaceStreamChunks("refill-a", source, 1000)[0];
  const second = namespaceStreamChunks("refill-b", source, 2000)[0];
  assert.notEqual(first.id, second.id);
  assert.equal(first.markdown, "First");
  assert.equal(second.markdown, "First");
  assert.deepEqual([first.publishedAt, second.publishedAt], [1000, 2000]);
});

test("the Vibe return control only attaches inside the native Chat surface", () => {
  const tabList = (labels) => ({
    querySelectorAll() { return labels.map((text) => ({ textContent: text })); },
  });
  assert.equal(isNativeResultTabList(tabList(["Chat", "Trajectory"])), true);
  assert.equal(isNativeResultTabList(tabList(["Home", "Saved"])), false);
  assert.equal(isNativeResultTabList(tabList(["Chat", "Vibe"])), false);
});

test("a rendered answer can become a sanitized Vibe page without storing its prompt", () => {
  const greeting = element("div", [element("p", [textNode("Hello! What would you like to work on?")])]);
  const webcomics = element("div", [
    textNode("\n    "),
    element("p", [textNode("Assuming you meant "), element("strong", [textNode("webcomics")]), textNode(", these are legal and free:")]),
    textNode("\n    "),
    element("ul", [
      element("li", [element("a", [textNode("WEBTOON")], { href: "https://www.webtoons.com/en/" }), textNode(" — fantasy and action.")]),
      element("li", [element("a", [textNode("Tapas")], { href: "https://tapas.io/collection/free-to-read" }), textNode(" — independent comics.")]),
    ]),
    textNode("\n  "),
  ]);

  assert.equal(createChatResultChunk(greeting, 1_700_000_000_000)?.markdown, "Hello! What would you like to work on?");
  assert.deepEqual(createChatResultChunk(webcomics, 1_700_000_000_000), {
    id: "chat-result-loyw3v28",
    kind: "recommendation",
    source: "chat-directed",
    title: "Webcomics",
    markdown: "Assuming you meant **webcomics**, these are legal and free:\n\n- [WEBTOON](https://www.webtoons.com/en/) — fantasy and action.\n- [Tapas](https://tapas.io/collection/free-to-read) — independent comics.",
    topicId: null,
    publishedAt: 1_700_000_000_000,
  });
});

test("a card title is not repeated as the first heading in its body", () => {
  assert.equal(stripDuplicatedLeadTitle("## A finished guide\n\nUseful copy.", "A finished guide"), "Useful copy.");
  assert.equal(stripDuplicatedLeadTitle("**A finished guide**\n\nUseful copy.", "A finished guide"), "Useful copy.");
  assert.equal(stripDuplicatedLeadTitle("## A different heading\n\nUseful copy.", "A finished guide"), "## A different heading\n\nUseful copy.");
});

test("pipe tables are recognised as structured rows rather than one raw paragraph", () => {
  assert.deepEqual(markdownTableAt([
    "| Week | Focus |",
    "| --- | :--- |",
    "| 1 | Voice |",
    "| 2 | Language |",
    "",
  ], 0), {
    headers: ["Week", "Focus"],
    rows: [["1", "Voice"], ["2", "Language"]],
    nextIndex: 4,
  });
  assert.equal(markdownTableAt(["Ordinary | prose"], 0), null);
  assert.equal(markdownHasTable("Intro\n\n| Week | Focus |\n| --- | --- |\n| 1 | Voice |"), true);
  assert.equal(markdownHasTable("Ordinary | prose"), false);
});

test("explicit user-role rows are rejected even when they contain a Copy action", () => {
  const copy = { textContent: "Copy" };
  const userRow = {
    parentElement: null,
    getAttribute(name) { return name === "data-role" ? "user" : null; },
    querySelectorAll() { return [copy]; },
  };
  const assistantRow = {
    parentElement: null,
    getAttribute(name) { return name === "data-role" ? "assistant" : null; },
    querySelectorAll() { return [copy]; },
  };
  assert.equal(isAssistantAnswer(userRow), false);
  assert.equal(isAssistantAnswer(assistantRow), true);
});

function installVibeBridgeBrowser(answerNodes) {
  const originals = new Map();
  const remember = (name, value) => {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };
  class FakeElement {}
  class FakeButton extends FakeElement {}
  class FakeCustomEvent extends Event {
    constructor(type, options = {}) { super(type); this.detail = options.detail; }
  }
  let observerCallback;
  class FakeMutationObserver {
    constructor(callback) { observerCallback = callback; }
    observe() {}
    disconnect() {}
  }
  const browserWindow = new EventTarget();
  const document = {
    body: {},
    getElementById() { return null; },
    querySelectorAll(selector) {
      if (selector === 'div[class*="_markdown_"]') return answerNodes;
      return [];
    },
  };
  let frame = 0;
  remember("HTMLElement", FakeElement);
  remember("HTMLButtonElement", FakeButton);
  remember("CustomEvent", FakeCustomEvent);
  remember("MutationObserver", FakeMutationObserver);
  remember("requestAnimationFrame", (callback) => { const id = ++frame; queueMicrotask(callback); return id; });
  remember("cancelAnimationFrame", () => {});
  remember("window", browserWindow);
  remember("document", document);
  return {
    FakeElement,
    window: browserWindow,
    mutate() { observerCallback?.([], null); },
    restore() {
      for (const [name, descriptor] of originals) {
        if (descriptor === undefined) delete globalThis[name];
        else Object.defineProperty(globalThis, name, descriptor);
      }
    },
  };
}

function currentHostAnswer(environment, markdown) {
  const copy = {
    textContent: "",
    getAttribute(name) { return name === "aria-label" ? "Copy" : null; },
  };
  const tail = Object.assign(new environment.FakeElement(), {
    nextElementSibling: null,
    getAttribute(name) { return name === "data-chat-flow-kind" ? "turn-tail" : null; },
    querySelectorAll(selector) { return selector === "button" ? [copy] : []; },
  });
  const row = Object.assign(new environment.FakeElement(), {
    nextElementSibling: tail,
    getAttribute(name) { return name === "data-chat-flow-kind" ? "assistant-step" : null; },
  });
  markdown.parentElement = row;
  markdown.closest = (selector) => {
    if (selector === '[data-variant="think"]') return null;
    if (selector === '[data-chat-flow-kind="assistant-step"]' || selector === "[data-chat-flow-kind]") return row;
    return null;
  };
  return markdown;
}

test("the current DSH icon-only Copy action marks only its own closing assistant as complete", () => {
  const environment = installVibeBridgeBrowser([]);
  const answer = currentHostAnswer(environment, element("div", [element("p", [textNode("A settled answer")])]));
  assert.equal(completedAnswer(answer), true);
  assert.equal(isAssistantAnswer(answer), true);
  environment.restore();
});

test("thinking opened by Vibeify closes once when its assistant turn completes", () => {
  const environment = installVibeBridgeBrowser([]);
  let clicks = 0;
  const toggle = Object.assign(new environment.FakeElement(), {
    getAttribute(name) { return name === "aria-expanded" ? "true" : null; },
    click() { clicks += 1; },
  });
  const copy = {
    textContent: "",
    getAttribute(name) { return name === "aria-label" ? "Copy" : null; },
  };
  const tail = Object.assign(new environment.FakeElement(), {
    nextElementSibling: null,
    getAttribute(name) { return name === "data-chat-flow-kind" ? "turn-tail" : null; },
    querySelectorAll(selector) { return selector === "button" ? [copy] : []; },
  });
  const row = Object.assign(new environment.FakeElement(), {
    dataset: { codexProgressOpened: "true" },
    nextElementSibling: tail,
    getAttribute(name) { return name === "data-chat-flow-kind" ? "assistant-step" : null; },
    querySelector() { return toggle; },
    closest(selector) { return selector === '[data-chat-flow-kind="assistant-step"]' ? this : null; },
  });

  assert.equal(collapseCompletedThinking(row), true);
  assert.equal(clicks, 1);
  assert.equal(row.dataset.codexProgressAutoCollapsed, "true");
  assert.equal(collapseCompletedThinking(row), false);
  assert.equal(clicks, 1);
  environment.restore();
});

test("thinking stays open until completion and manually opened panels are left alone", () => {
  const environment = installVibeBridgeBrowser([]);
  const toggle = Object.assign(new environment.FakeElement(), {
    getAttribute(name) { return name === "aria-expanded" ? "true" : null; },
    click() { assert.fail("an unsettled or manually opened panel must not be closed"); },
  });
  const row = Object.assign(new environment.FakeElement(), {
    dataset: { codexProgressOpened: "true" },
    nextElementSibling: null,
    querySelector() { return toggle; },
    closest(selector) { return selector === '[data-chat-flow-kind="assistant-step"]' ? this : null; },
  });
  assert.equal(collapseCompletedThinking(row), false);
  delete row.dataset.codexProgressOpened;
  assert.equal(collapseCompletedThinking(row), false);
  environment.restore();
});

test("DOM mutations never publish duplicate or incomplete Chat content into Vibe", async () => {
  const answers = [];
  const environment = installVibeBridgeBrowser(answers);
  let cleanup;
  let published;
  environment.window.addEventListener(VIBE_CHAT_RESULT_EVENT, (event) => { published = event.detail.chunk; });
  installVibeStreamBridge({ effect(setup) { cleanup = setup(); } });
  await new Promise(queueMicrotask);

  answers.push(currentHostAnswer(environment, element("div", [
    element("h2", [textNode("Frederick Road")]),
    element("p", [textNode("A local history story ready for Vibe.")]),
  ])));
  environment.mutate();
  await new Promise(queueMicrotask);

  assert.equal(published, undefined);
  cleanup();
  environment.restore();
});

test("completed technical Chat answers are eligible after completion and retain only rendered presentation fields", () => {
  const technical = element("div", [
    element("h2", [textNode("Build fixed")]),
    element("p", [textNode("The parser now keeps the existing API and the focused tests pass.")]),
  ]);
  const chunk = createChatResultChunk(technical, 1_700_000_000_001);
  assert.equal(chunk.source, "chat-directed");
  assert.equal(chunk.title, "Build fixed");
  assert.match(chunk.markdown, /parser now keeps the existing API/);
  assert.deepEqual(Object.keys(chunk).sort(), ["id", "kind", "markdown", "publishedAt", "source", "title", "topicId"]);
});
