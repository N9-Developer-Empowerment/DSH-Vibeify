import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import {
  createUpdateChecker,
  installedDshVersion,
  registerUpdateRpc,
} from "./update-check.js";

const require = createRequire(import.meta.url);
const packageManifest = JSON.parse(readFileSync(require.resolve("./package.json"), "utf8"));

const name = "dsh-vibeify-experience";
const inject = [];

function apply(ctx) {
  const updateChecker = createUpdateChecker({
    current: {
      dsh: installedDshVersion,
      vibeify: packageManifest.version,
      codex: null,
    },
  });
  ctx.inject(["connection"], (connectionCtx) => registerUpdateRpc(connectionCtx, updateChecker));
}

export { apply, inject, name };
