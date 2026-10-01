import { createRequire } from "node:module";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

// Version equality is insufficient: dsh-scope owns private Symbols and WeakMaps.
// Resolve from each actual package location, just as Node does at runtime.
export function checkProfileRuntime(packagePath) {
  const require = createRequire(packagePath);
  const consumers = ["dsh-agent", "dsh-agent-preset-registry", "dsh-tools", "dsh-subagent", "dsh-tool-subagent"];
  const scopes = new Set();
  for (const name of consumers) {
    if (!existsSync(join(dirname(packagePath), "node_modules", "@deepseek-ai", name, "package.json"))) {
      throw new Error(`Missing installed profile runtime: ${name}`);
    }
    const manifestPath = realpathSync(require.resolve(`@deepseek-ai/${name}/package.json`));
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.version !== "0.1.7-rc.2") throw new Error(`Unqualified profile runtime: ${name}`);
    const owner = createRequire(manifestPath);
    scopes.add(realpathSync(owner.resolve("@deepseek-ai/dsh-scope/package.json")));
  }
  if (scopes.size !== 1) throw new Error("Split DSH session scopes: reinstall the aligned profile before activation.");
  return consumers.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const count = checkProfileRuntime(process.argv[2]);
  process.stdout.write(`Verified one DSH scope identity across ${count} session/tool services.\n`);
}
