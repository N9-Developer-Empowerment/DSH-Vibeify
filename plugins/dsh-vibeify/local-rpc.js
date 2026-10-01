// Small authenticated local settings requests; never exposes provider diagnostics.
const MAX_REQUEST_BYTES = 32_768;
const error = (code, message) => ({ ok: false, error: { code, message, details: {} } });

function reply(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function handleRequest(ctx, channel, handler, req, res) {
  const address = req.socket?.remoteAddress;
  const loopback = address === "::1" || address === "127.0.0.1" || address === "::ffff:127.0.0.1";
  const rejection = loopback ? ctx.connection.requestRejection(req) : 403;
  if (rejection !== undefined) {
    res.writeHead(rejection, { "cache-control": "no-store" });
    res.end(rejection === 401 ? "unauthorized" : "forbidden");
    return;
  }
  const pathname = new URL(req.url ?? "/", "http://dsh.internal").pathname;
  const endpoint = pathname.startsWith(`${channel}/`) ? pathname.slice(channel.length + 1) : "";
  if (req.method !== "POST" || !/^[A-Za-z0-9_$.-]+$/.test(endpoint)) {
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
    ? await handler(endpoint, message.payload, abort.signal)
    : error("gateway/bad-request", "The request method did not match its endpoint.");
  if (!res.writableEnded && !res.destroyed) reply(res, 200, { type: "server-response", rpcId: message.rpcId, result });
}

export function registerLocalRpc(ctx, channel, handler) {
  // Current HostConnectionService.rpc.handle reaches an undeclared webServer
  // property in the provider context. Register the same authenticated envelope
  // directly through the webServer service until that host defect is fixed.
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: channel,
    handler: async (req, res) => {
      try { await handleRequest(ctx, channel, handler, req, res); }
      catch { if (!res.writableEnded && !res.destroyed) reply(res, 500, { error: "service-failed" }); }
    },
  }), `Vibeify: authenticated local RPC ${channel}`);
}

