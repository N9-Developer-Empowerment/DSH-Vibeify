export const SOCIAL_DESK_RPC_CHANNEL = "/dsh-social-desk";

function error(code, message) {
  return { ok: false, error: { code, message, details: {} } };
}

const ACTIONS = Object.freeze({
  capabilities: (service, payload) => {
    if (payload !== null && (typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length > 0)) throw new TypeError("Invalid capability request.");
    return service.capabilities();
  },
  list: (service, payload) => {
    if (payload !== null && (typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length > 0)) throw new TypeError("Invalid queue request.");
    return service.list();
  },
  prepare: (service, payload) => service.prepare(payload),
  "approve-and-schedule": (service, payload) => service.approveAndSchedule(payload),
  cancel: (service, payload) => service.cancel(payload),
  retry: (service, payload) => service.retry(payload),
  "record-manual-post": (service, payload) => service.recordManualPost(payload),
});

export function registerSocialDeskRpc(ctx, service) {
  ctx.effect(() => ctx.connection.rpc.handle(
    SOCIAL_DESK_RPC_CHANNEL,
    async (endpoint, payload) => {
      try {
        const action = ACTIONS[endpoint];
        if (action === undefined) return error("not-found", "Unknown Social Desk action.");
        return { ok: true, value: await action(service, payload) };
      } catch (cause) {
        const code = typeof cause?.code === "string" && /^[a-z0-9-]{3,80}$/i.test(cause.code) ? cause.code : cause instanceof TypeError ? "invalid-request" : "social-desk-failed";
        const publicMessages = {
          "not-found": "That Social Desk item was not found.",
          "invalid-state": "That post has changed state. Refresh Social Desk and review it again.",
          "revision-conflict": "That draft changed. Review the latest copy before approval.",
          "invalid-copy": "Check the post length and try again.",
          "channel-not-configured": "Connect this channel in Settings before approving it.",
          "image-required": "This channel needs a public article image.",
        };
        return error(code, publicMessages[code] ?? (cause instanceof TypeError ? "The Social Desk request was invalid." : "Social Desk could not complete that action."));
      }
    },
    { authority: "loopback" },
  ));
}

