import test from "node:test";
import assert from "node:assert/strict";

import {
  PULL_REFRESH_THRESHOLD,
  createPullRefreshState,
  reducePullRefresh,
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

