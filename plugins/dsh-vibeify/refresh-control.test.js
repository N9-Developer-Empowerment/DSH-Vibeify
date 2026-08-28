import test from "node:test";
import assert from "node:assert/strict";

import {
  PULL_REFRESH_THRESHOLD,
  createPullRefreshState,
  createTrackpadPullRefreshState,
  reducePullRefresh,
  reduceTrackpadPullRefresh,
} from "./client-src/experience/refresh-control.js";

test("pull refresh can begin only at the top of the magazine", () => {
  const initial = createPullRefreshState();
  assert.deepEqual(reducePullRefresh(initial, { type: "start", y: 100, atTop: false }), initial);
  assert.equal(reducePullRefresh(initial, { type: "start", y: 100, atTop: true }).tracking, true);
});

test("a short pull springs back without requesting an update", () => {
  const started = reducePullRefresh(createPullRefreshState(), { type: "start", y: 100, atTop: true });
  const moved = reducePullRefresh(started, { type: "move", y: 100 + PULL_REFRESH_THRESHOLD - 1 });
  const ended = reducePullRefresh(moved, { type: "end" });
  assert.equal(moved.armed, false);
  assert.equal(ended.requested, false);
  assert.equal(ended.tracking, false);
  assert.equal(ended.distance, 0);
});

test("one deliberate pull requests exactly one bounded magazine update", () => {
  const started = reducePullRefresh(createPullRefreshState(), { type: "start", y: 40, atTop: true });
  const armed = reducePullRefresh(started, { type: "move", y: 40 + PULL_REFRESH_THRESHOLD + 20 });
  const ended = reducePullRefresh(armed, { type: "end" });
  assert.equal(armed.armed, true);
  assert.equal(ended.requested, true);
  assert.equal(reducePullRefresh(ended, { type: "end" }).requested, false);
});

test("Mac trackpad pull begins only with an unmodified pixel gesture at the top", () => {
  const initial = createTrackpadPullRefreshState();
  const fromContent = reduceTrackpadPullRefresh(initial, { type: "wheel", deltaY: -30, deltaMode: 0, atTop: false });
  const reachesTop = reduceTrackpadPullRefresh(fromContent, { type: "wheel", deltaY: -100, deltaMode: 0, atTop: true });
  const mouseWheel = reduceTrackpadPullRefresh(initial, { type: "wheel", deltaY: -100, deltaMode: 1, atTop: true });
  const pinch = reduceTrackpadPullRefresh(initial, { type: "wheel", deltaY: -100, deltaMode: 0, atTop: true, modified: true });
  assert.equal(reachesTop.eligible, false);
  assert.equal(mouseWheel.eligible, false);
  assert.equal(pinch.eligible, false);
  assert.equal(reduceTrackpadPullRefresh(initial, { type: "wheel", deltaY: -30, deltaMode: 0, atTop: true }).eligible, true);
});

test("a short Mac trackpad pull settles without requesting an update", () => {
  const pulled = reduceTrackpadPullRefresh(createTrackpadPullRefreshState(), {
    type: "wheel",
    deltaY: -(PULL_REFRESH_THRESHOLD - 1),
    deltaMode: 0,
    atTop: true,
  });
  const ended = reduceTrackpadPullRefresh(pulled, { type: "end" });
  assert.equal(pulled.armed, false);
  assert.equal(ended.requested, false);
});

test("one cumulative Mac trackpad pull requests exactly one bounded update", () => {
  const started = reduceTrackpadPullRefresh(createTrackpadPullRefreshState(), {
    type: "wheel",
    deltaY: -30,
    deltaMode: 0,
    atTop: true,
  });
  const armed = reduceTrackpadPullRefresh(started, { type: "wheel", deltaY: -50, deltaMode: 0, atTop: true });
  const ended = reduceTrackpadPullRefresh(armed, { type: "end" });
  assert.equal(armed.armed, true);
  assert.equal(ended.requested, true);
  assert.equal(reduceTrackpadPullRefresh(ended, { type: "end" }).requested, false);
});

test("reversing a Mac trackpad pull before release disarms it", () => {
  const armed = reduceTrackpadPullRefresh(createTrackpadPullRefreshState(), {
    type: "wheel",
    deltaY: -(PULL_REFRESH_THRESHOLD + 10),
    deltaMode: 0,
    atTop: true,
  });
  const reversed = reduceTrackpadPullRefresh(armed, {
    type: "wheel",
    deltaY: PULL_REFRESH_THRESHOLD,
    deltaMode: 0,
    atTop: true,
  });
  assert.equal(reversed.armed, false);
  assert.equal(reduceTrackpadPullRefresh(reversed, { type: "end" }).requested, false);
});
