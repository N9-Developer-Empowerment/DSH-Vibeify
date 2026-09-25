export const SOCIAL_DESK_RPC_CHANNEL = "/dsh-social-desk";

async function call(connection, endpoint, payload) {
  if (connection?.rpc?.call === undefined) throw new Error("Social Desk is unavailable.");
  const result = await connection.rpc.call(SOCIAL_DESK_RPC_CHANNEL, endpoint, payload);
  if (result?.ok !== true) {
    const error = new Error(result?.error?.message ?? "Social Desk could not complete that action.");
    error.code = result?.error?.code ?? "social-desk-failed";
    throw error;
  }
  return result.value;
}

export function socialDeskCapabilities(connection) {
  return call(connection, "capabilities", {});
}

export function loadSocialDesk(connection) {
  return call(connection, "list", {});
}

export function prepareSocialPosts(connection, snapshot) {
  return call(connection, "prepare", { snapshot });
}

export function approveSocialPost(connection, request) {
  return call(connection, "approve-and-schedule", request);
}

export function cancelSocialPost(connection, id) {
  return call(connection, "cancel", { id });
}

export function retrySocialPost(connection, id, scheduledAt) {
  return call(connection, "retry", { id, scheduledAt });
}

export function recordManualSocialPost(connection, id, remoteUrl = null) {
  return call(connection, "record-manual-post", { id, remoteUrl });
}

export function socialStatusLabel(status) {
  return {
    draft: "Review draft",
    approved: "Scheduled",
    due: "Due",
    posting: "Posting",
    posted: "Posted",
    "failed/retry": "Retry queued",
    "ready-to-post": "Ready to post",
    "stale/review": "Review again",
    cancelled: "Cancelled",
  }[status] ?? "Unknown";
}

function composerUrl(base, values = {}) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" && value.length > 0) url.searchParams.set(key, value);
  }
  return url.href;
}

export function manualComposerUrl(channel, item = {}) {
  const text = typeof item.text === "string" ? item.text : "";
  const publicUrl = typeof item.snapshot?.publicUrl === "string" ? item.snapshot.publicUrl : "";
  const title = typeof item.snapshot?.title === "string" ? item.snapshot.title : "";
  if (channel === "x") return composerUrl("https://x.com/intent/post", { text });
  if (channel === "bluesky") return composerUrl("https://bsky.app/intent/compose", { text });
  if (channel === "threads") return composerUrl("https://www.threads.net/intent/post", { text });
  if (channel === "facebook-page" || channel === "facebook-profile") {
    return publicUrl === "" ? "https://www.facebook.com/" : composerUrl("https://www.facebook.com/sharer/sharer.php", { u: publicUrl });
  }
  if (channel === "reddit") return composerUrl("https://www.reddit.com/submit", { url: publicUrl, title });
  if (channel === "discord") return "https://discord.com/channels/@me";
  if (channel === "youtube-community") return "https://www.youtube.com/";
  if (channel === "instagram") return "https://www.instagram.com/";
  return null;
}
