const VISUAL_RPC_CHANNEL = "/dsh-visuals";

function error(code, message) {
  return { ok: false, error: { code, message, details: {} } };
}

export function registerVisualRpc(ctx, service) {
  ctx.effect(() => ctx.connection.rpc.handle(
    VISUAL_RPC_CHANNEL,
    async (endpoint, payload, signal) => {
      try {
        if (endpoint === "capabilities") {
          if (payload !== null && (typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length > 0)) {
            return error("invalid-request", "The visual capability request was invalid.");
          }
          return { ok: true, value: await service.capabilities() };
        }
        if (endpoint === "search") return { ok: true, value: await service.search(payload, signal) };
        return error("not-found", "Unknown visual-source action.");
      } catch (cause) {
        if (cause instanceof TypeError) return error("invalid-request", "The public visual search brief was invalid.");
        return error("visual-search-failed", "The visual sources could not be checked. VIBE kept its local fallback.");
      }
    },
    { authority: "loopback" },
  ));
}

export { VISUAL_RPC_CHANNEL };
