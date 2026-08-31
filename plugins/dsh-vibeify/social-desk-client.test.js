import assert from "node:assert/strict";
import test from "node:test";

import {
  SOCIAL_DESK_RPC_CHANNEL,
  approveSocialPost,
  loadSocialDesk,
  prepareSocialPosts,
} from "./client-src/experience/social-desk-client.js";

test("Vibe sends only the cleaned single-article snapshot to Social Desk", async () => {
  const calls = [];
  const connection = { rpc: { call: async (...args) => { calls.push(args); return { ok: true, value: { items: [] } }; } } };
  const snapshot = Object.freeze({
    version: 1,
    title: "Finished article",
    markdown: "Public article copy.",
    contentLink: { href: "https://share.codingforjustice.org.uk/a/safe", label: "Read" },
  });

  await prepareSocialPosts(connection, snapshot);

  assert.deepEqual(calls, [[SOCIAL_DESK_RPC_CHANNEL, "prepare", { snapshot }]]);
  assert.doesNotMatch(JSON.stringify(calls), /thread|prompt|session|reasoning|tribe/i);
});

test("loading and approving preserve the one explicit approve-and-schedule RPC boundary", async () => {
  const calls = [];
  const connection = { rpc: { call: async (...args) => { calls.push(args); return { ok: true, value: {} }; } } };
  await loadSocialDesk(connection);
  await approveSocialPost(connection, { id: "social-1", revision: 2, text: "Reviewed words", scheduledAt: "2026-08-31T18:00:00.000Z" });

  assert.deepEqual(calls[0], [SOCIAL_DESK_RPC_CHANNEL, "list", {}]);
  assert.deepEqual(calls[1], [SOCIAL_DESK_RPC_CHANNEL, "approve-and-schedule", {
    id: "social-1", revision: 2, text: "Reviewed words", scheduledAt: "2026-08-31T18:00:00.000Z",
  }]);
});

