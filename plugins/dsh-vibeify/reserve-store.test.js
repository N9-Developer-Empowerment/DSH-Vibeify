import assert from "node:assert/strict";
import test from "node:test";

import { appendReservePages, consumeApprovedPages, consumeCandidatePages, dailyBackgroundSpend, getEditorialReserve, markVibeActivity, replaceRadarSignals, reserveBackgroundRun } from "./client-src/experience/reserve-store.js";
import { createEditorialProfile, editorialProfileKey } from "./client-src/experience/editorial-settings.js";

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

test("changed editor direction hides and purges stale or untagged reserve pages", () => {
  const local = storage();
  const oldProfile = createEditorialProfile({ customDirection: "People behind local music" });
  const newProfile = createEditorialProfile({ customDirection: "People behind public transport" });
  appendReservePages(local, [
    { id: "old", kind: "article", title: "Old", markdown: "Old music story", profileKey: editorialProfileKey(oldProfile) },
    { id: "new", kind: "article", title: "New", markdown: "New transport story", profileKey: editorialProfileKey(newProfile) },
    { id: "legacy", kind: "article", title: "Legacy", markdown: "No direction tag" },
  ], "approved", NOW);
  appendReservePages(local, [{ id: "old-draft", kind: "article", title: "Old draft", markdown: "Old", profileKey: editorialProfileKey(oldProfile) }], "candidate", NOW);
  assert.deepEqual(getEditorialReserve(local, NOW, newProfile).approved.map(({ id }) => id), ["new"]);
  assert.deepEqual(consumeApprovedPages(local, 4, NOW, newProfile).map(({ id }) => id), ["new"]);
  assert.deepEqual(consumeCandidatePages(local, 4, NOW, newProfile), []);
  assert.equal(getEditorialReserve(local, NOW).approved.length, 0);
  assert.equal(getEditorialReserve(local, NOW).candidates.length, 0);
  assert.doesNotMatch(local.getItem("dsh-vibeify.reserve.v1"), /People behind/);
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
