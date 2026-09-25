import { homedir } from "node:os";
import { join } from "node:path";

import { Config } from "./settings.js";
import { createSocialDeskService } from "./social-desk-service.js";
import { createFileQueueStore } from "./social-queue-store.js";
import { registerSocialDeskRpc } from "./social-rpc.js";

const name = "dsh-social-desk";
const inject = [];

export function socialDeskQueuePath(environment = process.env, userHome = homedir()) {
  const dshHome = typeof environment.DSH_HOME === "string" && environment.DSH_HOME !== ""
    ? environment.DSH_HOME
    : join(userHome, ".dsh");
  return join(dshHome, "vibe-social-desk", "queue.json");
}

function apply(ctx) {
  const service = createSocialDeskService({
    store: createFileQueueStore(socialDeskQueuePath()),
  });

  ctx.inject(["connection"], (connectionCtx) => registerSocialDeskRpc(connectionCtx, service));
}

export { Config, apply, inject, name };
