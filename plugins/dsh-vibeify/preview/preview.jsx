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
let socialItems = [{
  id: "preview-x", groupId: "preview", revision: 1, channel: "x", channelLabel: "X", mode: "composer", status: "draft",
  text: "Turn your agent work into a living magazine. Vibeify keeps the magazine local and lets you share only the finished article you choose.", maxLength: 280,
  snapshot: { title: "Turn your agent work into a living magazine", excerpt: "A calmer way to use DeepSeek Harness.", publicUrl: "https://share.codingforjustice.org.uk/a/example", visual: null },
  suggested: { scheduledAt: new Date(Date.now() + 86_400_000).toISOString(), timezone: "Europe/London", note: "A calm starting point; adjust it for your audience before approval." },
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), scheduledAt: null, approval: null, attempts: 0, nextAttemptAt: null, lastError: null, remoteId: null, remoteUrl: null,
}, {
  id: "preview-reddit", groupId: "preview", revision: 2, channel: "reddit", channelLabel: "Reddit", mode: "composer", status: "ready-to-post",
  text: "What I built\n\nA local magazine for agent work.\n\nWhat surprised me\n\nFinished articles can leave without the rest of the workspace.\n\nQuestion for the community\n\nHow do you decide what deserves a public life?",
  maxLength: 10_000, snapshot: { title: "A local magazine for agent work", excerpt: "Finished articles can leave without the rest of the workspace.", publicUrl: "https://share.codingforjustice.org.uk/a/example", visual: null },
  suggested: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), scheduledAt: null, approval: { approvedAt: new Date().toISOString() }, attempts: 0, nextAttemptAt: null, lastError: null, remoteId: null, remoteUrl: null,
}];
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
  rpc: {
    async call(channel, action, payload) {
      if (channel === "/dsh-visuals") return { ok: false };
      if (channel !== "/dsh-social-desk") return { ok: false, error: { message: "Unavailable" } };
      if (action === "capabilities") return { ok: true, value: {
        name: "Vibe Social Desk", timezone: "Europe/London",
        channels: [
          { id: "x", label: "X", mode: "composer", publishingMode: "composer", configured: false, available: true },
          { id: "bluesky", label: "Bluesky", mode: "composer", publishingMode: "composer", configured: false, available: true },
          { id: "threads", label: "Threads", mode: "composer", publishingMode: "composer", configured: false, available: true },
          { id: "facebook-page", label: "Facebook Page", mode: "composer", publishingMode: "composer", configured: false, available: true },
          { id: "instagram", label: "Instagram", mode: "composer", publishingMode: "composer", configured: false, available: true },
          { id: "reddit", label: "Reddit", mode: "composer", publishingMode: "composer", configured: false, available: true },
          { id: "discord", label: "Discord", mode: "composer", publishingMode: "composer", configured: false, available: true },
          { id: "youtube-community", label: "YouTube Community", mode: "composer", publishingMode: "composer", configured: false, available: true },
        ],
      } };
      if (action === "list") return { ok: true, value: { items: structuredClone(socialItems) } };
      if (action === "approve-and-schedule") {
        socialItems = socialItems.map((item) => item.id === payload.id ? { ...item, revision: item.revision + 1, text: payload.text, scheduledAt: payload.scheduledAt, status: Date.parse(payload.scheduledAt) <= Date.now() ? "ready-to-post" : "approved" } : item);
        return { ok: true, value: structuredClone(socialItems.find((item) => item.id === payload.id)) };
      }
      if (action === "cancel") {
        socialItems = socialItems.map((item) => item.id === payload.id ? { ...item, revision: item.revision + 1, status: "cancelled" } : item);
        return { ok: true, value: structuredClone(socialItems.find((item) => item.id === payload.id)) };
      }
      if (action === "record-manual-post") {
        socialItems = socialItems.map((item) => item.id === payload.id ? { ...item, revision: item.revision + 1, status: "posted" } : item);
        return { ok: true, value: structuredClone(socialItems.find((item) => item.id === payload.id)) };
      }
      return { ok: false, error: { message: "Unavailable in preview" } };
    },
  },
};
const ctx = {
  connection: unavailableConnection,
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
if (new URLSearchParams(window.location.search).get("fixture") === "social") {
  const openSocialFixture = window.setInterval(() => {
    const button = document.querySelector(".vfx-social-tab");
    if (button === null) return;
    window.clearInterval(openSocialFixture);
    button.click();
  }, 40);
  window.setTimeout(() => window.clearInterval(openSocialFixture), 4_000);
}
window.addEventListener("beforeunload", () => cleanups.reverse().forEach((cleanup) => cleanup()));
