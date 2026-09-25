import { createHash, randomUUID } from "node:crypto";

import {
  CHANNELS,
  channelList,
  cleanSocialSnapshot,
  draftForChannel,
  eligibleForOfficialApi,
} from "./channel-registry.js";

const MAX_ITEMS = 240;
const MAX_POST_AGE_MS = 90 * 24 * 60 * 60 * 1_000;
const RETRY_DELAYS_MS = Object.freeze([5, 20, 60].map((minutes) => minutes * 60 * 1_000));
const DEFAULT_CHANNELS = Object.freeze(["x", "bluesky", "threads", "facebook-page", "instagram", "reddit", "discord", "youtube-community"]);

function iso(value) {
  const timestamp = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new TypeError("A valid date and time is required.");
  return new Date(timestamp).toISOString();
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeError(cause) {
  const code = typeof cause?.code === "string" && /^[a-z0-9-]{3,80}$/i.test(cause.code) ? cause.code : "publish-failed";
  const messages = {
    "channel-not-configured": "Connect this channel in Settings, then review the post again.",
    "image-required": "Choose a public article image, then review the post again.",
  };
  return Object.freeze({ code, message: messages[code] ?? "The channel did not accept this post. Review it before trying again." });
}

function configChannels(config) {
  const values = Array.isArray(config?.defaultChannels) ? config.defaultChannels : DEFAULT_CHANNELS;
  return values.filter((id, index) => CHANNELS[id] !== undefined && values.indexOf(id) === index);
}

function cleanChannels(values, config) {
  const requested = Array.isArray(values) && values.length > 0 ? values : configChannels(config);
  const clean = requested.filter((id, index) => typeof id === "string" && CHANNELS[id] !== undefined && requested.indexOf(id) === index);
  if (clean.length === 0) throw new TypeError("Choose at least one social channel.");
  return clean.slice(0, Object.keys(CHANNELS).length);
}

function zonedParts(value, timezone) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return Object.fromEntries(formatter.formatToParts(new Date(value))
    .filter(({ type }) => type !== "literal")
    .map(({ type, value: part }) => [type, Number(part)]));
}

function zonedOffset(value, timezone) {
  const parts = zonedParts(value, timezone);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - value;
}

export function recommendedTime(channel, now, timezone) {
  const hours = { x: 18, bluesky: 18, threads: 19, "facebook-page": 19, instagram: 20, reddit: 19, discord: 20, "youtube-community": 18 };
  const hour = hours[channel] ?? 19;
  const current = zonedParts(now, timezone);
  const desiredWallClock = Date.UTC(current.year, current.month - 1, current.day + 1, hour, 0, 0, 0);
  let scheduledAt = desiredWallClock;
  for (let attempt = 0; attempt < 3; attempt += 1) scheduledAt = desiredWallClock - zonedOffset(scheduledAt, timezone);
  return Object.freeze({ scheduledAt: new Date(scheduledAt).toISOString(), timezone, note: "A calm starting point; adjust it for your audience before approval." });
}

function publicItem(item) {
  return structuredClone(item);
}

export function createSocialDeskService({ store, getConfig, connectorFor, now = Date.now } = {}) {
  if (store?.read === undefined || store?.write === undefined) throw new TypeError("A Social Desk queue store is required.");
  if (typeof getConfig !== "function" || typeof connectorFor !== "function" || typeof now !== "function") throw new TypeError("Social Desk dependencies are incomplete.");
  let lock = Promise.resolve();

  async function mutate(operation) {
    const run = lock.then(async () => {
      const document = await store.read();
      const result = await operation(document);
      if (result?.changed === true) await store.write(result.document);
      return result?.value;
    });
    lock = run.catch(() => {});
    return run;
  }

  function bounded(document, at = now()) {
    const recent = document.items
      .filter((item) => Date.parse(item.createdAt) >= at - MAX_POST_AGE_MS || !["posted", "cancelled"].includes(item.status))
      .slice(-MAX_ITEMS);
    return { version: 1, items: recent };
  }

  async function officialApiConfigured(channelId) {
    if (CHANNELS[channelId]?.supportsOfficialApi !== true) return false;
    const connector = connectorFor(channelId);
    if (connector === null || connector === undefined) return false;
    try {
      return await connector.configured() === true;
    } catch {
      return false;
    }
  }

  async function capabilities() {
    const config = getConfig() ?? {};
    const channels = await Promise.all(channelList().map(async (channel) => {
      const configured = await officialApiConfigured(channel.id);
      return Object.freeze({
        ...channel,
        configured,
        publishingMode: configured ? "official-api" : "composer",
        available: true,
      });
    }));
    return Object.freeze({
      name: "Vibe Social Desk",
      timezone: typeof config.timezone === "string" && config.timezone !== "" ? config.timezone : "Europe/London",
      channels: Object.freeze(channels),
      approval: "review-and-schedule-once",
      automationDisclosure: "Every channel works through its normal composer. An explicitly enabled official connection may publish the exact approved copy unattended.",
    });
  }

  async function prepare(request) {
    if (request === null || typeof request !== "object" || Array.isArray(request)) throw new TypeError("A Social Desk preparation request is required.");
    const config = getConfig() ?? {};
    const snapshot = cleanSocialSnapshot(request.snapshot);
    const channels = cleanChannels(request.channels, config);
    const preparedAt = now();
    const timezone = typeof config.timezone === "string" && config.timezone !== "" ? config.timezone : "Europe/London";
    const publishingModes = Object.fromEntries(await Promise.all(channels.map(async (channel) => [
      channel,
      await officialApiConfigured(channel) ? "official-api" : "composer",
    ])));
    return mutate((document) => {
      const items = channels.map((channel) => {
        const draft = draftForChannel(snapshot, channel);
        return {
          id: `social-${randomUUID()}`,
          groupId: request.groupId ?? `vibe-${randomUUID()}`,
          revision: 1,
          channel,
          channelLabel: CHANNELS[channel].label,
          mode: publishingModes[channel],
          status: "draft",
          text: draft.text,
          maxLength: draft.maxLength,
          snapshot,
          suggested: recommendedTime(channel, preparedAt, timezone),
          createdAt: iso(preparedAt),
          updatedAt: iso(preparedAt),
          scheduledAt: null,
          approval: null,
          attempts: 0,
          nextAttemptAt: null,
          lastError: null,
          remoteId: null,
          remoteUrl: null,
        };
      });
      return { changed: true, document: bounded({ version: 1, items: [...document.items, ...items] }, preparedAt), value: { items: items.map(publicItem) } };
    });
  }

  async function approveAndSchedule(request) {
    if (request === null || typeof request !== "object" || Array.isArray(request)) throw new TypeError("An approval request is required.");
    return mutate(async (document) => {
      const index = document.items.findIndex(({ id }) => id === request.id);
      if (index < 0) throw Object.assign(new TypeError("The Social Desk draft was not found."), { code: "not-found" });
      const current = document.items[index];
      if (current.status !== "draft" && current.status !== "stale/review") throw Object.assign(new TypeError("This post is no longer waiting for approval."), { code: "invalid-state" });
      if (request.revision !== current.revision) throw Object.assign(new TypeError("This draft changed. Review the latest copy before approval."), { code: "revision-conflict" });
      const reviewed = typeof request.text === "string" ? request.text.replace(/\r\n/g, "\n").trim() : "";
      if (reviewed.length < 3 || reviewed.length > current.maxLength) throw Object.assign(new TypeError(`Keep this post between 3 and ${current.maxLength} characters.`), { code: "invalid-copy" });
      const at = now();
      const scheduledAt = iso(request.scheduledAt);
      let status;
      if (current.mode === "official-api") {
        if (!eligibleForOfficialApi(current.channel, current.snapshot)) throw Object.assign(new TypeError("This channel needs a public article image."), { code: "image-required" });
        const connector = connectorFor(current.channel);
        if (connector === null || connector === undefined || await connector.configured() !== true) throw Object.assign(new TypeError("Connect this channel in Settings before approving it."), { code: "channel-not-configured" });
        status = Date.parse(scheduledAt) <= at ? "due" : "approved";
      } else {
        status = Date.parse(scheduledAt) <= at ? "ready-to-post" : "approved";
      }
      const revision = current.revision + 1;
      const approved = {
        ...current,
        revision,
        text: reviewed,
        status,
        scheduledAt,
        updatedAt: iso(at),
        approval: { approvedAt: iso(at), textSha256: hash(reviewed), scheduledAt },
        idempotencyKey: `${current.id}-approved-${revision}`,
        attempts: 0,
        nextAttemptAt: null,
        lastError: null,
      };
      const items = document.items.with(index, approved);
      return { changed: true, document: bounded({ version: 1, items }, at), value: publicItem(approved) };
    });
  }

  async function list() {
    await lock;
    const document = await store.read();
    return { items: [...document.items].reverse().map(publicItem) };
  }

  async function updateStatus(id, allowed, update) {
    return mutate((document) => {
      const index = document.items.findIndex((item) => item.id === id);
      if (index < 0) throw Object.assign(new TypeError("The Social Desk item was not found."), { code: "not-found" });
      const current = document.items[index];
      if (!allowed.includes(current.status)) throw Object.assign(new TypeError("This action is not available for the current post state."), { code: "invalid-state" });
      const next = { ...current, ...update(current), revision: current.revision + 1, updatedAt: iso(now()) };
      return { changed: true, document: { version: 1, items: document.items.with(index, next) }, value: publicItem(next) };
    });
  }

  async function cancel({ id }) {
    return updateStatus(id, ["draft", "approved", "due", "failed/retry", "ready-to-post", "stale/review"], () => ({ status: "cancelled", nextAttemptAt: null }));
  }

  async function retry({ id, scheduledAt = null }) {
    return updateStatus(id, ["failed/retry", "stale/review"], (current) => current.mode === "composer"
      ? { status: "ready-to-post", lastError: null }
      : { status: "approved", scheduledAt: iso(scheduledAt ?? now()), nextAttemptAt: null, lastError: null });
  }

  async function recordManualPost({ id, remoteUrl = null }) {
    return updateStatus(id, ["ready-to-post"], () => ({ status: "posted", postedAt: iso(now()), remoteUrl: typeof remoteUrl === "string" && remoteUrl.startsWith("https://") ? remoteUrl : null }));
  }

  async function recover(at = now()) {
    const config = getConfig() ?? {};
    const staleAfterMs = Math.max(5, Math.min(1_440, Number(config.staleAfterMinutes) || 60)) * 60 * 1_000;
    return mutate((document) => {
      let changed = false;
      const items = document.items.map((item) => {
        if (item.status === "posting") {
          changed = true;
          return { ...item, status: "stale/review", updatedAt: iso(at), lastError: { code: "uncertain-delivery", message: "Check the channel before approving this post again; delivery may have completed." } };
        }
        if (["approved", "due", "failed/retry"].includes(item.status)) {
          const due = Date.parse(item.nextAttemptAt ?? item.scheduledAt);
          if (Number.isFinite(due) && at - due > staleAfterMs) {
            changed = true;
            return { ...item, status: "stale/review", updatedAt: iso(at), lastError: { code: "missed-schedule", message: "This time passed while Social Desk was closed. Review it before posting." } };
          }
        }
        return item;
      });
      return { changed, document: bounded({ version: 1, items }, at), value: { recovered: changed } };
    });
  }

  async function tick(at = now()) {
    const due = await mutate((document) => {
      const candidates = document.items.filter((item) => {
        if (item.status === "approved" || item.status === "due") return Date.parse(item.scheduledAt) <= at;
        if (item.status === "failed/retry") return item.attempts < RETRY_DELAYS_MS.length && Date.parse(item.nextAttemptAt) <= at;
        return false;
      });
      return { changed: false, document, value: candidates.map(({ id }) => id) };
    });
    let attempted = 0;
    for (const id of due) {
      const item = await updateStatus(id, ["approved", "due", "failed/retry"], (current) => current.mode === "composer"
        ? { status: "ready-to-post", readyAt: iso(at), nextAttemptAt: null, lastError: null }
        : { status: "posting", postingStartedAt: iso(at), attempts: current.attempts + 1 });
      if (item.mode === "composer") continue;
      const connector = connectorFor(item.channel);
      if (connector === null || connector === undefined) {
        await updateStatus(id, ["posting"], () => ({ status: "stale/review", lastError: { code: "connector-unavailable", message: "Connect this channel, then review the post again." } }));
        continue;
      }
      attempted += 1;
      try {
        const result = await connector.publish(item);
        await updateStatus(id, ["posting"], () => ({
          status: "posted", postedAt: iso(now()), postingStartedAt: null, nextAttemptAt: null, lastError: null,
          remoteId: typeof result?.remoteId === "string" ? result.remoteId : null,
          remoteUrl: typeof result?.remoteUrl === "string" && result.remoteUrl.startsWith("https://") ? result.remoteUrl : null,
        }));
      } catch (cause) {
        await updateStatus(id, ["posting"], (current) => {
          const delay = RETRY_DELAYS_MS[Math.min(current.attempts - 1, RETRY_DELAYS_MS.length - 1)];
          return { status: "failed/retry", postingStartedAt: null, nextAttemptAt: iso(at + delay), lastError: safeError(cause) };
        });
      }
    }
    return { attempted };
  }

  return Object.freeze({ capabilities, prepare, approveAndSchedule, list, cancel, retry, recordManualPost, recover, tick });
}
