import { credentialRef } from "@deepseek-ai/dsh-credentials";

import { Config, installVisualSettings } from "./settings.js";
import { createImageGenerator } from "./image-generation.js";
import { createVisualService } from "./visual-service.js";
import { registerVisualRpc } from "./visual-rpc.js";

const name = "dsh-visuals";
const inject = ["connection", "webServer"];

function apply(ctx, config) {
  const getConfig = installVisualSettings(ctx, config);
  const service = createVisualService({
    getConfig,
    resolveCredential: async (ref) => {
      const hit = await ctx.get("credentials")?.resolve(credentialRef(ref));
      return hit?.value;
    },
  });
  const imageGenerator = createImageGenerator();
  // Register during plugin activation, after both host services are present.
  // A deferred injection can miss this route on preview-host startup.
  registerVisualRpc(ctx, { ...service, generate: imageGenerator.generate });
}

export { Config, apply, inject, name };
