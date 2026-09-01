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
  id: "preview-x", groupId: "preview", revision: 1, channel: "x", channelLabel: "X", mode: "official-api", status: "draft",
  text: "Turn your agent work into a living magazine. Vibeify keeps the magazine local and lets you share only the finished article you choose.", maxLength: 280,
  snapshot: { title: "Turn your agent work into a living magazine", excerpt: "A calmer way to use DeepSeek Harness.", publicUrl: "https://share.codingforjustice.org.uk/a/example", visual: null },
  suggested: { scheduledAt: new Date(Date.now() + 86_400_000).toISOString(), timezone: "Europe/London", note: "A calm starting point; adjust it for your audience before approval." },
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), scheduledAt: null, approval: null, attempts: 0, nextAttemptAt: null, lastError: null, remoteId: null, remoteUrl: null,
}, {
  id: "preview-reddit", groupId: "preview", revision: 2, channel: "reddit", channelLabel: "Reddit", mode: "ready-to-post", status: "ready-to-post",
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
          { id: "x", label: "X", mode: "official-api", configured: true, available: true },
          { id: "bluesky", label: "Bluesky", mode: "official-api", configured: false, available: false },
          { id: "threads", label: "Threads", mode: "official-api", configured: true, available: true },
          { id: "facebook-page", label: "Facebook Page", mode: "official-api", configured: false, available: false },
          { id: "instagram", label: "Instagram professional", mode: "official-api", configured: false, available: false },
          { id: "reddit", label: "Reddit", mode: "ready-to-post", configured: false, available: true },
          { id: "discord", label: "Discord", mode: "ready-to-post", configured: false, available: true },
          { id: "youtube-community", label: "YouTube Community", mode: "ready-to-post", configured: false, available: true },
        ],
      } };
      if (action === "list") return { ok: true, value: { items: structuredClone(socialItems) } };
      if (action === "approve-and-schedule") {
        socialItems = socialItems.map((item) => item.id === payload.id ? { ...item, revision: item.revision + 1, text: payload.text, scheduledAt: payload.scheduledAt, status: item.mode === "official-api" ? "approved" : "ready-to-post" } : item);
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
if (new URLSearchParams(window.location.search).get("fixture") === "questionnaire") {
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent(VIBE_STREAM_CHUNKS_EVENT, {
      detail: {
        runId: "questionnaire-formatting-preview",
        durationMs: 0,
        source: "visual-regression-fixture",
        chunks: [{
          id: "questionnaire-formatting-preview",
          kind: "questionnaire",
          source: "radar-reserve",
          title: "Which tiny project deserves twenty minutes?",
          markdown: `![Film editor Max Mittelbach working at a digital editing suite](https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Max_Mittelbach_digital_editing_suite.jpg/1920px-Max_Mittelbach_digital_editing_suite.jpg)

[Photograph · Klaus Eichler · CC BY-SA 3.0 DE](https://commons.wikimedia.org/wiki/File:Max_Mittelbach_digital_editing_suite.jpg)

No score, streak or productivity sermon. Choose one:

1. **Record:** Make a silent, thirty-second film in which one ordinary object appears to make a decision. Three shots only. The [OpenShot release](https://www.openshot.org/blog/2026/08/30/openshot-40-record-edit-color-like-never-before/) supplies a possible editing tool, not an obligation.
2. **Build:** Draw a business card that reveals its owner through behaviour rather than biography. Wilson Harper’s [NFC card](https://wilsonharper.net/projects/businesscard/) is the engineering provocation.
3. **Photograph:** Arrange five household objects as a miniature café. Sandy Uraz’s [tiny-cafe essay](https://sandyuraz.com/blogs/tiny-cafe/) shows how much narrative fits inside a small room.
4. **Write:** In exactly 128 words, explain a memory you would trust to a ferrite ring. Ken Shirriff’s [Spacelab investigation](https://www.righto.com/2026/08/spacelab-core-memory.html) supplies the hardware.

Now ask: Pick the third answer. Set twenty minutes. Finish with one photograph, recording, drawing or paragraph—not a plan for making one later.

- Which idea can begin without buying anything?
- Which would become more interesting after one mistake?
- Which are you quietly hoping somebody else chooses for you?`,
          topicId: null,
          publishedAt: Date.now(),
        }],
      },
    }));
  }));
}
if (new URLSearchParams(window.location.search).get("fixture") === "links") {
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(VIBE_STREAM_CHUNKS_EVENT, {
      detail: {
        runId: "nested-link-preview",
        durationMs: 0,
        source: "visual-regression-fixture",
        chunks: [{
          id: "nested-link-preview",
          kind: "article",
          source: "fresh-stream",
          title: "The BBC Is About to Be Replatformed in Production",
          markdown: `*Photo: [Martin Belam, via Wikimedia Commons](https://commons.wikimedia.org/wiki/File:BBC_Broadcasting_House_London.jpg), CC BY-SA 2.0. No changes made.*

The BBC’s current Royal Charter expires at midnight on 31 December 2027.

Ordinary prose still keeps [a normal link](https://www.gov.uk/government/collections/bbc-charter-review-2025-to-2027) interactive.

*This analysis is current to 1 September 2026. The official [Charter Review collection](https://www.gov.uk/government/collections/bbc-charter-review-2025-to-2027) is linked from inside this emphasized paragraph.*`,
          topicId: null,
          publishedAt: Date.now(),
        }],
      },
    }));
  }, 250);
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
