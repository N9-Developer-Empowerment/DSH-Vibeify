import { handleRequest } from "../src/worker.mjs";

export function onRequest({ request, env }) {
  return handleRequest(request, env);
}
