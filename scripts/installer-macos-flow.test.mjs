import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const installerUnderTest = process.env.DSH_VIBEIFY_INSTALLER_UNDER_TEST
  || path.join(root, "scripts", "Install DSH Vibeify.command");
const expectedPort = process.env.DSH_VIBEIFY_EXPECTED_PORT || "39989";
const qualifiedDshVersion = JSON.parse(await readFile(path.join(root, "plugins", "dsh-vibeify", "package.json"), "utf8"))
  .peerDependencies["@deepseek-ai/dsh-agent"];

async function executable(filePath, source) {
  await writeFile(filePath, source, "utf8");
  await chmod(filePath, 0o755);
}

async function waitForOperation(filePath, pattern, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  let source = "";
  while (Date.now() < deadline) {
    source = await readFile(filePath, "utf8").catch(() => "");
    if (pattern.test(source)) return source;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return source;
}

test("macOS installer completes against the current checkout with all mutations isolated", {
  skip: process.platform !== "darwin",
  timeout: 120_000,
}, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "dsh-vibeify-installer-flow-"));
  const bin = path.join(directory, "bin");
  const dshHome = path.join(directory, "dsh-home");
  const fakeHome = path.join(directory, "home");
  const operations = path.join(directory, "operations.log");
  await mkdir(bin, { recursive: true });
  await mkdir(fakeHome, { recursive: true });
  const profileDirectory = path.join(dshHome, "profiles", "web");
  await mkdir(profileDirectory, { recursive: true });
  await writeFile(path.join(profileDirectory, "package.json"), JSON.stringify({
    dependencies: { "dsh-vibeify": "file:/existing/governed-plugin.tgz" },
    dsh: { profile: { bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-vibeify"] } },
  }));
  const npmRoot = path.join(directory, "npm-global");
  const runtimeRoot = path.join(npmRoot, "@deepseek-ai", "dsh");
  await mkdir(runtimeRoot, { recursive: true });
  await writeFile(path.join(runtimeRoot, "package.json"), JSON.stringify({ name: "@deepseek-ai/dsh", version: qualifiedDshVersion }));
  const upstreamManifests = {
    "dsh-base": { dependencies: ["dsh-agent", "dsh-agent-preset-registry", "dsh-tools", "dsh-subagent", "dsh-tool-subagent", "dsh-app-boot"] },
    "dsh-web-app": { dependencies: ["dsh-agent", "dsh-agent-preset-registry", "dsh-tools", "dsh-subagent", "dsh-tool-subagent", "dsh-app-boot"] },
    "dsh-agent-preset-registry": { peerDependencies: ["dsh-agent-preset"] },
    "dsh-agent": { peerDependencies: ["dsh-scope", "dsh-session"] },
    "dsh-tools": { dependencies: ["dsh-scope"] },
    "dsh-subagent": { peerDependencies: ["dsh-scope"] },
    "dsh-tool-subagent": { peerDependencies: ["dsh-scope"] },
    "dsh-scope": { dependencies: ["dsh-session"] },
    "dsh-agent-preset": {},
    "dsh-session": {},
  };
  for (const [name, { dependencies = [], peerDependencies = [] }] of Object.entries(upstreamManifests)) {
    const folder = path.join(runtimeRoot, "node_modules", "@deepseek-ai", name);
    await mkdir(folder, { recursive: true });
    const manifest = {
      name: `@deepseek-ai/${name}`,
      version: qualifiedDshVersion,
      dependencies: Object.fromEntries(dependencies.map((dependency) => [`@deepseek-ai/${dependency}`, qualifiedDshVersion])),
      peerDependencies: Object.fromEntries(peerDependencies.map((dependency) => [`@deepseek-ai/${dependency}`, qualifiedDshVersion])),
    };
    await writeFile(path.join(folder, "package.json"), JSON.stringify(manifest));
  }
  for (const name of ["dsh-app-boot"]) {
    const folder = path.join(runtimeRoot, "node_modules", "@deepseek-ai", name);
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, "package.json"), JSON.stringify({ name: `@deepseek-ai/${name}`, version: qualifiedDshVersion }));
  }
  const bootPackage = path.join(runtimeRoot, "node_modules", "@deepseek-ai", "dsh-app-boot");
  await mkdir(bootPackage, { recursive: true });
  await writeFile(path.join(bootPackage, "package.json"), JSON.stringify({ name: "@deepseek-ai/dsh-app-boot", version: qualifiedDshVersion }));

  try {
    await executable(path.join(bin, "node"), `#!/bin/bash
if [[ "\${1:-}" == *"dsh-web-readiness.mjs" ]]; then
  printf 'readiness %s\\n' "$2" >>"$OPERATIONS"
  if [[ "$2" == "url" ]]; then printf 'http://127.0.0.1:39989/?token=fixtureOnlyToken'; fi
  exit 0
fi
exec "$REAL_NODE" "$@"
`);
    await executable(path.join(bin, "npm"), `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const args=process.argv.slice(2);appendFileSync(process.env.OPERATIONS,\`npm \${args.join(" ")}\\n\`);
if(args[0]==="view"){console.log("${qualifiedDshVersion}");process.exit(0)}
if(args[0]==="install")process.exit(0);
if(args[0]==="root"){console.log(process.env.FAKE_NPM_ROOT);process.exit(0)}
if(args[0]==="pack"){const r=spawnSync(process.env.REAL_NPM,args,{stdio:"inherit",env:process.env});process.exit(r.status??1)}
if(args[0]==="--version"){console.log("11.6.2");process.exit(0)}
process.exit(0);
`);
    await executable(path.join(bin, "dsh"), `#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
const args=process.argv.slice(2);appendFileSync(process.env.OPERATIONS,\`dsh \${args.join(" ")}\\n\`);
if(args.includes("--version")){console.log("${qualifiedDshVersion}");process.exit(0)}
if(args[0]==="plugin"&&args.includes("install")){
 const dir=path.join(process.env.DSH_HOME,"profiles",args[args.indexOf("--profile")+1]||"web");
 for(const name of ["dsh-agent","dsh-agent-preset-registry","dsh-tools","dsh-subagent","dsh-tool-subagent","dsh-scope"]){
  const folder=path.join(dir,"node_modules","@deepseek-ai",name);mkdirSync(folder,{recursive:true});
  writeFileSync(path.join(folder,"package.json"),JSON.stringify({name:"@deepseek-ai/"+name,version:"${qualifiedDshVersion}"}));
 }
 const boot=path.join(dir,"node_modules","@deepseek-ai","dsh-app-boot");
 mkdirSync(path.dirname(boot),{recursive:true});
 symlinkSync(path.join(process.env.FAKE_NPM_ROOT,"@deepseek-ai","dsh","node_modules","@deepseek-ai","dsh-app-boot"),boot,"dir");
 process.exit(0);
}
if(args[0]==="plugin"&&args.includes("add")){
 const profile=args[args.indexOf("--profile")+1]||"web";const source=args[args.indexOf("--workspace-root")+1]||"";
 const name=source.includes("dsh-social-desk")?"dsh-social-desk":source.includes("dsh-visuals")?"dsh-visuals":source.includes("dsh-vibeify-experience")?"dsh-vibeify-experience":"dsh-vibeify";
 const dir=path.join(process.env.DSH_HOME,"profiles",profile);mkdirSync(dir,{recursive:true});
 const manifest=path.join(dir,"package.json");const current=existsSync(manifest)?JSON.parse(readFileSync(manifest,"utf8")):{dependencies:{},dsh:{profile:{bundles:["@deepseek-ai/dsh-base","@deepseek-ai/dsh-web-app"]}}};
 current.dependencies[name]=source;if(!current.dsh.profile.bundles.includes(name))current.dsh.profile.bundles.push(name);
 writeFileSync(manifest,JSON.stringify(current,null,2));process.exit(0);
}
if(args.includes("--dump-config")){const profile=args[args.indexOf("--profile")+1]||"web";const manifest=JSON.parse(readFileSync(path.join(process.env.DSH_HOME,"profiles",profile,"package.json"),"utf8"));console.log("name: dsh-vibeify\\nprovider: "+(manifest.dependencies["dsh-vibeify"]?"codex-chatgpt":"deepseek"));process.exit(0)}
process.exit(0);
`);
    await executable(path.join(bin, "curl"), `#!/bin/bash
printf 'curl %s\\n' "$*" >>"$OPERATIONS"
exec "$REAL_CURL" "$@"
`);
    await executable(path.join(bin, "lsof"), '#!/bin/bash\nif [[ -n "${LSOF_PID:-}" ]]; then printf "%s\\n" "$LSOF_PID"; exit 0; fi\nexit 1\n');
    await executable(path.join(bin, "ps"), '#!/bin/bash\nprintf "%s\\n" "${FAKE_PROCESS_COMMAND:-}"\n');
    await executable(path.join(bin, "codex"), '#!/bin/bash\nprintf "codex %s\\n" "$*" >>"$OPERATIONS"\nif [[ "$*" == "login status" ]]; then echo "Logged in using ChatGPT"; fi\n');
    await executable(path.join(bin, "open"), "#!/bin/bash\nprintf 'open authenticated-local-page\\n' >>\"$OPERATIONS\"\nexit 0\n");

    const testEnvironment = {
        ...process.env,
        CODEX_HOME: path.join(directory, "codex-home"),
        DSH_HOME: dshHome,
        DSH_VIBEIFY_SOURCE_DIRECTORY: root,
        DSH_PROFILE: "web",
        DSH_PORT: "39989",
        HOME: fakeHome,
        OPERATIONS: operations,
        PATH: `${bin}:${process.env.PATH}`,
        REAL_CURL: spawnSync("which", ["curl"], { encoding: "utf8" }).stdout.trim(),
        REAL_NPM: spawnSync("which", ["npm"], { encoding: "utf8" }).stdout.trim(),
        REAL_NODE: process.execPath,
        FAKE_NPM_ROOT: npmRoot,
        TERM: "xterm",
      };
    const result = spawnSync(installerUnderTest, [], {
      cwd: root,
      encoding: "utf8",
      env: testEnvironment,
      input: "\n",
      timeout: 120_000,
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /DSH Vibeify is ready/);
    const startPattern = new RegExp(`dsh --profile web --no-open --host 127\\.0\\.0\\.1 --port ${expectedPort}`);
    const log = await waitForOperation(operations, startPattern);
    assert.doesNotMatch(log, /npm view @deepseek-ai\/dsh@latest version/);
    assert.match(log, /dsh --version/);
    assert.match(log, /npm pack .*dsh-vibeify-/);
    assert.match(log, /npm pack .*dsh-visuals/);
    assert.match(log, /npm pack .*dsh-social-desk/);
    assert.match(log, /dsh plugin --profile web add --workspace-root file:/);
    assert.match(log, /codex login status/);
    assert.match(log, startPattern);
    assert.match(log, /readiness check/);
    assert.match(log, /readiness url/);
    assert.match(log, /open authenticated-local-page/);
    assert.doesNotMatch(log, /fixtureOnlyToken/);
    const profile = JSON.parse(await readFile(path.join(dshHome, "profiles", "web", "package.json"), "utf8"));
    assert.ok(profile.dependencies["dsh-vibeify"]);
    assert.ok(profile.dependencies["dsh-visuals"]);
    assert.ok(profile.dependencies["dsh-social-desk"]);

    const priorOperations = await readFile(operations, "utf8");
    const declined = spawnSync(installerUnderTest, [], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...testEnvironment,
        LSOF_PID: "424242",
        FAKE_PROCESS_COMMAND: "/opt/homebrew/bin/dsh --profile web --no-open --host 127.0.0.1 --port 39989",
      },
      input: "NO\n",
      timeout: 120_000,
    });
    assert.equal(declined.status, 0, `${declined.stdout}\n${declined.stderr}`);
    assert.match(declined.stdout, /No software or profile changes were made/);
    assert.equal(await readFile(operations, "utf8"), priorOperations);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
