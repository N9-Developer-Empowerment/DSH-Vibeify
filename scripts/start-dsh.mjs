#!/usr/bin/env node
import { mkdirSync, openSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const profileIndex = args.indexOf("--profile");
const profile = profileIndex >= 0 ? args[profileIndex + 1] : "web";
const portIndex = args.indexOf("--port");
const port = portIndex >= 0 ? args[portIndex + 1] : "3080";
const allowed = new Set(["--profile", "--host", "--port"]);
for (let index = 0; index < args.length; index += 2) {
  if (!allowed.has(args[index]) || args[index + 1] === undefined) {
    throw new Error("Usage: start-dsh.mjs [--profile name] [--host 127.0.0.1] [--port number]");
  }
}
if (!/^[A-Za-z0-9._-]+$/.test(profile)) throw new Error("DSH profile name is invalid");
if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65_535) {
  throw new Error("DSH port is invalid");
}
const home = process.env.DSH_HOME || path.join(process.env.USERPROFILE || process.env.HOME || ".", ".dsh");
const logDirectory = path.join(home, "logs");
mkdirSync(logDirectory, { recursive: true });
const log = openSync(path.join(logDirectory, "dsh-web.log"), "a");
const environment = { ...process.env };
delete environment.OPENAI_API_KEY;
delete environment.OPENAI_API_KEY_PATH;

const child = spawn("dsh", ["--profile", profile, "--no-open", "--host", "127.0.0.1", "--port", port], {
  detached: true,
  env: environment,
  shell: process.platform === "win32",
  stdio: ["ignore", log, log],
  windowsHide: true,
});
child.unref();
console.log(`DSH launch queued as process ${child.pid}.`);
