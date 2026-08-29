#!/usr/bin/env node
import os from "node:os";
import process from "node:process";
import { spawnSync } from "node:child_process";

function commandVersion(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 5_000,
    windowsHide: true,
  });
  if (result.error?.code === "ENOENT") return "not found";
  if (result.status !== 0) return "present, version unavailable";
  return `${result.stdout || result.stderr}`.trim().split(/\r?\n/, 1)[0] || "present";
}

async function localPageStatus() {
  try {
    const response = await fetch("http://127.0.0.1:3080/", {
      signal: AbortSignal.timeout(2_000),
      redirect: "manual",
    });
    return `reachable (HTTP ${response.status})`;
  } catch {
    return "not reachable";
  }
}

const report = [
  "DSH Vibeify privacy-safe support report",
  `Operating system: ${process.platform} ${os.release()}`,
  `Processor: ${process.arch}`,
  `Node.js: ${process.version}`,
  `npm: ${commandVersion(process.platform === "win32" ? "npm.cmd" : "npm", ["--version"])}`,
  `DSH: ${commandVersion(process.platform === "win32" ? "dsh.cmd" : "dsh", ["--version"])}`,
  `Codex command: ${commandVersion(process.platform === "win32" ? "codex.cmd" : "codex", ["--version"])}`,
  `Local DSH page: ${await localPageStatus()}`,
];

if (process.argv.includes("--prompt")) {
  console.log(`I am trying to install or update the open-source DSH Vibeify plugin. Please help me diagnose the problem step by step, using official DSH Vibeify, DeepSeek Harness, Node.js, OpenAI, or Google documentation where possible.

${report.join("\n")}

What I clicked or ran:
[describe the step]

Exact error message:
[paste only the error message]

Important privacy rule: do not ask me to paste API keys, passwords, cookies, OAuth tokens, .credentials.yaml, private prompts, session transcripts, or the contents of my DSH profile. If more evidence is needed, tell me how to collect a redacted diagnostic.`);
} else {
  console.log(report.join("\n"));
  console.log("\nThis report intentionally excludes credentials, account details, file paths, prompts, sessions, and profile contents.");
}
