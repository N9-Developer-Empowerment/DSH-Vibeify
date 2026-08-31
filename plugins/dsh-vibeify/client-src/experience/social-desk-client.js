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

export function manualComposerUrl(channel) {
  return {
    reddit: "https://www.reddit.com/submit",
    discord: "https://discord.com/channels/@me",
    "youtube-community": "https://www.youtube.com/",
    "facebook-profile": "https://www.facebook.com/",
  }[channel] ?? null;
}

