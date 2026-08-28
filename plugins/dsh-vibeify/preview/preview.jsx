import React from "react";
import { createRoot } from "react-dom/client";

import { registerExperienceShell } from "../client-src/experience/shell.jsx";

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
window.addEventListener("beforeunload", () => cleanups.reverse().forEach((cleanup) => cleanup()));
