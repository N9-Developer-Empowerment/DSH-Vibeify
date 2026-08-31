import { credentialRef } from "@deepseek-ai/dsh-credentials";

import { Config, installVisualSettings } from "./settings.js";
import { createVisualService } from "./visual-service.js";
import { registerVisualRpc } from "./visual-rpc.js";

const name = "dsh-visuals";
const inject = [];

function apply(ctx, config) {
  const getConfig = installVisualSettings(ctx, config);
  const service = createVisualService({
    getConfig,
    resolveCredential: async (ref) => {
      const hit = await ctx.get("credentials")?.resolve(credentialRef(ref));
      return hit?.value;
    },
  });
  ctx.inject(["connection"], (connectionCtx) => registerVisualRpc(connectionCtx, service));
}

export { Config, apply, inject, name };
