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

  try {
    await executable(path.join(bin, "npm"), `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const args=process.argv.slice(2);appendFileSync(process.env.OPERATIONS,\`npm \${args.join(" ")}\\n\`);
if(args[0]==="view"){console.log("0.1.1-rc.2");process.exit(0)}
if(args[0]==="install")process.exit(0);
if(args[0]==="pack"){const r=spawnSync(process.env.REAL_NPM,args,{stdio:"inherit",env:process.env});process.exit(r.status??1)}
if(args[0]==="--version"){console.log("11.6.2");process.exit(0)}
process.exit(0);
`);
    await executable(path.join(bin, "dsh"), `#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const args=process.argv.slice(2);appendFileSync(process.env.OPERATIONS,\`dsh \${args.join(" ")}\\n\`);
if(args.includes("--version")){console.log("0.1.1-rc.2");process.exit(0)}
if(args[0]==="plugin"&&args.includes("add")){
 const profile=args[args.indexOf("--profile")+1]||"web";const source=args[args.indexOf("--workspace-root")+1]||"";
 const name=source.includes("dsh-visuals")?"dsh-visuals":source.includes("dsh-vibeify-experience")?"dsh-vibeify-experience":"dsh-vibeify";
 const dir=path.join(process.env.DSH_HOME,"profiles",profile);mkdirSync(dir,{recursive:true});
 const manifest=path.join(dir,"package.json");const current=existsSync(manifest)?JSON.parse(readFileSync(manifest,"utf8")):{dependencies:{},dsh:{profile:{bundles:[]}}};
 current.dependencies[name]=source;if(!current.dsh.profile.bundles.includes(name))current.dsh.profile.bundles.push(name);
 writeFileSync(manifest,JSON.stringify(current,null,2));process.exit(0);
}
if(args.includes("--dump-config")){console.log("name: dsh-vibeify-experience");process.exit(0)}
process.exit(0);
`);
    await executable(path.join(bin, "curl"), `#!/bin/bash
printf 'curl %s\\n' "$*" >>"$OPERATIONS"
if [[ "$*" == *"127.0.0.1"* ]]; then exit 0; fi
exec "$REAL_CURL" "$@"
`);
    await executable(path.join(bin, "lsof"), "#!/bin/bash\nexit 1\n");
    await executable(path.join(bin, "open"), "#!/bin/bash\nprintf 'open %s\\n' \"$*\" >>\"$OPERATIONS\"\nexit 0\n");

    const result = spawnSync(installerUnderTest, [], {
      cwd: root,
      encoding: "utf8",
      env: {
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
        TERM: "xterm",
      },
      input: "4\n\n",
      timeout: 120_000,
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /DSH Vibeify is ready/);
    const startPattern = new RegExp(`dsh --profile web --no-open --host 127\\.0\\.0\\.1 --port ${expectedPort}`);
    const log = await waitForOperation(operations, startPattern);
    assert.match(log, /npm view @deepseek-ai\/dsh@latest version/);
    assert.match(log, /npm pack .*dsh-vibeify-experience/);
    assert.match(log, /npm pack .*dsh-visuals/);
    assert.match(log, /dsh plugin --profile web add --workspace-root file:/);
    assert.match(log, startPattern);
    const profile = JSON.parse(await readFile(path.join(dshHome, "profiles", "web", "package.json"), "utf8"));
    assert.ok(profile.dependencies["dsh-vibeify-experience"]);
    assert.ok(profile.dependencies["dsh-visuals"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
