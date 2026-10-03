// Small bridge between the current DSH Session Remote and older plugin hosts.
// Public methods retain the legacy { result: { ok, value } } shape so callers
// can keep their existing acceptance and error paths.
function wrap(result) {
  return { result: result?.result ?? result };
}

function failed(error) {
  return { result: { ok: false, error } };
}

async function call(operation) {
  try { return wrap(await operation()); } catch (error) { return failed(error); }
}

function signal() { return new AbortController().signal; }

export const SESSION_HISTORY_OPEN_TIMEOUT_MS = 1_500;
export const RETIRED_DSH_01_AGENT_PRESETS = Object.freeze(new Set(["chatgpt-agent"]));

export function sessionNeedsDefaultPresetMigration(summary) {
  return summary !== null
    && typeof summary === "object"
    && typeof summary.agentPreset === "string"
    && RETIRED_DSH_01_AGENT_PRESETS.has(summary.agentPreset);
}

async function openingSnapshot(remote, sessionId, maxMessages, timeoutMs) {
  const controller = new AbortController();
  const iterator = remote.follow({ address: { kind: "session", sessionId }, maxMessages }, controller.signal)[Symbol.asyncIterator]();
  let timer;
  try {
    const first = await Promise.race([
      iterator.next(),
      new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("Session history opening timed out")); }, timeoutMs);
      }),
    ]);
    if (first.done || first.value?.type !== "snapshot") throw new Error("Session history has no opening snapshot");
    return first.value;
  } finally {
    clearTimeout(timer);
    controller.abort();
    // A broken transport must not hold the caller while iterator cleanup waits.
    try { void Promise.resolve(iterator.return?.()).catch(() => {}); } catch { /* closed by abort */ }
  }
}

export function createSessionApi(ctx, { historyOpenTimeoutMs = SESSION_HISTORY_OPEN_TIMEOUT_MS } = {}) {
  const remote = ctx.remote?.session;
  if (remote?.create && remote?.prompt && remote?.page && remote?.follow) {
    return Object.freeze({
      remote,
      create: (options = {}) => call(() => remote.create(options)),
      rename: ({ sessionId, title }) => call(() => remote.rename({ sessionId, title })),
      cancel: ({ sessionId }) => call(() => remote.cancel({ sessionId })),
      prompt: ({ sessionId, mode, content, clientTimeZone }) => call(() => {
        const requestId = globalThis.crypto?.randomUUID?.();
        if (typeof requestId !== "string") throw new Error("Secure prompt request IDs are unavailable");
        return remote.prompt({ sessionId, mode, content, requestId, ...(clientTimeZone === undefined ? {} : { clientTimeZone }) }, signal());
      }),
      history: ({ sessionId, maxMessages = 50, beforeSeq, throughSeq }) => call(async () => {
        if (throughSeq === undefined) {
          const opening = await openingSnapshot(remote, sessionId, maxMessages, historyOpenTimeoutMs);
          return { ok: true, value: { events: opening.records, hasMore: opening.hasMore, throughSeq: opening.cursor, agentPreset: opening.header?.agentPreset } };
        }
        const page = await remote.page({ address: { kind: "session", sessionId }, throughSeq, ...(beforeSeq === undefined ? {} : { beforeSeq }), maxMessages }, signal());
        if (!page?.ok) return page;
        return { ok: true, value: { events: page.value.records, hasMore: page.value.hasMore, throughSeq } };
      }),
    });
  }
  const legacy = ctx.get("connection")?.api?.sessions;
  if (!legacy) throw new Error("DSH Session API is unavailable");
  return Object.freeze({
    remote: null,
    create: (options) => legacy.create(options),
    rename: (options) => legacy.rename(options),
    cancel: (options) => legacy.cancel(options),
    prompt: (options) => legacy.prompt(options),
    history: (options) => legacy.history(options),
  });
}
