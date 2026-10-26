import { copyFile, readFile, rename, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

export function deepseekLeadProfile(value, codexVersion) {
  if (!/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(codexVersion)) throw new Error("An exact qualified Codex version is required.");
  const profile = structuredClone(value);
  profile.pnpm ??= {};
  profile.pnpm.overrides ??= {};
  profile.pnpm.overrides["@deepseek-ai/dsh-subagent-codex>@openai/codex"] = codexVersion;
  return profile;
}

export function deepseekLeadPatches(value) {
  if (!Array.isArray(value)) throw new Error("The profile patch must be an entry list.");
  const patches = structuredClone(value).filter(row => row.id !== "llm-codex-chatgpt");
  const set = (id, config) => {
    let row = patches.find(item => item.id === id);
    if (!row) patches.push(row = { id });
    row.config = config(row.config ?? {});
  };
  set("agent-default-model", () => ({ provider: "deepseek-official", model: "deepseek-flash" }));
  set("agent-preset-registry", old => ({ ...old, default: "vibeify-deepseek", selectedDefault: "vibeify-deepseek" }));
  return patches;
}

export function restoreLeadPatches(value, backup, mode) {
  const patches = structuredClone(value);
  const previous = id => backup.find(row => row.id === id);
  const model = patches.findIndex(row => row.id === "agent-default-model");
  if (model >= 0 && patches[model].config?.provider === "deepseek-official" && patches[model].config?.model === "deepseek-flash") patches.splice(model, 1);
  const registry = patches.find(row => row.id === "agent-preset-registry");
  if (registry?.config?.selectedDefault === "vibeify-deepseek") {
    const saved = previous("agent-preset-registry")?.config ?? { default: "standard" };
    registry.config = { ...registry.config, ...saved };
    if (!saved.selectedDefault) delete registry.config.selectedDefault;
  }
  if (mode === "chatgpt" && previous("llm-codex-chatgpt") && !patches.some(row => row.id === "llm-codex-chatgpt")) patches.push(structuredClone(previous("llm-codex-chatgpt")));
  return patches;
}

async function saveBackedUp(file, source) {
  const current = await readFile(file, "utf8").catch(error => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  if (source === current) return;
  if (current) await copyFile(file, `${file}.vibeify-pre-deepseek-017-backup`, 1).catch(error => { if (error.code !== "EEXIST") throw error; });
  const temporary = join(dirname(file), `.vibeify-routing-${process.pid}.tmp`);
  await writeFile(temporary, source, { mode: 0o600 });
  await rename(temporary, file);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const restoring = process.argv[2] === "--restore";
  const [profileDirectory, runtimeAnchor, mode] = process.argv.slice(restoring ? 3 : 2);
  if (!profileDirectory || !runtimeAnchor) throw new Error("Usage: configure-deepseek-lead.mjs <profile-directory> <runtime-package.json>");
  const require = createRequire(runtimeAnchor);
  const yaml = require("js-yaml");
  // Treat executable YAML as opaque configuration; never evaluate it here.
  class Expression { constructor(value) { this.value = value; } }
  const schema = yaml.DEFAULT_SCHEMA.extend(new yaml.Type("tag:yaml.org,2002:js", {
    kind: "scalar", construct: value => new Expression(value), instanceOf: Expression, represent: value => value.value,
  }));
  const packagePath = join(profileDirectory, "package.json");
  const patchPath = join(profileDirectory, "cordis.patch.yml");
  const profile = JSON.parse(await readFile(packagePath, "utf8"));
  const patch = yaml.load(await readFile(patchPath, "utf8").catch(error => { if (error.code === "ENOENT") return "[]"; throw error; }), { schema }) ?? [];
  if (restoring) {
    const backup = yaml.load(await readFile(`${patchPath}.vibeify-pre-deepseek-017-backup`, "utf8").catch(error => { if (error.code === "ENOENT") return "[]"; throw error; }), { schema }) ?? [];
    const owned = new Set(["agent-default-model", "agent-preset-registry", "llm-codex-chatgpt"]);
    const restored = restoreLeadPatches(patch.filter(row => owned.has(row.id)), backup.filter(row => owned.has(row.id)), mode);
    await saveBackedUp(patchPath, yaml.dump([...patch.filter(row => !owned.has(row.id)), ...restored], { schema, noRefs: true, lineWidth: -1 }));
    console.log("Restored the selected installation mode's defaults; unrelated settings preserved.");
    process.exit(0);
  }
  // structuredClone drops custom prototypes, so retain unrelated opaque rows.
  const owned = new Set(["llm-codex-chatgpt", "agent-default-model", "agent-preset-registry"]);
  const updatedOwned = deepseekLeadPatches(patch.filter(row => owned.has(row.id)));
  const updated = [...patch.filter(row => !owned.has(row.id)), ...updatedOwned];
  const version = JSON.parse(await readFile(new URL("../plugins/dsh-vibeify/package.json", import.meta.url), "utf8")).dependencies["@openai/codex"];
  await saveBackedUp(packagePath, `${JSON.stringify(deepseekLeadProfile(profile, version), null, 2)}\n`);
  await saveBackedUp(patchPath, yaml.dump(updated, { schema, noRefs: true, lineWidth: -1 }));
  console.log("Configured DeepSeek leadership and the qualified OpenAI worker; unrelated settings preserved.");
}
