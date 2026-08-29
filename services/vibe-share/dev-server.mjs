import { createServer } from "node:http";

import { handleRequest } from "./src/worker.mjs";

const port = Number(process.env.VIBE_SHARE_PORT ?? 4174);

class LocalDb {
  constructor() { this.rows = new Map(); }
  prepare(sql) {
    return {
      bind: (...values) => ({
        run: async () => {
          if (sql.startsWith("INSERT")) {
            const [slug, snapshotJson, createdAt, expiresAt, deleteTokenHash] = values;
            if (this.rows.has(slug)) throw new Error("duplicate slug");
            this.rows.set(slug, { snapshot_json: snapshotJson, created_at: createdAt, expires_at: expiresAt, delete_token_hash: deleteTokenHash });
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith("DELETE")) {
            const [slug, tokenHash] = values;
            if (this.rows.get(slug)?.delete_token_hash !== tokenHash) return { meta: { changes: 0 } };
            this.rows.delete(slug);
            return { meta: { changes: 1 } };
          }
          throw new Error(`unsupported local query: ${sql}`);
        },
        first: async () => {
          if (!sql.startsWith("SELECT")) throw new Error(`unsupported local query: ${sql}`);
          return this.rows.get(values[0]) ?? null;
        },
      }),
    };
  }
}

const env = { VIBE_SHARE_DB: new LocalDb(), VIBE_SHARE_LOCAL_DEV: "true", VIBE_SHARE_RETENTION_DAYS: "365" };
const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const body = chunks.length === 0 ? undefined : Buffer.concat(chunks);
    const request = new Request(`http://127.0.0.1:${port}${incoming.url}`, {
      method: incoming.method,
      headers: incoming.headers,
      body,
      duplex: body === undefined ? undefined : "half",
    });
    const response = await handleRequest(request, env);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    outgoing.end(error instanceof Error ? error.message : "Local preview failed");
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Vibe share preview: http://127.0.0.1:${port}/new\n`);
});
