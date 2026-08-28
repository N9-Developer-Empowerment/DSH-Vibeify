#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = fileURLToPath(import.meta.url);
const defaultDelayMs = 15_000;
const defaultPort = 3080;
const defaultProfile = "web";

export function withoutProviderKeys(environment) {
  const clean = { ...environment };
  delete clean.OPENAI_API_KEY;
  delete clean.OPENAI_API_KEY_PATH;
  return clean;
}

export function parseListenerPids(output) {
  return [...new Set(String(output)
    .split(/\s+/)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0))];
}

export function isDshWebCommand(command) {
  const normalized = String(command).trim().replace(/\s+/g, " ");
  if (!/(?:^|[ /])dsh(?: |$)/.test(normalized)) return false;
  return /(?:^| )web(?: |$)/.test(normalized)
    || /(?:^| )--profile(?:=| )web(?: |$)/.test(normalized);
}

function parseOptions(arguments_) {
  const [action = "status", ...rest] = arguments_;
  const options = {
    action,
    confirmedIdle: false,
    delayMs: defaultDelayMs,
    id: null,
    port: defaultPort,
    profile: defaultProfile,
  };
  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value === "--confirmed-idle") options.confirmedIdle = true;
    else if (value === "--delay-ms") options.delayMs = Number(rest[++index]);
    else if (value === "--id") options.id = rest[++index];
    else if (value === "--port") options.port = Number(rest[++index]);
    else if (value === "--profile") options.profile = rest[++index];
    else throw new Error(`Unknown option: ${value}`);
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65_535) {
    throw new Error("--port must be an integer from 1 to 65535");
  }
  if (!Number.isInteger(options.delayMs) || options.delayMs < 0 || options.delayMs > 120_000) {
    throw new Error("--delay-ms must be an integer from 0 to 120000");
  }
  return options;
}

function statePaths(environment = process.env) {
  const dshHome = environment.DSH_HOME || path.join(os.homedir(), ".dsh");
  const stateDirectory = path.join(dshHome, "state");
  const logDirectory = path.join(dshHome, "logs");
  return {
    latest: path.join(stateDirectory, "vibeify-restart.json"),
    logDirectory,
    stateDirectory,
  };
}

async function writeStatus(status, environment = process.env) {
  const locations = statePaths(environment);
  await mkdir(locations.stateDirectory, { recursive: true });
  const temporary = `${locations.latest}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(status, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, locations.latest);
}

async function readStatus(environment = process.env) {
  const { latest } = statePaths(environment);
  try {
    return JSON.parse(await readFile(latest, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return { state: "none" };
    throw error;
  }
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function httpReady(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await new Promise((resolve) => {
      const request = http.get({ host: "127.0.0.1", path: "/", port, timeout: 750 }, (response) => {
        response.resume();
        resolve(response.statusCode >= 200 && response.statusCode < 500);
      });
      request.once("error", () => resolve(false));
      request.once("timeout", () => {
        request.destroy();
        resolve(false);
      });
    });
    if (ready) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function waitForExit(child, timeoutMs = 5_000) {
  if (child.exitCode !== null) return true;
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  return child.exitCode !== null;
}

async function dshCommand() {
  const { stdout } = await execFileAsync("which", ["dsh"]);
  const resolved = stdout.trim();
  if (!resolved) throw new Error("DSH command is unavailable.");
  return resolved;
}

async function canary(profile, environment) {
  const port = await freePort();
  const output = [];
  const executable = await dshCommand();
  const child = spawn(executable, ["--profile", profile, "--no-open", "--host", "127.0.0.1", "--port", String(port)], {
    env: withoutProviderKeys(environment),
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => output.push(String(chunk)));
  child.stderr.on("data", (chunk) => output.push(String(chunk)));
  await new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  const ready = await httpReady(port, 15_000);
  if (child.pid) child.kill("SIGTERM");
  const exited = await waitForExit(child);
  if (!exited) throw new Error(`Canary DSH on port ${port} did not stop after SIGTERM.`);
  if (!ready) {
    const detail = output.join("").trim().slice(-2_000);
    throw new Error(`Canary DSH boot failed before the live listener was touched.${detail ? `\n${detail}` : ""}`);
  }
  return port;
}

async function listenerPids(port) {
  try {
    const { stdout } = await execFileAsync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"]);
    return parseListenerPids(stdout);
  } catch (error) {
    if (error?.code === 1) return [];
    throw error;
  }
}

async function processCommand(pid) {
  const { stdout } = await execFileAsync("ps", ["-p", String(pid), "-o", "command="]);
  return stdout.trim();
}

async function waitForPidExit(pid, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error?.code === "ESRCH") return true;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function queue(options) {
  if (!options.confirmedIdle) {
    throw new Error("Refusing to queue a restart without --confirmed-idle after explicit user authorization.");
  }
  const canaryPort = await canary(options.profile, process.env);
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const locations = statePaths();
  await mkdir(locations.logDirectory, { recursive: true });
  const handoffLog = path.join(locations.logDirectory, `vibeify-restart-${id}.log`);
  const status = {
    canaryPort,
    id,
    port: options.port,
    profile: options.profile,
    queuedAt: new Date().toISOString(),
    state: "queued",
  };
  await writeStatus(status);
  const logFd = openSync(handoffLog, "a", 0o600);
  const child = spawn(process.execPath, [scriptPath, "worker", "--id", id, "--profile", options.profile, "--port", String(options.port), "--delay-ms", String(options.delayMs)], {
    detached: true,
    env: withoutProviderKeys(process.env),
    stdio: ["ignore", logFd, logFd],
  });
  await new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  child.unref();
  closeSync(logFd);
  process.stdout.write(`${JSON.stringify({ ...status, handoffLog, workerPid: child.pid }, null, 2)}\n`);
}

async function worker(options) {
  const previous = await readStatus();
  if (!options.id || previous.id !== options.id) throw new Error("Restart handoff id is absent or stale.");
  await new Promise((resolve) => setTimeout(resolve, options.delayMs));
  await writeStatus({ ...previous, state: "stopping", stoppingAt: new Date().toISOString() });
  const pids = await listenerPids(options.port);
  if (pids.length > 1) throw new Error(`Refusing to stop multiple listeners on port ${options.port}: ${pids.join(", ")}`);
  if (pids.length === 1) {
    const command = await processCommand(pids[0]);
    if (!isDshWebCommand(command)) {
      throw new Error(`Refusing to stop non-DSH listener on port ${options.port}: ${command}`);
    }
    process.kill(pids[0], "SIGTERM");
    if (!await waitForPidExit(pids[0])) throw new Error(`DSH process ${pids[0]} did not stop after SIGTERM.`);
  }

  const locations = statePaths();
  await mkdir(locations.logDirectory, { recursive: true });
  const serverLog = path.join(locations.logDirectory, "dsh-web.log");
  const serverFd = openSync(serverLog, "a", 0o600);
  const executable = await dshCommand();
  const server = spawn(executable, ["--profile", options.profile, "--no-open", "--host", "127.0.0.1", "--port", String(options.port)], {
    detached: true,
    env: withoutProviderKeys(process.env),
    stdio: ["ignore", serverFd, serverFd],
  });
  await new Promise((resolve, reject) => {
    server.once("spawn", resolve);
    server.once("error", reject);
  });
  server.unref();
  closeSync(serverFd);
  await writeStatus({ ...previous, serverLog, serverPid: server.pid, startedAt: new Date().toISOString(), state: "starting" });
  if (!await httpReady(options.port, 30_000)) {
    throw new Error(`Replacement DSH did not become healthy on port ${options.port}.`);
  }
  await writeStatus({
    ...previous,
    httpStatus: 200,
    serverLog,
    serverPid: server.pid,
    state: "succeeded",
    verifiedAt: new Date().toISOString(),
  });
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.action === "queue") await queue(options);
  else if (options.action === "canary") {
    const port = await canary(options.profile, process.env);
    process.stdout.write(`${JSON.stringify({ canaryPort: port, profile: options.profile, state: "succeeded" }, null, 2)}\n`);
  }
  else if (options.action === "worker") {
    try {
      await worker(options);
    } catch (error) {
      const previous = await readStatus();
      await writeStatus({ ...previous, error: error.message, failedAt: new Date().toISOString(), state: "failed" });
      throw error;
    }
  } else if (options.action === "status") {
    process.stdout.write(`${JSON.stringify(await readStatus(), null, 2)}\n`);
  } else {
    throw new Error("Usage: dsh-restart.mjs queue --confirmed-idle [--profile web] [--port 3080] | canary [--profile web] | status");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
