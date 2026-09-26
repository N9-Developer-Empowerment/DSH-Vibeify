const VISUAL_RPC_CHANNEL = "/dsh-visuals";
const MAX_REQUEST_BYTES = 32_768;
const ENDPOINTS = new Set(["capabilities", "search", "generate"]);

function error(code, message) {
  return { ok: false, error: { code, message, details: {} } };
}

async function dispatch(service, endpoint, payload, signal) {
  try {
    if (endpoint === "capabilities") {
      if (payload !== null && (typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length > 0)) {
        return error("invalid-request", "The visual capability request was invalid.");
      }
      return { ok: true, value: await service.capabilities() };
    }
    if (endpoint === "search") return { ok: true, value: await service.search(payload, signal) };
    if (endpoint === "generate") return { ok: true, value: await service.generate(payload) };
    return error("not-found", "Unknown visual-source action.");
  } catch (cause) {
    if (cause instanceof TypeError) return error("invalid-request", "The public visual brief was invalid.");
    return error("visual-search-failed", "The visual service is unavailable. VIBE kept its local fallback.");
  }
}

function reply(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function handleRequest(ctx, service, req, res) {
  const rejection = ctx.connection.requestRejection(req);
  if (rejection !== undefined) {
    res.writeHead(rejection, { "cache-control": "no-store" });
    res.end(rejection === 401 ? "unauthorized" : "forbidden");
    return;
  }
  const pathname = new URL(req.url ?? "/", "http://dsh.internal").pathname;
  const endpoint = pathname.startsWith(`${VISUAL_RPC_CHANNEL}/`) ? pathname.slice(VISUAL_RPC_CHANNEL.length + 1) : "";
  if (req.method !== "POST" || !ENDPOINTS.has(endpoint)) {
    reply(res, 404, { error: "not-found" });
    return;
  }
  if (String(req.headers["content-type"] ?? "").split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    reply(res, 415, { error: "content-type" });
    return;
  }
  if (Number(req.headers["content-length"] ?? 0) > MAX_REQUEST_BYTES) {
    reply(res, 413, { error: "request-too-large" });
    return;
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAX_REQUEST_BYTES) {
      reply(res, 413, { error: "request-too-large" });
      return;
    }
    chunks.push(chunk);
  }
  let message;
  try { message = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { reply(res, 400, { error: "invalid-json" }); return; }
  if (message?.type !== "client-request" || typeof message.rpcId !== "string" || message.rpcId.length > 128 || typeof message.method !== "string" || !Object.hasOwn(message, "payload")) {
    reply(res, 400, { error: "invalid-envelope" });
    return;
  }
  const abort = new AbortController();
  res.once("close", () => { if (!res.writableEnded) abort.abort(); });
  const result = message.method === endpoint
    ? await dispatch(service, endpoint, message.payload, abort.signal)
    : error("gateway/bad-request", "The visual method did not match its endpoint.");
  if (!res.writableEnded && !res.destroyed) reply(res, 200, { type: "server-response", rpcId: message.rpcId, result });
}

export function registerVisualRpc(ctx, service) {
  // Current HostConnectionService.rpc.handle reaches an undeclared webServer
  // property in the provider context. Register the same authenticated envelope
  // directly through the webServer service until that host defect is fixed.
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: VISUAL_RPC_CHANNEL,
    handler: async (req, res) => {
      try { await handleRequest(ctx, service, req, res); }
      catch { if (!res.writableEnded && !res.destroyed) reply(res, 500, { error: "visual-service-failed" }); }
    },
  }), "dsh-visuals: authenticated visual RPC route");
}

export { VISUAL_RPC_CHANNEL };
