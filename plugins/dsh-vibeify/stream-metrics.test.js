import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_STREAM_METRICS,
  STREAM_METRIC_EVENTS,
  STREAM_METRIC_SOURCES,
  STREAM_METRICS_KEY,
  appendStreamMetric,
  formatStreamDuration,
  readStreamMetrics,
} from "./client-src/experience/stream-metrics.js";

function memoryStorage() {
  const values = new Map();
  return { values, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

function metric(durationMs = 120) {
  return { event: "home-first-frame", recipeId: "home", durationMs, source: "bundle" };
}

test("timing ledger persists only the five allow-listed fields", () => {
  const storage = memoryStorage();
  assert.equal(appendStreamMetric(storage, { ...metric(), prompt: "discard", markdown: "discard" }, 1_700_000_000_000), true);
  const [record] = readStreamMetrics(storage);
  assert.deepEqual(Object.keys(record).sort(), ["durationMs", "event", "recipeId", "source", "timestamp"]);
  assert.equal(JSON.parse(storage.values.get(STREAM_METRICS_KEY)).version, 1);
});

test("every declared event and source is accepted while unknown values are rejected", () => {
  const storage = memoryStorage();
  for (const event of STREAM_METRIC_EVENTS) {
    for (const source of STREAM_METRIC_SOURCES) {
      assert.equal(appendStreamMetric(storage, { event, source, recipeId: "guide", durationMs: 1 }, 1_700_000_000_000), true);
    }
  }
  assert.equal(appendStreamMetric(storage, { ...metric(), event: "secret-content" }), false);
  assert.equal(appendStreamMetric(storage, { ...metric(), source: "network" }), false);
  assert.equal(appendStreamMetric(storage, { ...metric(), recipeId: "bad id" }), false);
});

test("ledger keeps the newest two hundred measurements", () => {
  const storage = memoryStorage();
  for (let index = 0; index < MAX_STREAM_METRICS + 5; index += 1) appendStreamMetric(storage, metric(index), 1_700_000_000_000 + index);
  const records = readStreamMetrics(storage);
  assert.equal(records.length, MAX_STREAM_METRICS);
  assert.equal(records[0].durationMs, 5);
  assert.equal(records.at(-1).durationMs, MAX_STREAM_METRICS + 4);
});

test("corrupt and quota-failing storage is non-blocking", () => {
  const storage = memoryStorage();
  storage.values.set(STREAM_METRICS_KEY, "{broken");
  assert.deepEqual(readStreamMetrics(storage), []);
  const quota = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
  assert.equal(appendStreamMetric(quota, metric()), false);
  assert.deepEqual(readStreamMetrics(undefined), []);
});

test("duration formatter keeps subsecond waits precise and longer waits calm", () => {
  assert.equal(formatStreamDuration(0), "0 ms");
  assert.equal(formatStreamDuration(412), "412 ms");
  assert.equal(formatStreamDuration(1400), "1.4 s");
  assert.equal(formatStreamDuration(12_400), "12 s");
  assert.equal(formatStreamDuration(-1), "");
});
