import React from "react";
import { createRoot } from "react-dom/client";

import { registerExperienceShell } from "../client-src/experience/shell.jsx";

const cleanups = [];
const root = createRoot(document.getElementById("preview-root"));
const ctx = {
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
