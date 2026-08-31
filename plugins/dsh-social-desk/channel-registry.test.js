import assert from "node:assert/strict";
import test from "node:test";

import { CHANNELS, draftForChannel, eligibleForOfficialApi } from "./channel-registry.js";

const article = Object.freeze({
  title: "Share one article without sharing your local magazine",
  markdown: "A bounded article about choosing what leaves the device.\n\nPrivate history stays behind.",
  contentLink: { href: "https://share.codingforjustice.org.uk/a/safe", label: "Read" },
  visual: null,
});

test("the initial channel catalogue is honest about official API and reviewed manual modes", () => {
  assert.equal(CHANNELS.x.mode, "official-api");
  assert.equal(CHANNELS.bluesky.mode, "official-api");
  assert.equal(CHANNELS.threads.mode, "official-api");
  assert.equal(CHANNELS["facebook-page"].mode, "official-api");
  assert.equal(CHANNELS.instagram.mode, "official-api");
  assert.equal(CHANNELS.reddit.mode, "ready-to-post");
  assert.equal(CHANNELS.discord.mode, "ready-to-post");
  assert.equal(CHANNELS["youtube-community"].mode, "ready-to-post");
});

test("community drafts are substantial and channel-specific rather than generic link drops", () => {
  const reddit = draftForChannel(article, "reddit");
  const discord = draftForChannel(article, "discord");

  assert.match(reddit.text, /What I built|What surprised me|Question for the community/i);
  assert.match(discord.text, /worth discussing/i);
  assert.notEqual(reddit.text, discord.text);
  assert.match(reddit.text, /https:\/\/share\.codingforjustice\.org\.uk\/a\/safe/);
});

test("Instagram official publishing requires a public image while text channels do not", () => {
  assert.equal(eligibleForOfficialApi("instagram", article), false);
  assert.equal(eligibleForOfficialApi("x", article), true);
  assert.equal(eligibleForOfficialApi("instagram", {
    ...article,
    visual: { imageUrl: "https://images.example.org/article.jpg" },
  }), true);
});

