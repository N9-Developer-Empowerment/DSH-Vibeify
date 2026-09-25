import { homedir } from "node:os";
import { join } from "node:path";

import { credentialRef } from "@deepseek-ai/dsh-credentials";

import { createOfficialConnectorRegistry } from "./official-connectors.js";
import { Config, installSocialDeskSettings } from "./settings.js";
import { createSocialDeskService } from "./social-desk-service.js";
import { createFileQueueStore } from "./social-queue-store.js";
import { registerSocialDeskRpc } from "./social-rpc.js";

const name = "dsh-social-desk";
const inject = [];
const SCHEDULER_INTERVAL_MS = 30_000;

export function socialDeskQueuePath(environment = process.env, userHome = homedir()) {
  const dshHome = typeof environment.DSH_HOME === "string" && environment.DSH_HOME !== ""
    ? environment.DSH_HOME
    : join(userHome, ".dsh");
  return join(dshHome, "vibe-social-desk", "queue.json");
}

function apply(ctx, config) {
  const getConfig = installSocialDeskSettings(ctx, config);
  const resolveCredential = async (ref) => {
    const hit = await ctx.get("credentials")?.resolve(credentialRef(ref));
    return hit?.value;
  };
  const connectors = createOfficialConnectorRegistry({ getConfig, resolveCredential });
  const service = createSocialDeskService({
    store: createFileQueueStore(socialDeskQueuePath()),
    getConfig,
    connectorFor: (channel) => connectors[channel] ?? null,
  });

  ctx.inject(["connection"], (connectionCtx) => registerSocialDeskRpc(connectionCtx, service));
  ctx.effect(() => {
    let active = true;
    void service.recover().then(() => active ? service.tick() : null).catch(() => {});
    const timer = setInterval(() => { if (active) void service.tick().catch(() => {}); }, SCHEDULER_INTERVAL_MS);
    timer.unref?.();
    return () => { active = false; clearInterval(timer); };
  }, "dsh-social-desk: recover the local queue and run approved schedules");
}

export { Config, apply, inject, name };

