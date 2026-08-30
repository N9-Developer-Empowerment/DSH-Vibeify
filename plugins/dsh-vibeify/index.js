import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { LlmAdapter, LlmError } from "@deepseek-ai/dsh-llm";
import { JsonRpcLineTransport } from "@deepseek-ai/dsh-sdk-protocol";
import { finalAssistantOutput } from "@deepseek-ai/dsh-subagent";
import { setApprovalPolicy } from "@deepseek-ai/dsh-user-approval";
import {
  acceptedElicitationContent,
  buildDeveloperRoutingInstructions,
  catalogForModel,
  codexAccessPolicy,
  estimateModelCost,
  formatCostEstimate,
  latestSessionPolicy,
  liveModelCatalog,
  loadRoutingPolicy,
  modelLabel,
  policyModel,
  reasoningLabel,
  runtimeStatus,
  summarizeTokenUsage,
} from "./routing-policy.js";
import { Config, installCodexRuntimeSettings } from "./codex-settings.js";
import { buildDelegationPacket, delegationResultForCodex } from "./delegation-contract.js";
import { reconcileCompletedAnswer, streamTurnResult } from "./progressive-output.js";
import { buildChatVibeInstructions } from "./chat-vibe-contract.js";
import {
  createUpdateChecker,
  installedDshVersion,
  registerUpdateRpc,
} from "./update-check.js";

const PROVIDER = "codex-chatgpt";
const MODEL = "chatgpt-account-default";
const BRIDGE_VERSION = "0.15.3";
const DSH_DELEGATION_TIMEOUT_MS = 5 * 60 * 1000;
const MODEL_CATALOG_TOOL_NAME = "dsh_model_catalog";
const DSH_DELEGATE_TOOL_NAME = "delegate_to_dsh_model";
const ROUTING_POLICY = loadRoutingPolicy();
const MODEL_CATALOG_TOOL = {
  type: "function",
  name: MODEL_CATALOG_TOOL_NAME,
  description: "Return the live DSH model catalogue, capabilities, primary/subagent availability, quality-first routing policy, and dated local price data. This is a local lookup and makes no paid model call. Use it before choosing another model for cost or capability reasons.",
  inputSchema: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
};

function delegateTool(catalog) {
  const routes = catalog.models
    .filter((model) => model.subagentFromCurrentCodex)
    .map((model) => model.route);
  return {
    type: "function",
    name: DSH_DELEGATE_TOOL_NAME,
    description: "Send one bounded execution packet to an available native DSH model. Provide the task, Codex-defined acceptance contract, and required evidence separately. The worker may implement or analyze, but Codex must inspect artifacts/evidence, validate acceptance, integrate, and answer. The call may incur separate provider charges.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          minLength: 1,
          maxLength: 20000,
          description: "The self-contained execution task and relevant context. Do not include leadership or final acceptance.",
        },
        acceptance: {
          type: "string",
          minLength: 1,
          maxLength: 8000,
          description: "The exact acceptance criteria Codex will independently validate after the worker returns.",
        },
        evidence: {
          type: "string",
          minLength: 1,
          maxLength: 8000,
          description: "The artifacts, commands, test results, citations, or structured findings the worker must return for Codex verification.",
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 80,
          description: "A short human-readable label for the delegated work.",
        },
        route: {
          type: "string",
          enum: routes,
          description: "Exact provider/model route from dsh_model_catalog.",
        },
        include_current_images: {
          type: "boolean",
          description: "Forward every image attached to the current user message. Set true only when the user explicitly asks to send those images to the selected image-capable provider.",
        },
      },
      required: ["task", "acceptance", "evidence", "route"],
      additionalProperties: false,
    },
  };
}
const codexPackageJsonPath = createRequire(import.meta.url).resolve("@openai/codex/package.json");
const codexPackageManifest = JSON.parse(readFileSync(codexPackageJsonPath, "utf8"));
const CODEX_PACKAGE_BIN = resolve(dirname(codexPackageJsonPath), codexPackageManifest.bin.codex);
const ALLOWED_IMAGES = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

function asObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new LlmError(`codex-chatgpt: invalid ${label}`, "PROTOCOL");
  }
  return value;
}

function asString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new LlmError(`codex-chatgpt: invalid ${label}`, "PROTOCOL");
  }
  return value;
}

function abortFailure(signal) {
  return signal.reason instanceof Error
    ? signal.reason
    : new LlmError("codex-chatgpt: request aborted", "ABORTED");
}

async function raceAbort(pending, signal) {
  if (signal.aborted) {
    pending.catch(() => {});
    throw abortFailure(signal);
  }
  let rejectAbort;
  const aborted = new Promise((_resolve, reject) => {
    rejectAbort = reject;
  });
  const onAbort = () => rejectAbort(abortFailure(signal));
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    return await Promise.race([pending, aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

class AsyncQueue {
  constructor() {
    this.values = [];
    this.waiters = [];
    this.closed = false;
  }

  push(value) {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter === undefined) this.values.push(value);
    else waiter({ value, done: false });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) waiter({ value: undefined, done: true });
  }

  next() {
    const value = this.values.shift();
    if (value !== undefined) return Promise.resolve({ value, done: false });
    if (this.closed) return Promise.resolve({ value: undefined, done: true });
    return new Promise((resolveNext) => this.waiters.push(resolveNext));
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}

function renderSubagentOutput(blocks) {
  const text = blocks
    .filter((block) => block.type === "text")
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join("\n\n");
  if (text.length > 0) return text;
  return blocks
    .filter((block) => block.type === "reasoning")
    .map((block) => block.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function recoveredSubagentOutput(run, result) {
  const direct = renderSubagentOutput(result.output);
  if (direct.length > 0 || run.localAgent === undefined) {
    return { output: direct, recovered: false };
  }
  const recovered = finalAssistantOutput(run.localAgent.session.events);
  return {
    output: recovered === undefined ? "" : renderSubagentOutput(recovered),
    recovered: recovered !== undefined,
  };
}

function latestUserContent(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "user" && message.source?.kind === "user") {
      return message.content;
    }
  }
  return [];
}

function transcript(messages) {
  return messages
    .map((message) => {
      const text = message.content
        .filter((block) => block.type === "text" || block.type === "reasoning")
        .map((block) => block.text)
        .join("\n");
      return text.trim().length === 0 ? "" : `${message.role.toUpperCase()}:\n${text}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function restoredConversation(messages) {
  const content = [{
    type: "text",
    text: "This Codex App Server thread was recreated after DSH restarted. The following labelled blocks are the prior user/assistant conversation. Continue by answering the final user message; do not describe this restoration note.",
  }];
  for (const message of messages) {
    const isUser = message.role === "user" && message.source?.kind === "user";
    const isAssistant = message.role === "assistant" && message.source?.kind === "model";
    if (!isUser && !isAssistant) continue;
    content.push({
      type: "text",
      text: isUser ? "[PRIOR USER MESSAGE]" : "[PRIOR ASSISTANT MESSAGE]",
    });
    for (const block of message.content) {
      if (block.type === "text" || block.type === "image") content.push(block);
    }
  }
  return content;
}

class CodexWire {
  constructor(child, cwd, developerInstructions, requestApproval, requestProtectedApproval, delegateToDsh, getModelCatalog, getRuntimeSettings, getAccessPolicy, logger) {
    this.child = child;
    this.cwd = cwd;
    this.developerInstructions = developerInstructions;
    this.requestApproval = requestApproval;
    this.requestProtectedApproval = requestProtectedApproval;
    this.delegateToDsh = delegateToDsh;
    this.getModelCatalog = getModelCatalog;
    this.getRuntimeSettings = getRuntimeSettings;
    this.getAccessPolicy = getAccessPolicy;
    this.dshCatalog = undefined;
    this.logger = logger;
    this.transport = new JsonRpcLineTransport(child.stdout, child.stdin);
    this.fatal = Promise.withResolvers();
    this.fatal.promise.catch(() => {});
    this.threadId = undefined;
    this.turnId = undefined;
    this.pendingTurnId = undefined;
    this.turnCompleted = undefined;
    this.earlyNotifications = [];
    this.lastFinalAnswer = undefined;
    this.lastUnphasedAnswer = undefined;
    this.closed = false;
    this.codexModel = undefined;
    this.reasoningEffort = undefined;
    this.access = undefined;
    this.planType = undefined;
    this.turnSignal = undefined;
    this.turnImages = [];
    this.turnEvents = undefined;
    this.itemPhases = new Map();
    this.progressedItems = new Set();
    this.answerTextByItem = new Map();
    this.delegationsThisTurn = 0;

    this.transport.onRequest((method, params) => this.handleServerRequest(method, params));
    this.transport.onNotification((method, params) => {
      try {
        this.handleNotification(method, params);
      } catch (error) {
        this.fail(error);
      }
    });
    child.once("error", (error) => this.fail(error));
    child.once("exit", (code, signal) => {
      if (!this.closed) {
        this.fail(new LlmError(
          `codex-chatgpt: app-server exited (code ${String(code)}, signal ${String(signal)})`,
          "TRANSPORT",
        ));
      }
    });
    // Drain diagnostics without persisting raw app-server output into DSH logs.
    child.stderr.resume();
  }

  async open(signal) {
    this.transport.start();
    asObject(await this.guarded(this.transport.request("initialize", {
      clientInfo: {
        name: "deepseek-harness-codex-chatgpt",
        title: "DeepSeek Harness Codex ChatGPT",
        version: BRIDGE_VERSION,
      },
      capabilities: {
        experimentalApi: true,
        requestAttestation: false,
        mcpServerOpenaiFormElicitation: true,
        extensions: { "openai/form": {} },
      },
    }, signal), signal), "initialize response");
    this.transport.notify("initialized");
    await this.guarded(this.transport.flush(), signal);

    const account = asObject(
      await this.guarded(this.transport.request("account/read", { refreshToken: false }, signal), signal),
      "account/read response",
    );
    const accountDetails = asObject(account.account, "account/read account");
    if (accountDetails.type !== "chatgpt") {
      throw new LlmError(
        `codex-chatgpt: refused non-ChatGPT authentication (${String(accountDetails.type)})`,
        "INVALID_CREDENTIAL",
      );
    }
    this.planType = typeof accountDetails.planType === "string" ? accountDetails.planType : "unknown";

    const listing = asObject(
      await this.guarded(this.transport.request("model/list", { includeHidden: false }, signal), signal),
      "model/list response",
    );
    const models = Array.isArray(listing.data) ? listing.data : [];
    const imageModels = models.filter((entry) =>
      entry !== null
      && typeof entry === "object"
      && Array.isArray(entry.inputModalities)
      && entry.inputModalities.includes("image")
    );
    const runtime = this.getRuntimeSettings();
    const selected = imageModels.find((entry) => (entry.model ?? entry.id) === runtime.model);
    if (selected === undefined) {
      throw new LlmError(
        `codex-chatgpt: configured model ${runtime.model} is not available with image input on this ChatGPT account`,
        "UNKNOWN_MODEL",
      );
    }
    this.codexModel = asString(selected.model ?? selected.id, "image-capable model id");
    const supportedEfforts = Array.isArray(selected.supportedReasoningEfforts)
      ? selected.supportedReasoningEfforts.map((entry) => entry?.reasoningEffort).filter(Boolean)
      : [];
    if (supportedEfforts.length > 0 && !supportedEfforts.includes(runtime.reasoningEffort)) {
      throw new LlmError(
        `codex-chatgpt: ${this.codexModel} does not support reasoning effort ${runtime.reasoningEffort}`,
        "UNKNOWN_MODEL",
      );
    }
    this.reasoningEffort = runtime.reasoningEffort;
    this.access = this.getAccessPolicy();
    this.dshCatalog = await this.guarded(this.getModelCatalog(), signal);

    const started = asObject(
      await this.guarded(this.transport.request("thread/start", {
        cwd: this.cwd,
        ephemeral: true,
        model: this.codexModel,
        approvalPolicy: this.access.approvalPolicy,
        sandbox: this.access.sandboxMode,
        config: { model_reasoning_effort: this.reasoningEffort },
        developerInstructions: this.developerInstructions,
        dynamicTools: [MODEL_CATALOG_TOOL, delegateTool(this.dshCatalog)],
      }, signal), signal),
      "thread/start response",
    );
    const thread = asObject(started.thread, "thread/start thread");
    this.threadId = asString(thread.id, "thread id");
    this.codexModel = asString(started.model, "effective Codex model");
    this.reasoningEffort = typeof started.reasoningEffort === "string"
      ? started.reasoningEffort
      : this.reasoningEffort;
    if (thread.ephemeral !== true) {
      throw new LlmError("codex-chatgpt: app-server did not create an ephemeral thread", "PROTOCOL");
    }
  }

  startTurn(input, signal, images = []) {
    if (this.turnCompleted !== undefined) {
      throw new LlmError("codex-chatgpt: concurrent turns are not supported", "CONFLICT");
    }
    const events = new AsyncQueue();
    const turnImages = [...images];
    this.turnEvents = events;
    this.turnImages = turnImages;
    this.itemPhases.clear();
    this.progressedItems.clear();
    this.answerTextByItem.clear();
    this.delegationsThisTurn = 0;
    const runtime = this.getRuntimeSettings();
    const access = this.getAccessPolicy();
    events.push({ type: "progress", text: `Codex is working… ${runtimeStatus({ ...runtime, access })}.\n` });
    const result = this.runTurn(input, signal).finally(() => {
      events.close();
      if (this.turnEvents === events) this.turnEvents = undefined;
      if (this.turnImages === turnImages) this.turnImages = [];
    });
    result.catch(() => {});
    return { events, result };
  }

  emitProgress(text) {
    if (typeof text !== "string" || text.length === 0) return;
    this.turnEvents?.push({ type: "progress", text });
  }

  emitAnswer(text) {
    if (typeof text !== "string" || text.length === 0) return;
    this.turnEvents?.push({ type: "answer", text });
  }

  async runTurn(input, signal) {
    if (this.turnCompleted !== undefined) {
      throw new LlmError("codex-chatgpt: concurrent turns are not supported", "CONFLICT");
    }
    this.lastFinalAnswer = undefined;
    this.lastUnphasedAnswer = undefined;
    this.turnId = undefined;
    this.pendingTurnId = undefined;
    this.earlyNotifications = [];
    this.itemPhases.clear();
    this.progressedItems.clear();
    this.answerTextByItem.clear();
    this.turnCompleted = Promise.withResolvers();
    this.turnSignal = signal;
    const runtime = this.getRuntimeSettings();
    const access = this.getAccessPolicy();

    const onAbort = () => this.interrupt();
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      const response = asObject(
        await this.guarded(this.transport.request("turn/start", {
          threadId: this.threadId,
          input,
          approvalPolicy: access.approvalPolicy,
          sandboxPolicy: access.sandboxPolicy,
          model: runtime.model,
          effort: runtime.reasoningEffort,
          cwd: this.cwd,
        }, signal), signal),
        "turn/start response",
      );
      const turn = asObject(response.turn, "turn/start turn");
      this.commitTurnId(asString(turn.id, "turn id"));
      const completed = asObject(
        await this.guarded(this.turnCompleted.promise, signal),
        "turn/completed notification",
      );
      const terminal = asObject(completed.turn, "completed turn");
      if (terminal.status !== "completed") {
        throw new LlmError(
          `codex-chatgpt: Codex turn ended with status ${String(terminal.status)}`,
          terminal.status === "interrupted" ? "ABORTED" : "PROVIDER_ERROR",
        );
      }
      const answer = this.lastFinalAnswer ?? this.lastUnphasedAnswer;
      if (typeof answer !== "string" || answer.trim().length === 0) {
        throw new LlmError("codex-chatgpt: Codex completed without a final answer", "EMPTY_RESPONSE");
      }
      return answer;
    } finally {
      signal.removeEventListener("abort", onAbort);
      this.turnSignal = undefined;
      this.turnCompleted = undefined;
    }
  }

  interrupt() {
    if (this.closed || this.threadId === undefined || this.turnId === undefined) return;
    this.transport.request("turn/interrupt", {
      threadId: this.threadId,
      turnId: this.turnId,
    }).catch(() => {});
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    this.transport.close();
    try {
      this.child.stdin.end();
    } catch {}
    if (this.child.exitCode === null && this.child.signalCode === null) this.child.kill("SIGTERM");
    await new Promise((resolve) => {
      if (this.child.exitCode !== null || this.child.signalCode !== null) resolve();
      else {
        const timer = setTimeout(() => {
          if (this.child.exitCode === null && this.child.signalCode === null) this.child.kill("SIGKILL");
        }, 3000);
        this.child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      }
    });
  }

  guarded(pending, signal) {
    return raceAbort(Promise.race([this.fatal.promise, pending]), signal);
  }

  fail(error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    this.fatal.reject(normalized);
    this.turnCompleted?.reject(normalized);
  }

  validateRunIds(params, nullableTurn = false) {
    const object = asObject(params, "server request parameters");
    if (object.threadId !== this.threadId) {
      throw new LlmError("codex-chatgpt: app-server request referenced another thread", "PROTOCOL");
    }
    if (nullableTurn && object.turnId === null) return;
    const id = asString(object.turnId, "server request turn id");
    if (this.turnId === undefined) {
      if (this.pendingTurnId !== undefined && this.pendingTurnId !== id) {
        throw new LlmError("codex-chatgpt: conflicting pending turn ids", "PROTOCOL");
      }
      this.pendingTurnId = id;
      return;
    }
    if (id !== this.turnId) {
      throw new LlmError("codex-chatgpt: app-server request referenced another turn", "PROTOCOL");
    }
  }

  commitTurnId(id) {
    if (this.pendingTurnId !== undefined && this.pendingTurnId !== id) {
      throw new LlmError("codex-chatgpt: turn/start response did not match the active turn", "PROTOCOL");
    }
    this.turnId = id;
    const queued = this.earlyNotifications.splice(0);
    for (const notification of queued) this.handleNotification(notification.method, notification.params);
  }

  async approvalOutcome(toolName, reason) {
    if (this.turnSignal === undefined) return "unavailable";
    try {
      return await this.requestApproval({
        toolName,
        reason,
        signal: this.turnSignal,
      });
    } catch (error) {
      this.logger.warn(`codex-chatgpt: approval failed closed: ${String(error)}`);
      return "unavailable";
    }
  }

  async protectedApprovalOutcome(toolName, reason) {
    if (this.turnSignal === undefined) return "unavailable";
    try {
      return await this.requestProtectedApproval({
        toolName,
        reason,
        signal: this.turnSignal,
      });
    } catch (error) {
      this.logger.warn(`codex-chatgpt: protected connected-app approval failed closed: ${String(error)}`);
      return "unavailable";
    }
  }

  async handleMcpElicitation(params) {
    this.validateRunIds(params, true);
    const request = asObject(params, "MCP elicitation parameters");
    const mode = asString(request.mode, "MCP elicitation mode");
    if (mode === "url") {
      this.emitProgress("A connected app needs account authorization. Open its connection settings in Codex, complete the sign-in there, then retry this action.\n");
      return { action: "decline", content: null, _meta: null };
    }
    if (mode !== "form" && mode !== "openai/form") {
      throw new LlmError(`codex-chatgpt: unsupported MCP elicitation mode ${mode}`, "PROTOCOL");
    }
    const metadata = request._meta !== null && typeof request._meta === "object" && !Array.isArray(request._meta)
      ? request._meta
      : undefined;
    const isProtectedToolConfirmation = mode === "openai/form"
      && typeof metadata?.codex_approval_kind === "string";
    const content = isProtectedToolConfirmation
      ? {}
      : acceptedElicitationContent(request.requestedSchema);
    if (content === undefined) {
      this.emitProgress("A connected app requested additional form input that DSH cannot safely infer. Complete that action in Codex, then retry here.\n");
      return { action: "decline", content: null, _meta: null };
    }
    const serverName = typeof request.serverName === "string" && request.serverName.length > 0
      ? request.serverName
      : "connected-app";
    const detail = typeof request.message === "string"
      ? request.message.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 1200)
      : "A connected app requests permission for a protected action.";
    this.emitProgress("A connected app is waiting for your approval…\n");
    const outcome = await this.protectedApprovalOutcome(
      `connected-app-${serverName.replace(/[^a-zA-Z0-9_.-]/gu, "-").slice(0, 80)}`,
      `${detail || "A connected app requests permission for a protected action."} Allow this action once? Full Access never bypasses protected external actions.`,
    );
    return outcome === "allowed-once"
      ? { action: "accept", content, _meta: request._meta ?? null }
      : { action: this.approvalDenied(outcome), content: null, _meta: null };
  }

  approvalDenied(outcome) {
    return outcome === "cancelled" ? "cancel" : "decline";
  }

  networkAmendment(params) {
    const object = asObject(params, "network approval parameters");
    const context = object.networkApprovalContext;
    if (context === null || typeof context !== "object" || Array.isArray(context)) return undefined;
    if (typeof context.host !== "string" || context.host.length === 0) return undefined;
    const proposals = Array.isArray(object.proposedNetworkPolicyAmendments)
      ? object.proposedNetworkPolicyAmendments
      : [];
    const proposal = proposals.find((candidate) =>
      candidate !== null
      && typeof candidate === "object"
      && candidate.host === context.host
      && candidate.action === "allow"
    );
    if (proposal === undefined) return undefined;
    const decisions = Array.isArray(object.availableDecisions) ? object.availableDecisions : [];
    const offered = decisions.some((decision) =>
      decision !== null
      && typeof decision === "object"
      && "applyNetworkPolicyAmendment" in decision
    );
    if (!offered) return undefined;
    return {
      host: context.host,
      protocol: typeof context.protocol === "string" ? context.protocol : "network",
      amendment: { host: proposal.host, action: "allow" },
    };
  }

  execpolicyAmendment(params) {
    const object = asObject(params, "command approval parameters");
    const amendment = Array.isArray(object.proposedExecpolicyAmendment)
      && object.proposedExecpolicyAmendment.length > 0
      && object.proposedExecpolicyAmendment.every((part) => typeof part === "string")
      ? object.proposedExecpolicyAmendment
      : undefined;
    if (amendment === undefined) return undefined;
    const decisions = Array.isArray(object.availableDecisions) ? object.availableDecisions : [];
    const offered = decisions.some((decision) =>
      decision !== null
      && typeof decision === "object"
      && "acceptWithExecpolicyAmendment" in decision
    );
    return offered ? amendment : undefined;
  }

  permissionSummary(params) {
    const object = asObject(params, "permissions approval parameters");
    const requested = asObject(object.permissions, "requested permissions");
    const kinds = [];
    if (requested.network !== null && typeof requested.network === "object") kinds.push("network");
    if (requested.fileSystem !== null && typeof requested.fileSystem === "object") kinds.push("file");
    return kinds.length === 0 ? "additional" : kinds.join(" and ");
  }

  grantedPermissions(params) {
    const object = asObject(params, "permissions approval parameters");
    const requested = asObject(object.permissions, "requested permissions");
    const granted = {};
    if (requested.network !== null && typeof requested.network === "object") {
      granted.network = requested.network;
    }
    if (requested.fileSystem !== null && typeof requested.fileSystem === "object") {
      granted.fileSystem = requested.fileSystem;
    }
    return granted;
  }

  async handleServerRequest(method, params) {
    try {
      switch (method) {
        case "item/commandExecution/requestApproval": {
          this.validateRunIds(params);
          const object = asObject(params, "command approval parameters");
          const network = this.networkAmendment(object);
          const execpolicy = network === undefined ? this.execpolicyAmendment(object) : undefined;
          const detail = typeof object.reason === "string" && object.reason.length > 0
            ? ` Reason: ${object.reason}`
            : "";
          const reason = network !== undefined
            ? `Codex needs ${network.protocol} access to ${network.host}. Allow this exact host for the rest of this DSH Codex session? The exception is not saved permanently.`
            : execpolicy !== undefined
              ? `Codex proposes a narrow command rule so matching commands stop asking again during this DSH session. Allow that temporary rule? It is not saved permanently.${detail}`
              : `Codex requests one command outside the current sandbox.${detail}`;
          this.emitProgress("Waiting for your approval…\n");
          const outcome = await this.approvalOutcome(
            network !== undefined
              ? `codex-network-session:${network.host}`
              : execpolicy !== undefined
                ? "codex-command-rule-session"
                : "codex-command-once",
            reason,
          );
          if (outcome !== "allowed-once") return { decision: this.approvalDenied(outcome) };
          if (network !== undefined) {
            return { decision: {
              applyNetworkPolicyAmendment: {
                network_policy_amendment: network.amendment,
              },
            } };
          }
          if (execpolicy !== undefined) {
            return { decision: {
              acceptWithExecpolicyAmendment: {
                execpolicy_amendment: execpolicy,
              },
            } };
          }
          return { decision: "accept" };
        }
        case "item/fileChange/requestApproval": {
          this.validateRunIds(params);
          const object = asObject(params, "file approval parameters");
          const grantRoot = typeof object.grantRoot === "string" && object.grantRoot.length > 0
            ? object.grantRoot
            : undefined;
          const detail = grantRoot === undefined ? "" : ` Requested location: ${grantRoot}.`;
          this.emitProgress("Waiting for your approval…\n");
          const outcome = await this.approvalOutcome(
            grantRoot === undefined ? "codex-file-change-once" : "codex-file-root-session",
            grantRoot === undefined
              ? `Codex requests one file change outside the current workspace boundary.${detail}`
              : `Codex requests file changes within this exact directory for the rest of this DSH session.${detail} The exception is not saved permanently.`,
          );
          return {
            decision: outcome === "allowed-once"
              ? grantRoot === undefined ? "accept" : "acceptForSession"
              : this.approvalDenied(outcome),
          };
        }
        case "item/permissions/requestApproval": {
          this.validateRunIds(params);
          const summary = this.permissionSummary(params);
          this.emitProgress("Waiting for your approval…\n");
          const outcome = await this.approvalOutcome(
            `codex-${summary.replaceAll(" ", "-")}-permission-session`,
            `Codex requests this exact ${summary} permission profile for the rest of this DSH session so matching work stops asking again. Allow it? The exception is not saved permanently.`,
          );
          return {
            permissions: outcome === "allowed-once" ? this.grantedPermissions(params) : {},
            scope: "session",
          };
        }
        case "item/tool/call": {
          this.validateRunIds(params);
          const object = asObject(params, "dynamic tool call parameters");
          if (object.namespace !== null && object.namespace !== undefined) {
            throw new LlmError("codex-chatgpt: unexpected dynamic tool namespace", "PROTOCOL");
          }
          if (object.tool === MODEL_CATALOG_TOOL_NAME) {
            const args = typeof object.arguments === "string"
              ? asObject(JSON.parse(object.arguments.length === 0 ? "{}" : object.arguments), "model catalogue arguments")
              : asObject(object.arguments ?? {}, "model catalogue arguments");
            if (Object.keys(args).length !== 0) {
              return { success: false, contentItems: [{ type: "inputText", text: "dsh_model_catalog accepts no arguments." }] };
            }
            this.dshCatalog = await this.getModelCatalog();
            return {
              success: true,
              contentItems: [{ type: "inputText", text: catalogForModel(this.dshCatalog) }],
            };
          }
          if (object.tool !== DSH_DELEGATE_TOOL_NAME) {
            throw new LlmError(`codex-chatgpt: unsupported dynamic tool ${String(object.tool)}`, "PROTOCOL");
          }
          const args = typeof object.arguments === "string"
            ? asObject(JSON.parse(object.arguments), "DSH delegation arguments")
            : asObject(object.arguments, "DSH delegation arguments");
          const task = asString(args.task, "DSH delegation task").trim();
          if (task.length > 20000) {
            return { success: false, contentItems: [{ type: "inputText", text: "DSH delegation task is too long." }] };
          }
          const acceptance = asString(args.acceptance, "DSH delegation acceptance contract").trim();
          if (acceptance.length > 8000) {
            return { success: false, contentItems: [{ type: "inputText", text: "DSH delegation acceptance contract is too long." }] };
          }
          const evidence = asString(args.evidence, "DSH delegation evidence request").trim();
          if (evidence.length > 8000) {
            return { success: false, contentItems: [{ type: "inputText", text: "DSH delegation evidence request is too long." }] };
          }
          const route = asString(args.route, "DSH model route");
          this.dshCatalog = await this.getModelCatalog();
          const selected = this.dshCatalog.models.find((model) =>
            model.route === route && model.subagentFromCurrentCodex
          );
          if (selected === undefined) {
            return { success: false, contentItems: [{ type: "inputText", text: `Unavailable DSH subagent route: ${route}. Refresh dsh_model_catalog.` }] };
          }
          if (args.include_current_images !== undefined && typeof args.include_current_images !== "boolean") {
            return { success: false, contentItems: [{ type: "inputText", text: "include_current_images must be true or false." }] };
          }
          if (this.delegationsThisTurn >= ROUTING_POLICY.qualityPolicy.maximumDelegationsPerTurn) {
            return {
              success: false,
              contentItems: [{ type: "inputText", text: `The governance policy permits at most ${ROUTING_POLICY.qualityPolicy.maximumDelegationsPerTurn} DeepSeek execution packets per turn. Continue with Codex and do not manufacture further model calls.` }],
            };
          }
          const includeCurrentImages = args.include_current_images === true;
          if (includeCurrentImages && !selected.modalities.includes("image")) {
            return {
              success: false,
              contentItems: [{ type: "inputText", text: `${route} is not image-capable.` }],
            };
          }
          if (includeCurrentImages && this.turnImages.length === 0) {
            return {
              success: false,
              contentItems: [{ type: "inputText", text: "The current user message contains no image attachments to forward." }],
            };
          }
          const label = args.label === undefined ? `${selected.name} subagent` : asString(args.label, "DSH delegation label");
          if (label.length > 80) {
            return { success: false, contentItems: [{ type: "inputText", text: "DSH delegation label is too long." }] };
          }
          if (this.turnSignal === undefined) {
            return { success: false, contentItems: [{ type: "inputText", text: "The parent Codex turn is no longer active." }] };
          }
          const images = includeCurrentImages ? [...this.turnImages] : [];
          const packet = buildDelegationPacket({ task, acceptance, evidence });
          this.delegationsThisTurn += 1;
          this.emitProgress(images.length === 0
            ? `DeepSeek is executing “${label}” (${route}); Codex will verify it…\n`
            : `Sending ${images.length} current ${images.length === 1 ? "image" : "images"} to DeepSeek for “${label}” (${route}); Codex will verify it…\n`);
          try {
            const result = await this.delegateToDsh({
              task: packet,
              label,
              provider: selected.provider,
              model: selected.id,
              maxTokens: selected.delegatedMaxTokensPerStep,
              images,
              signal: this.turnSignal,
            });
            const output = renderSubagentOutput(result.output);
            const outputDetail = output.length === 0 ? "no text" : `${output.length} characters`;
            const recoveryDetail = result.recoveredFromSession === true ? ", recovered from the child session" : "";
            this.emitProgress(`DeepSeek worker finished (${result.stopReason}; ${outputDetail}${recoveryDetail}). Codex is validating the acceptance contract. ${result.costSummary}\n`);
            if (result.stopReason !== "completed") {
              const diagnostic = typeof result.diagnostic === "string" && result.diagnostic.length > 0
                ? result.diagnostic
                : `DSH subagent stopped: ${result.stopReason}`;
              return {
                success: false,
                contentItems: [{ type: "inputText", text: output.length > 0 ? `${diagnostic}\n\nPartial result:\n${output}` : diagnostic }],
              };
            }
            if (output.length === 0) {
              return {
                success: false,
                contentItems: [{
                  type: "inputText",
                  text: "DSH delegation failed: the child completed without a usable text result. Do not describe this as a successful review.",
                }],
              };
            }
            return {
              success: true,
              contentItems: [{
                type: "inputText",
                text: delegationResultForCodex({ output, route, costSummary: result.costSummary }),
              }],
            };
          } catch (error) {
            this.logger.warn(`codex-chatgpt: DSH subagent failed: ${String(error)}`);
            this.emitProgress("DSH subagent failed. Codex will continue without it.\n");
            return {
              success: false,
              contentItems: [{ type: "inputText", text: "The selected DSH subagent was unavailable or failed. Continue without it, and explain this briefly to the user." }],
            };
          }
        }
        case "item/tool/requestUserInput":
          this.validateRunIds(params);
          return { answers: {} };
        case "mcpServer/elicitation/request":
          return await this.handleMcpElicitation(params);
        default:
          throw new LlmError(`codex-chatgpt: unsupported app-server request ${method}`, "PROTOCOL");
      }
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  handleNotification(method, params) {
    const object = asObject(params, `${method} parameters`);
    if (object.threadId !== this.threadId) return;
    if (method === "turn/started") {
      const turn = asObject(object.turn, "turn/started turn");
      if (this.turnCompleted !== undefined && this.turnId === undefined) {
        this.pendingTurnId = asString(turn.id, "started turn id");
      }
      return;
    }
    if (method === "turn/completed") {
      const turn = asObject(object.turn, "turn/completed turn");
      const id = asString(turn.id, "completed turn id");
      if (this.turnCompleted === undefined) return;
      if (this.turnId === undefined) {
        this.pendingTurnId = id;
        this.earlyNotifications.push({ method, params });
        return;
      }
      if (id === this.turnId) this.turnCompleted.resolve(object);
      return;
    }

    if (typeof object.turnId !== "string") return;
    const id = asString(object.turnId, `${method} turn id`);
    if (this.turnId === undefined) {
      if (this.turnCompleted !== undefined) {
        if (this.pendingTurnId !== undefined && this.pendingTurnId !== id) {
          throw new LlmError("codex-chatgpt: notification referenced a conflicting turn", "PROTOCOL");
        }
        this.pendingTurnId = id;
        this.earlyNotifications.push({ method, params });
      }
      return;
    }
    if (id !== this.turnId) return;

    if (method === "item/started") {
      const item = asObject(object.item, "started item");
      const itemId = asString(item.id, "started item id");
      if (item.type === "agentMessage") {
        this.itemPhases.set(itemId, item.phase);
      } else if (item.type === "commandExecution") {
        this.emitProgress("Running a command…\n");
      } else if (item.type === "fileChange") {
        this.emitProgress("Preparing file changes…\n");
      } else if (item.type === "webSearch") {
        this.emitProgress("Searching the web…\n");
      } else if (item.type === "imageView") {
        this.emitProgress("Inspecting an image…\n");
      } else if (item.type === "mcpToolCall") {
        this.emitProgress("Using a connected tool…\n");
      } else if (item.type === "contextCompaction") {
        this.emitProgress("Compacting context so the work can continue…\n");
      }
      return;
    }

    if (method === "item/reasoning/summaryTextDelta") {
      const itemId = asString(object.itemId, "reasoning item id");
      const delta = typeof object.delta === "string" ? object.delta : "";
      if (!this.progressedItems.has(itemId)) this.emitProgress("\n");
      this.progressedItems.add(itemId);
      this.emitProgress(delta);
      return;
    }

    if (method === "item/agentMessage/delta") {
      const itemId = asString(object.itemId, "agent message item id");
      const phase = this.itemPhases.get(itemId);
      const delta = typeof object.delta === "string" ? object.delta : "";
      if (phase === "commentary") {
        if (!this.progressedItems.has(itemId)) this.emitProgress("\n");
        this.progressedItems.add(itemId);
        this.emitProgress(delta);
      } else if (phase === "final_answer" || phase === null) {
        const streamed = this.answerTextByItem.get(itemId) ?? "";
        this.answerTextByItem.set(itemId, streamed + delta);
        this.emitAnswer(delta);
      }
      return;
    }

    if (method === "item/plan/delta") {
      const delta = typeof object.delta === "string" ? object.delta : "";
      this.emitProgress(delta);
      return;
    }

    if (method === "item/completed") {
      const item = asObject(object.item, "completed item");
      const itemId = asString(item.id, "completed item id");
      if (item.type === "agentMessage") {
        const text = typeof item.text === "string" ? item.text : "";
        if (item.phase === "final_answer" || item.phase === null) {
          if (item.phase === "final_answer") this.lastFinalAnswer = text;
          else this.lastUnphasedAnswer = text;
          const streamed = this.answerTextByItem.get(itemId) ?? "";
          const tail = reconcileCompletedAnswer(streamed, text);
          if (tail.length > 0) this.emitAnswer(tail);
          this.answerTextByItem.delete(itemId);
        }
        else if (item.phase === "commentary") {
          if (!this.progressedItems.has(itemId) && text.length > 0) this.emitProgress(`\n${text}`);
          this.emitProgress("\n");
        }
      } else if (item.type === "reasoning") {
        if (!this.progressedItems.has(itemId) && Array.isArray(item.summary)) {
          const summary = item.summary.filter((part) => typeof part === "string").join("\n");
          if (summary.length > 0) this.emitProgress(`\n${summary}\n`);
        } else if (this.progressedItems.has(itemId)) {
          this.emitProgress("\n");
        }
      } else if (item.type === "commandExecution") {
        if (typeof item.exitCode === "number" && item.exitCode !== 0) {
          this.emitProgress(`Command finished with exit code ${item.exitCode}.\n`);
        } else {
          this.emitProgress("Command finished.\n");
        }
      } else if (item.type === "fileChange") {
        const count = Array.isArray(item.changes) ? item.changes.length : 0;
        this.emitProgress(count === 1 ? "Updated one file.\n" : `Updated ${count} files.\n`);
      } else if (item.type === "webSearch") {
        this.emitProgress("Web search finished.\n");
      } else if (item.type === "imageView") {
        this.emitProgress("Image inspection finished.\n");
      } else if (item.type === "mcpToolCall") {
        this.emitProgress(item.status === "failed" ? "Connected tool failed.\n" : "Connected tool finished.\n");
      }
      this.itemPhases.delete(itemId);
      return;
    }
  }
}

class CodexChatGptAdapter extends LlmAdapter {
  constructor(ctx, getRuntimeSettings) {
    super();
    this.ctx = ctx;
    this.getRuntimeSettings = getRuntimeSettings;
    this.connections = new Map();
  }

  providerInfo() {
    return { id: PROVIDER, name: "Codex (ChatGPT login)" };
  }

  listModels() {
    const runtime = this.getRuntimeSettings();
    return Promise.resolve([{
      provider: PROVIDER,
      id: MODEL,
      name: `${modelLabel(runtime.model)} · ${reasoningLabel(runtime.reasoningEffort)} (ChatGPT)`,
      description: "Codex App Server using ChatGPT authentication only; DSH controls the exact model and reasoning effort.",
      inputModalities: ["text", "image"],
    }]);
  }

  resolveModel() {
    const runtime = this.getRuntimeSettings();
    return Promise.resolve({
      provider: PROVIDER,
      id: MODEL,
      name: `${modelLabel(runtime.model)} · ${reasoningLabel(runtime.reasoningEffort)} (ChatGPT)`,
      inputModalities: ["text", "image"],
      context: { contextWindow: 200000 },
    });
  }

  modelCatalog() {
    return liveModelCatalog(this.ctx.llm, ROUTING_POLICY);
  }

  async delegateToDsh(agent, { task, label, provider, model, maxTokens, images = [], signal }) {
    if (agent === undefined) {
      throw new LlmError("codex-chatgpt: DSH delegation requires a live parent agent", "CONFLICT");
    }
    if (!this.ctx.subagents.list().includes("spawn")) {
      throw new LlmError("codex-chatgpt: DSH spawn subagent provider is unavailable", "PROVIDER_ERROR");
    }
    if (provider === PROVIDER) {
      throw new LlmError("codex-chatgpt: use Codex's native subagents instead of recursively delegating to the current DSH route", "CONFLICT");
    }
    const resolved = await this.ctx.llm.resolveModelInfo(provider, model, signal);
    if (images.length > 0 && !resolved.inputModalities?.includes("image")) {
      throw new LlmError(`codex-chatgpt: ${provider}/${model} is not image-capable`, "UNSUPPORTED_CONTENT");
    }
    const delegatedMaxTokens = maxTokens
      ?? policyModel(ROUTING_POLICY, provider, model)?.delegatedMaxTokensPerStep;
    const deadline = new AbortController();
    const timer = setTimeout(() => {
      deadline.abort(new LlmError(
        "codex-chatgpt: DSH delegation exceeded the five-minute return deadline",
        "TIMEOUT",
      ));
    }, DSH_DELEGATION_TIMEOUT_MS);
    const delegationSignal = AbortSignal.any([signal, deadline.signal]);
    let run;
    try {
      run = await this.ctx.subagents.start("spawn", {
        label,
        prompt: [
          { type: "text", text: task },
          ...images.map((block) => ({ type: "image", attachment: block.attachment })),
        ],
        parent: agent,
        signal: delegationSignal,
        agentOptions: {
          provider,
          model,
          ...(delegatedMaxTokens === undefined ? {} : { maxTokens: delegatedMaxTokens }),
        },
        maxDepth: 1,
      });
      const result = await raceAbort(run.result, signal);
      const captured = recoveredSubagentOutput(run, result);
      const usage = summarizeTokenUsage(run.localAgent?.session.events ?? []);
      const costEstimate = estimateModelCost(ROUTING_POLICY, provider, model, usage);
      return {
        ...result,
        output: captured.output.length === 0 ? result.output : [{ type: "text", text: captured.output }],
        usage,
        costEstimate,
        costSummary: formatCostEstimate(costEstimate),
        ...captured.recovered ? { recoveredFromSession: true } : {},
        ...deadline.signal.aborted && result.stopReason === "aborted"
          ? { diagnostic: "DSH delegation exceeded five minutes and was stopped before Codex's tool-response deadline." }
          : {},
      };
    } finally {
      clearTimeout(timer);
      if (run !== undefined) await run.dispose();
    }
  }

  async connectionFor(options, signal) {
    const key = options.purpose === undefined
      ? String(options.sessionId ?? "interactive")
      : `${String(options.sessionId ?? "auxiliary")}:${options.purpose}:${crypto.randomUUID()}`;
    let pending = this.connections.get(key);
    if (pending !== undefined) {
      return { key, pending, temporary: options.purpose !== undefined, created: false };
    }

    pending = this.createConnection(options, signal);
    this.connections.set(key, pending);
    try {
      await pending;
      return { key, pending, temporary: options.purpose !== undefined, created: true };
    } catch (error) {
      this.connections.delete(key);
      throw error;
    }
  }

  async createConnection(options, signal) {
    const session = options.sessionId === undefined ? undefined : this.ctx.sessions.get(options.sessionId);
    const agent = options.sessionId === undefined ? undefined : this.ctx.agents.get(options.sessionId);
    const getAccessPolicy = () => codexAccessPolicy({
      sandboxMode: latestSessionPolicy(agent?.session?.events, "sandbox/mode", "mode"),
      approvalPolicy: agent === undefined
        ? "ask"
        : this.ctx.approval.overrideOf(agent.session) ?? this.ctx.approval.config.policy,
    });
    const cwd = session?.header?.cwd ?? process.cwd();
    const env = { ...process.env };
    delete env.OPENAI_API_KEY;
    delete env.OPENAI_API_KEY_PATH;
    // DeepSeek credentials belong to DSH's native adapter, never the Codex child.
    delete env.DEEPSEEK_API_KEY;
    delete env.DEEPSEEK_API_KEY_PATH;
    const child = spawn(process.execPath, [
      CODEX_PACKAGE_BIN,
      "app-server",
      "--stdio",
      "-c",
      "forced_login_method=\"chatgpt\"",
      "-c",
      "features.apps=true",
      "-c",
      "apps._default.enabled=true",
      "-c",
      "apps._default.default_tools_approval_mode=\"writes\"",
      "-c",
      "apps._default.destructive_enabled=true",
      "-c",
      "apps._default.open_world_enabled=true",
      "-c",
      "sandbox_workspace_write.network_access=true",
      "-c",
      "features.network_proxy.enabled=true",
      "-c",
      'features.network_proxy.domains={ "*" = "allow" }',
    ], {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const wire = new CodexWire(
      child,
      cwd,
      [
        "You are Codex running inside DeepSeek Harness. Answer the user's request directly. Treat uploaded images as user-provided input. Give brief commentary updates before and during long work so the user can see useful progress. Do not use OpenAI API-key authentication. Public internet access is routed through Codex's protected network proxy. Installed Codex apps and plugin tools are available: use them directly when relevant. Read-only app work should proceed without approval. Protected external writes must use the connected-app confirmation, wait for the user's decision, and be reported as complete only after the tool confirms success. Prefer a draft or review step unless the user explicitly authorized the immediate external action. If a destination or permission is blocked, request approval; prefer a narrow temporary rule when the protocol offers one, and never bypass the sandbox or invent an approval. Never forward current images to another provider merely because they are present.",
        buildDeveloperRoutingInstructions(ROUTING_POLICY),
        buildChatVibeInstructions(),
      ].join("\n\n"),
      async ({ toolName, reason, signal: approvalSignal }) => {
        if (agent === undefined) return "unavailable";
        return this.ctx.approval.request({
          agent,
          toolName,
          reason,
          signal: approvalSignal,
        });
      },
      async ({ toolName, reason, signal: approvalSignal }) => {
        if (agent === undefined) return "unavailable";
        const previous = this.ctx.approval.overrideOf(agent.session)
          ?? this.ctx.approval.config.policy
          ?? "ask";
        const temporarilyInteractive = previous === "never";
        if (temporarilyInteractive) setApprovalPolicy(agent.session, "ask");
        try {
          return await this.ctx.approval.request({
            agent,
            toolName,
            reason,
            signal: approvalSignal,
          });
        } finally {
          if (temporarilyInteractive) setApprovalPolicy(agent.session, "never");
        }
      },
      async (request) => this.delegateToDsh(agent, request),
      async () => this.modelCatalog(),
      () => this.getRuntimeSettings(),
      getAccessPolicy,
      this.ctx.logger,
    );
    try {
      await wire.open(signal);
      this.ctx.logger.info(
        `codex-chatgpt: protected ChatGPT session ready (${wire.planType}, ${wire.codexModel}, ${wire.reasoningEffort}, ${wire.access.label})`,
      );
      return wire;
    } catch (error) {
      await wire.close().catch(() => {});
      throw error;
    }
  }

  async materialize(content, signal) {
    const input = [];
    let directory;
    let imageIndex = 0;
    try {
      for (const block of content) {
        if (block.type === "text") {
          input.push({ type: "text", text: block.text, text_elements: [] });
          continue;
        }
        if (block.type !== "image") continue;
        const extension = ALLOWED_IMAGES.get(block.attachment.mediaType);
        if (extension === undefined) {
          throw new LlmError(
            `codex-chatgpt: unsupported image type ${String(block.attachment.mediaType)}`,
            "UNSUPPORTED_CONTENT",
          );
        }
        directory ??= await mkdtemp(join(tmpdir(), "dsh-codex-image-"));
        const loaded = await this.ctx.attachments.readImage(block.attachment, signal);
        const path = join(directory, `upload-${imageIndex}${extension}`);
        imageIndex += 1;
        await writeFile(path, loaded.data, { mode: 0o600 });
        input.push({ type: "localImage", path, detail: "original" });
      }
      if (input.length === 0) {
        throw new LlmError("codex-chatgpt: no user text or image was supplied", "UNSUPPORTED_CONTENT");
      }
      return {
        input,
        cleanup: async () => {
          if (directory !== undefined) await rm(directory, { recursive: true, force: true });
        },
      };
    } catch (error) {
      if (directory !== undefined) await rm(directory, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }

  async *stream(options) {
    const signal = options.signal ?? new AbortController().signal;
    const connection = await this.connectionFor(options, signal);
    const currentUserContent = latestUserContent(options.messages);
    const currentImages = currentUserContent.filter((block) => block.type === "image");
    const hasPriorAssistant = options.messages.some((message) =>
      message.role === "assistant" && message.source?.kind === "model"
    );
    const content = options.purpose !== undefined
      ? [{ type: "text", text: transcript(options.messages) }]
      : connection.created && hasPriorAssistant
        ? restoredConversation(options.messages)
        : currentUserContent;
    const materialized = await this.materialize(content, signal);
    const wire = await connection.pending;
    try {
      const run = wire.startTurn(materialized.input, signal, currentImages);
      try {
        yield* streamTurnResult(run);
      } catch (error) {
        throw error;
      }
      yield { type: "usage", usage: { inputTokens: 0, outputTokens: 0 } };
      yield { type: "finish", reason: { kind: "stop" } };
    } catch (error) {
      if (connection.temporary || error?.code === "TRANSPORT" || error?.code === "PROTOCOL") {
        this.connections.delete(connection.key);
        await wire.close().catch(() => {});
      }
      if (error instanceof LlmError) throw error;
      throw new LlmError("codex-chatgpt: Codex request failed", "PROVIDER_ERROR", { cause: error });
    } finally {
      await materialized.cleanup();
      if (connection.temporary) {
        this.connections.delete(connection.key);
        await wire.close().catch(() => {});
      }
    }
  }

  async closeAll() {
    const pending = [...this.connections.values()];
    this.connections.clear();
    await Promise.allSettled(pending.map(async (item) => (await item).close()));
  }
}

const name = "llm-codex-chatgpt-local";
const inject = ["llm", "sessions", "attachments", "agents", "approval", "subagents"];

function apply(ctx, config) {
  const getRuntimeSettings = installCodexRuntimeSettings(ctx, config);
  const adapter = new CodexChatGptAdapter(ctx, getRuntimeSettings);
  const updateChecker = createUpdateChecker({
    current: {
      dsh: installedDshVersion,
      vibeify: BRIDGE_VERSION,
      codex: codexPackageManifest.version,
    },
  });
  ctx.llm.registerAdapter([PROVIDER], adapter);
  ctx.inject(["connection"], (connectionCtx) => registerUpdateRpc(connectionCtx, updateChecker));
  ctx.effect(() => async () => adapter.closeAll(), "codex-chatgpt app-server cleanup");
}

export { Config, apply, inject, name };
