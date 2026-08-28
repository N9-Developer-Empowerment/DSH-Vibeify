import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;
const UPDATE_CHANNEL = "/vibeify-updates";
const INSTALLER_URL = "https://dsh-vibeify.ezzye.chatgpt.site/DSH-Vibeify-Installer-macOS.zip";
const SOURCES = Object.freeze({
  dsh: "https://registry.npmjs.org/@deepseek-ai%2Fdsh/latest",
  codex: "https://registry.npmjs.org/@openai%2Fcodex/latest",
  vibeify: "https://raw.githubusercontent.com/N9-Developer-Empowerment/DSH-Vibeify/main/plugins/dsh-vibeify/package.json",
});

function parsedVersion(value) {
  if (typeof value !== "string") throw new TypeError("version must be a string");
  const match = value.trim().match(
    /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
  );
  if (match === null) throw new TypeError("version must be semantic");
  return {
    core: match.slice(1, 4).map(Number),
    prerelease: match[4]?.split(".") ?? [],
  };
}

function compareIdentifier(left, right) {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) return Number(left) - Number(right);
  if (leftNumeric) return -1;
  if (rightNumeric) return 1;
  return left.localeCompare(right, "en");
}

export function compareVersions(left, right) {
  const a = parsedVersion(left);
  const b = parsedVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) return Math.sign(a.core[index] - b.core[index]);
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    return a.prerelease.length === b.prerelease.length
      ? 0
      : a.prerelease.length === 0 ? 1 : -1;
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    if (a.prerelease[index] === undefined) return -1;
    if (b.prerelease[index] === undefined) return 1;
    const compared = compareIdentifier(a.prerelease[index], b.prerelease[index]);
    if (compared !== 0) return Math.sign(compared);
  }
  return 0;
}

function exactVersion(value) {
  try {
    parsedVersion(value);
    return value;
  } catch {
    return undefined;
  }
}

function component(current, latest) {
  if (latest === undefined) return { current, latest: null, state: "unknown" };
  return {
    current,
    latest,
    state: compareVersions(current, latest) < 0 ? "update-available" : "current",
  };
}

function codexComponent(current, latest, installable) {
  if (current === null) {
    return { current: null, latest: null, installable: null, state: "not-included" };
  }
  if (latest === undefined || installable === undefined) {
    return { current, latest: latest ?? null, installable: installable ?? null, state: "unknown" };
  }
  const installableUpdate = compareVersions(current, installable) < 0;
  const newerUnqualifiedRelease = compareVersions(current, latest) < 0;
  return {
    current,
    latest,
    installable,
    state: installableUpdate
      ? "update-available"
      : newerUnqualifiedRelease ? "awaiting-vibeify" : "current",
  };
}

async function networkJson(url, signal) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: signal === undefined ? timeout : AbortSignal.any([signal, timeout]),
  });
  if (!response.ok) throw new Error(`update source returned HTTP ${response.status}`);
  const value = await response.json();
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("update source returned an invalid document");
  }
  return value;
}

export async function installedDshVersion() {
  const { stdout } = await execFileAsync("dsh", ["--version"], {
    encoding: "utf8",
    timeout: REQUEST_TIMEOUT_MS,
  });
  const candidates = stdout.trim().split(/\s+/).reverse();
  for (const candidate of candidates) {
    const version = exactVersion(candidate);
    if (version !== undefined) return version;
  }
  throw new Error("DSH did not report a semantic version");
}

async function settledValue(promise, select) {
  try {
    const result = await promise;
    return exactVersion(select(result));
  } catch {
    return undefined;
  }
}

export function createUpdateChecker({
  current,
  fetchJson = networkJson,
  now = () => new Date(),
  cacheTtlMs = CACHE_TTL_MS,
} = {}) {
  if (typeof current?.dsh !== "function") throw new TypeError("current.dsh must be a function");
  parsedVersion(current.vibeify);
  if (current.codex !== null) parsedVersion(current.codex);
  let cached;
  let expiresAt = 0;

  return {
    async check({ force = false, signal } = {}) {
      const checkedAt = now();
      if (!force && cached !== undefined && checkedAt.getTime() < expiresAt) {
        return { ...cached, source: "cache" };
      }

      const dshCurrent = await current.dsh();
      parsedVersion(dshCurrent);
      const dshRequest = fetchJson(SOURCES.dsh, signal);
      const codexRequest = current.codex === null
        ? Promise.resolve({})
        : fetchJson(SOURCES.codex, signal);
      const vibeifyRequest = fetchJson(SOURCES.vibeify, signal);
      const [dshLatest, codexLatest, vibeifyLatest, installableCodex] = await Promise.all([
        settledValue(dshRequest, (value) => value.version),
        settledValue(codexRequest, (value) => value.version),
        settledValue(vibeifyRequest, (value) => value.version),
        settledValue(vibeifyRequest, (value) => value.dependencies?.["@openai/codex"]),
      ]);
      const components = {
        dsh: component(dshCurrent, dshLatest),
        vibeify: component(current.vibeify, vibeifyLatest),
        codex: codexComponent(current.codex, codexLatest, installableCodex),
      };
      cached = {
        checkedAt: checkedAt.toISOString(),
        source: "live",
        updateAvailable: Object.values(components).some((item) => item.state === "update-available"),
        components,
        updater: {
          url: INSTALLER_URL,
          label: "Download safe updater",
          restartRequiresIdleConfirmation: true,
        },
      };
      expiresAt = checkedAt.getTime() + cacheTtlMs;
      return cached;
    },
  };
}

function rpcError(code, message) {
  return { ok: false, error: { code, message, details: {} } };
}

function validCheckPayload(payload) {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return false;
  const keys = Object.keys(payload);
  return keys.every((key) => key === "force")
    && (payload.force === undefined || typeof payload.force === "boolean");
}

export function registerUpdateRpc(ctx, checker) {
  ctx.effect(() => ctx.connection.rpc.handle(
    UPDATE_CHANNEL,
    async (endpoint, payload, signal) => {
      if (endpoint !== "check") return rpcError("not-found", "Unknown Vibeify update action.");
      if (!validCheckPayload(payload)) return rpcError("invalid-request", "The update check request was invalid.");
      try {
        return { ok: true, value: await checker.check({ force: payload.force === true, signal }) };
      } catch {
        return rpcError("update-check-failed", "Installed versions could not be read. Nothing was changed.");
      }
    },
    { authority: "loopback" },
  ), "dsh-vibeify: loopback update checks");
}

export const UPDATE_SOURCES = SOURCES;
