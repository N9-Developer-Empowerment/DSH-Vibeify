import React from "react";
import { createRoot } from "react-dom/client";

import { registerExperienceShell } from "../client-src/experience/shell.jsx";
import { VIBE_STREAM_CHUNKS_EVENT } from "../client-src/experience/vibe-result.js";

const cleanups = [];
const root = createRoot(document.getElementById("preview-root"));
const emptySessions = {
  list: {
    getSnapshot() {
      return { current: undefined, ids: [], byId: {} };
    },
    subscribe() {
      return () => {};
    },
  },
};
const unavailableConnection = {
  api: {
    sessions: {
      async create() { return { result: { ok: false } }; },
      async history() { return { result: { ok: false } }; },
      async cancel() { return { result: { ok: false } }; },
      async prompt() { return { result: { ok: false } }; },
      async rename() { return { result: { ok: false } }; },
    },
  },
};
const ctx = {
  get(name) {
    if (name === "sessions") return emptySessions;
    if (name === "connection") return unavailableConnection;
    throw new Error(`Unknown preview service: ${name}`);
  },
  effect(setup) {
    const cleanup = setup();
    if (typeof cleanup === "function") cleanups.push(cleanup);
  },
  slots: {
    inject(_name, setup) {
      setup();
    },
    register(_descriptor, Component) {
      root.render(<Component />);
      return () => root.unmount();
    },
  },
};

registerExperienceShell(ctx);
if (new URLSearchParams(window.location.search).get("fixture") === "table") {
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent(VIBE_STREAM_CHUNKS_EVENT, {
      detail: {
        runId: "table-layout-preview",
        durationMs: 0,
        source: "visual-regression-fixture",
        chunks: [{
          id: "table-layout-preview",
          kind: "article",
          source: "fresh-stream",
          title: "A Public Map of Influence and Collaboration",
          markdown: `A readable map of the relationships documented in public sources.

| Circle | Publicly documented people or groups | What the record establishes |
| --- | --- | --- |
| Family belief | **Giff/Gifty**, his mother; his father and brothers | Music, persistence and practical support while refusing limiting forecasts. |
| Literacy and confidence | **Sandro Sandri**, tutor, mentor and friend | A key supporter of literacy and later ambition for doctoral study. |
| First educational communities | Learners, colleagues and students | Teaching as the work in which a difference could be seen directly. |`,
          topicId: null,
          publishedAt: Date.now(),
        }],
      },
    }));
  }));
}
window.addEventListener("beforeunload", () => cleanups.reverse().forEach((cleanup) => cleanup()));
