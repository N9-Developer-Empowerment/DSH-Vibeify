import assert from "node:assert/strict";
import test from "node:test";

import {
  backgroundWorkDecision,
  buildBackgroundReservePrompt,
  cleanPublicRadar,
} from "./client-src/experience/background-editor.js";

const profile = { tribes: ["global-curious", "builders-nerds"], customDirection: "Surprise me.", serendipityPercent: 20, backgroundEditor: true, dailyBudgetUsd: 2 };
const signals = Array.from({ length: 8 }, (_, index) => ({ id: `s${index}`, headline: `Signal ${index}`, url: `https://example.com/${index}`, region: "global", tribeHints: ["builders-nerds"], momentum: 50 }));

test("public radar rejects executable or undersized input", () => {
  assert.equal(cleanPublicRadar({ schemaVersion: 1, signals: [{ id: "one", headline: "One", url: "javascript:alert(1)" }] }), null);
  assert.equal(cleanPublicRadar({ schemaVersion: 2, signals }), null);
});

test("background work requires activity, budget, radar and capacity", () => {
  const now = Date.now();
  const reserve = { lastActivityAt: now, signals, approved: [], candidates: [], ledger: [] };
  assert.deepEqual(backgroundWorkDecision({ profile, reserve, now }), { run: true, reason: "ready" });
  assert.equal(backgroundWorkDecision({ profile, reserve: { ...reserve, lastActivityAt: now - 25 * 60 * 60 * 1000 }, now }).reason, "inactive");
  assert.equal(backgroundWorkDecision({ profile, reserve: { ...reserve, ledger: Array(8).fill({ amountUsd: 0.25 }) }, now }).reason, "budget");
});

test("prompt establishes the provider boundary and closed envelope contract", () => {
  const learning = { preferredKinds: ["video"], preferredTribes: [], questionnaireAnswers: ["More context"] };
  const prompt = buildBackgroundReservePrompt({ runId: "reserve-abc", profile, signals, learning, codexFeatures: true });
  assert.match(prompt, /Codex lead/);
  assert.match(prompt, /DeepSeek Flash/);
  assert.match(prompt, /untrusted discovery signals/);
  assert.match(prompt, /<vibe-chunk id="reserve-abc-unique-slug"/);
  assert.match(prompt, /content destination/i);
  assert.match(prompt, /not an image file or visual-credit page/i);
  assert.match(prompt, /at least 18 potential image candidates/i);
  assert.match(prompt, /at least three credible source families/i);
  assert.match(prompt, /recent-use diversity/i);
  assert.match(prompt, /every non-questionnaire page must begin with a subject-relevant photograph/i);
  assert.match(prompt, /longer than 500 words.*two or three/i);
  assert.match(buildBackgroundReservePrompt({ runId: "reserve-abc", profile, signals, learning, codexFeatures: false }), /Do not claim Codex or independent verification/);
});
