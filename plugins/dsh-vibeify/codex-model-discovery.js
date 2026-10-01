import { spawn } from "node:child_process";
import { JsonRpcLineTransport } from "@deepseek-ai/dsh-sdk-protocol";
import { listCodexModels } from "./codex-capability.js";

// Read account capabilities without creating a thread, running inference, or
// exposing account fields to the browser. This process never hosts user work.
export async function discoverCodexModels({ bin, version, signal, spawnProcess = spawn }) {
  const env = { ...process.env };
  for (const key of ["OPENAI_API_KEY", "OPENAI_API_KEY_PATH", "DEEPSEEK_API_KEY", "DEEPSEEK_API_KEY_PATH"]) delete env[key];
  const child = spawnProcess(process.execPath, [bin, "app-server", "--stdio", "-c", 'forced_login_method="chatgpt"'], {
    env, stdio: ["pipe", "pipe", "pipe"],
  });
  const transport = new JsonRpcLineTransport(child.stdout, child.stdin);
  child.stderr.resume();
  const failed = Promise.withResolvers();
  failed.promise.catch(() => {});
  child.once("error", () => failed.reject(new Error("Codex model discovery could not start.")));
  child.once("exit", () => failed.reject(new Error("Codex model discovery ended before completing.")));
  const timeout = AbortSignal.timeout(15_000);
  const bounded = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const request = (method, params) => Promise.race([transport.request(method, params, bounded), failed.promise]);
  try {
    transport.start();
    await request("initialize", {
      clientInfo: { name: "deepseek-harness-codex-models", title: "Vibeify model settings", version },
      capabilities: { experimentalApi: true },
    });
    transport.notify("initialized");
    await transport.flush();
    const account = await request("account/read", { refreshToken: false });
    if (account?.account?.type !== "chatgpt") throw new Error("Sign in to Codex with ChatGPT to choose a model.");
    return await listCodexModels((params) => request("model/list", params));
  } finally {
    transport.close();
    child.stdin.end();
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      const killTimer = setTimeout(() => child.kill("SIGKILL"), 1000);
      killTimer.unref();
      child.once("exit", () => clearTimeout(killTimer));
    }
  }
}
