import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
export function rpcHarness(rejection) {
  let route;
  return {
    get route() { return route; },
    ctx: { connection: { requestRejection: () => rejection }, webServer: { register(value) { route = value; return () => {}; } }, effect: (setup) => setup() },
  };
}
export async function callRpc(route, endpoint, payload, options = {}) {
  const body = options.body ?? JSON.stringify({ type: "client-request", rpcId: "test", method: options.endpointMethod ?? endpoint, payload });
  const req = Readable.from([Buffer.from(body)]);
  req.socket = { remoteAddress: options.address ?? "127.0.0.1" };
  req.method = options.method ?? "POST"; req.url = `${route.path}/${endpoint}`;
  req.headers = { "content-type": "application/json", ...options.headers };
  const res = new EventEmitter(); res.writableEnded = false; res.destroyed = false;
  res.writeHead = (status, headers) => { res.status = status; res.headers = headers; };
  res.end = (body) => { res.body = body; res.writableEnded = true; };
  await route.handler(req, res);
  if (res.status === 200) res.result = JSON.parse(res.body).result;
  return res;
}
