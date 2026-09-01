import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryQueueStore } from "./social-queue-store.js";
import { createSocialDeskService, recommendedTime } from "./social-desk-service.js";

const snapshot = Object.freeze({
  version: 1,
  title: "A public trend radar with a private local editor",
  kind: "article",
  markdown: "A useful public article for people who enjoy calmer tools.",
  privatePrompt: "Never leave the local Chat session.",
  publishedAt: Date.UTC(2026, 7, 31, 9, 0, 0),
  visual: {
    imageUrl: "https://images.example.org/radar.jpg",
    sourceUrl: "https://images.example.org/radar-credit",
    alt: "A radar display",
    credit: "Photograph · Example Maker",
    kind: "photograph",
  },
  inlineVisuals: [],
  contentLink: { href: "https://share.codingforjustice.org.uk/a/example", label: "Read the article" },
  media: null,
});

function serviceFixture({ now = Date.UTC(2026, 7, 31, 10, 0, 0), publish, configured = false } = {}) {
  const store = createMemoryQueueStore();
  const connector = {
    configured: async () => configured,
    publish: publish ?? (async () => ({ remoteId: "post-1", remoteUrl: "https://social.example/post-1" })),
  };
  const service = createSocialDeskService({
    store,
    getConfig: () => ({ timezone: "Europe/London", staleAfterMinutes: 60, defaultChannels: ["x", "reddit"] }),
    connectorFor: (channel) => channel === "x" ? connector : null,
    now: () => now,
  });
  return { service, store };
}

test("recommended times are expressed in the chosen local timezone across summer time", () => {
  const recommendation = recommendedTime("x", Date.UTC(2026, 7, 31, 10, 0, 0), "Europe/London");
  assert.equal(recommendation.scheduledAt, "2026-09-01T17:00:00.000Z");
  assert.equal(recommendation.timezone, "Europe/London");
});

test("preparing one cleaned Vibe defaults every channel to a composer draft without private material", async () => {
  const { service } = serviceFixture();
  const result = await service.prepare({ snapshot, channels: ["x", "reddit"] });

  assert.equal(result.items.length, 2);
  assert.equal(result.items.find(({ channel }) => channel === "x").mode, "composer");
  assert.equal(result.items.find(({ channel }) => channel === "reddit").mode, "composer");
  assert.equal(result.items.every(({ status }) => status === "draft"), true);
  assert.doesNotMatch(JSON.stringify(result), /prompt|session|reasoning|credential/i);
});

test("capabilities keep all composers available and expose an official connection only as an opt-in", async () => {
  const composer = await serviceFixture().service.capabilities();
  const composerX = composer.channels.find(({ id }) => id === "x");
  assert.equal(composerX.available, true);
  assert.equal(composerX.publishingMode, "composer");
  assert.equal(composerX.supportsOfficialApi, true);

  const automatic = await serviceFixture({ configured: true }).service.capabilities();
  assert.equal(automatic.channels.find(({ id }) => id === "x").publishingMode, "official-api");
  assert.equal(automatic.channels.find(({ id }) => id === "reddit").publishingMode, "composer");
});

test("one approve-and-schedule action freezes exact copy and authorizes one later API publish", async () => {
  const published = [];
  const { service } = serviceFixture({ configured: true, publish: async (item) => {
    published.push(item);
    return { remoteId: "x-42", remoteUrl: "https://x.com/example/status/42" };
  } });
  const prepared = await service.prepare({ snapshot, channels: ["x"] });
  const draft = prepared.items[0];
  const approved = await service.approveAndSchedule({
    id: draft.id,
    revision: draft.revision,
    text: "The exact reviewed words.\n\nhttps://share.codingforjustice.org.uk/a/example",
    scheduledAt: "2026-08-31T10:01:00.000Z",
  });

  assert.equal(approved.status, "approved");
  assert.equal(approved.approval.textSha256.length, 64);
  await service.tick(Date.UTC(2026, 7, 31, 10, 1, 0));
  const posted = (await service.list()).items[0];

  assert.equal(published.length, 1);
  assert.equal(published[0].text, "The exact reviewed words.\n\nhttps://share.codingforjustice.org.uk/a/example");
  assert.equal(posted.status, "posted");
  assert.equal(posted.remoteUrl, "https://x.com/example/status/42");
  await service.tick(Date.UTC(2026, 7, 31, 10, 5, 0));
  assert.equal(published.length, 1);
});

test("scheduled composer channels become Ready to post at their time and never call a publisher", async () => {
  const { service } = serviceFixture({ publish: async () => { throw new Error("must not publish"); } });
  const prepared = await service.prepare({ snapshot, channels: ["x", "reddit", "discord", "youtube-community"] });

  for (const draft of prepared.items) {
    const approved = await service.approveAndSchedule({ id: draft.id, revision: draft.revision, text: draft.text, scheduledAt: "2026-08-31T10:30:00.000Z" });
    assert.equal(approved.status, "approved");
  }
  assert.equal((await service.tick(Date.UTC(2026, 7, 31, 10, 30, 0))).attempted, 0);
  assert.equal((await service.list()).items.every(({ status }) => status === "ready-to-post"), true);
});

test("long-missed and uncertain in-flight posts return to review after restart", async () => {
  const { service, store } = serviceFixture({ configured: true });
  const prepared = await service.prepare({ snapshot, channels: ["x"] });
  const draft = prepared.items[0];
  await service.approveAndSchedule({ id: draft.id, revision: draft.revision, text: draft.text, scheduledAt: "2026-08-31T08:00:00.000Z" });
  await service.recover(Date.UTC(2026, 7, 31, 10, 0, 0));
  assert.equal((await service.list()).items[0].status, "stale/review");

  const record = (await store.read()).items[0];
  await store.write({ version: 1, items: [{ ...record, status: "posting", postingStartedAt: "2026-08-31T09:59:00.000Z" }] });
  await service.recover(Date.UTC(2026, 7, 31, 10, 0, 0));
  const recovered = (await service.list()).items[0];
  assert.equal(recovered.status, "stale/review");
  assert.match(recovered.lastError.message, /check the channel/i);
});

test("a connector failure records a bounded retry without leaking remote response bodies", async () => {
  const { service } = serviceFixture({ configured: true, publish: async () => {
    const error = new Error("Bearer secret-token remote body: private account metadata");
    error.code = "remote-http-503";
    throw error;
  } });
  const prepared = await service.prepare({ snapshot, channels: ["x"] });
  const draft = prepared.items[0];
  await service.approveAndSchedule({ id: draft.id, revision: draft.revision, text: draft.text, scheduledAt: "2026-08-31T10:00:00.000Z" });
  await service.tick(Date.UTC(2026, 7, 31, 10, 0, 0));
  const failed = (await service.list()).items[0];

  assert.equal(failed.status, "failed/retry");
  assert.equal(failed.attempts, 1);
  assert.equal(failed.lastError.code, "remote-http-503");
  assert.doesNotMatch(JSON.stringify(failed), /secret-token|private account metadata/i);
});
