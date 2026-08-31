import assert from "node:assert/strict";
import test from "node:test";

import { appendReservePages, consumeApprovedPages, dailyBackgroundSpend, getEditorialReserve, markVibeActivity, replaceRadarSignals, reserveBackgroundRun } from "./client-src/experience/reserve-store.js";

function storage() { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }; }
const NOW = Date.parse("2026-08-28T20:00:00Z");

test("signals, candidates and approved pages remain separate local cache states", () => {
  const local = storage();
  markVibeActivity(local, NOW);
  assert.equal(replaceRadarSignals(local, { generatedAt: new Date(NOW).toISOString(), signals: [{ id: "signal-one", headline: "A global idea", url: "https://example.com/one", region: "global", tribeHints: ["global-curious"], momentum: 91 }] }, NOW), true);
  appendReservePages(local, [{ id: "draft-one", kind: "article", title: "Draft", markdown: "Unverified candidate", tribes: ["global-curious"] }], "candidate", NOW);
  appendReservePages(local, [{ id: "approved-one", kind: "video", title: "Ready", markdown: "[Watch](https://example.com/watch)", tribes: ["culture-arts"] }], "approved", NOW);
  const reserve = getEditorialReserve(local, NOW);
  assert.equal(reserve.signals.length, 1);
  assert.equal(reserve.candidates[0].state, "candidate");
  assert.equal(reserve.approved[0].state, "approved");
  assert.deepEqual(consumeApprovedPages(local, 1, NOW).map(({ id }) => id), ["approved-one"]);
  assert.equal(getEditorialReserve(local, NOW).approved.length, 0);
});

test("a conservative reservation makes two dollars a hard daily background ceiling", () => {
  const local = storage();
  for (let index = 0; index < 8; index += 1) assert.equal(reserveBackgroundRun(local, 2, `run-${index}`, NOW + index), true);
  assert.equal(dailyBackgroundSpend(local, NOW + 20), 2);
  assert.equal(reserveBackgroundRun(local, 2, "run-nine", NOW + 21), false);
  assert.equal(reserveBackgroundRun(local, 0, "disabled", NOW + 22), false);
});

test("the hidden reserve rejects article-shaped questionnaires", () => {
  const local = storage();
  const appended = appendReservePages(local, [
    { id: "broken-question", kind: "questionnaire", title: "Broken", markdown: "![A studio](https://example.com/studio.jpg)\n\nPick the third answer.\n\n- Which one?\n- Another?" },
    { id: "useful-question", kind: "questionnaire", title: "Useful", markdown: "Choose the next direction.\n\n- More tiny filmmaking projects\n- More constrained writing ideas" },
  ], "approved", NOW);
  assert.deepEqual(appended.map(({ id }) => id), ["useful-question"]);
  assert.deepEqual(getEditorialReserve(local, NOW).approved.map(({ id }) => id), ["useful-question"]);
});
