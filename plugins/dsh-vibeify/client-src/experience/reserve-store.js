export const RESERVE_STORE_KEY = "dsh-vibeify.reserve.v1";
export const RESERVE_STORE_VERSION = 1;
export const RESERVE_SIGNAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESERVE_CANDIDATE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
export const RESERVE_APPROVED_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_RESERVE_SIGNALS = 160;
export const MAX_RESERVE_CANDIDATES = 200;
export const MAX_RESERVE_APPROVED = 80;
export const BACKGROUND_RUN_RESERVATION_USD = 0.25;

const KINDS = new Set(["article", "editorial", "recommendation", "image", "music", "video", "questionnaire"]);
const ID = /^[a-z0-9][a-z0-9_.:-]{0,95}$/;

function cleanText(value, limit, multiline = false) {
  if (typeof value !== "string") return null;
  const control = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g;
  const cleaned = value.replace(control, multiline ? "" : " ").replace(multiline ? /[ \t]+\n/g : /\s+/g, multiline ? "\n" : " ").trim();
  return cleaned.length === 0 ? null : cleaned.slice(0, limit);
}

function safeHttps(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") return null;
    return url.href;
  } catch { return null; }
}

function cleanSignal(candidate, now) {
  if (candidate === null || typeof candidate !== "object") return null;
  const id = cleanText(candidate.id, 96);
  const headline = cleanText(candidate.headline, 220);
  const url = safeHttps(candidate.url);
  const collectedAt = Number(candidate.collectedAt ?? now);
  if (id === null || !ID.test(id) || headline === null || url === null || !Number.isFinite(collectedAt) || now - collectedAt > RESERVE_SIGNAL_TTL_MS) return null;
  return Object.freeze({ id, headline, url, region: cleanText(candidate.region, 40) ?? "global", tribeHints: Object.freeze((Array.isArray(candidate.tribeHints) ? candidate.tribeHints : []).slice(0, 8)), momentum: Math.max(0, Math.min(100, Number(candidate.momentum) || 0)), collectedAt });
}

function cleanPage(candidate, now, state) {
  if (candidate === null || typeof candidate !== "object" || !KINDS.has(candidate.kind)) return null;
  const id = cleanText(candidate.id, 96);
  const title = cleanText(candidate.title, 180);
  const markdown = cleanText(candidate.markdown, 16_000, true);
  const generatedAt = Number(candidate.generatedAt ?? now);
  const ttl = state === "candidate" ? RESERVE_CANDIDATE_TTL_MS : RESERVE_APPROVED_TTL_MS;
  if (id === null || !ID.test(id) || title === null || markdown === null || !Number.isFinite(generatedAt) || now - generatedAt > ttl) return null;
  return Object.freeze({ id, kind: candidate.kind, title, markdown, tribes: Object.freeze((Array.isArray(candidate.tribes) ? candidate.tribes : []).slice(0, 8)), generatedAt, state });
}

function cleanLedger(rows, now) {
  const today = new Date(now).toISOString().slice(0, 10);
  return Object.freeze((Array.isArray(rows) ? rows : []).filter((row) =>
    row !== null && typeof row === "object" && row.day === today && Number.isFinite(Number(row.amountUsd)) && Number(row.amountUsd) >= 0
  ).map((row) => Object.freeze({ day: today, amountUsd: Math.round(Number(row.amountUsd) * 1_000_000) / 1_000_000, kind: row.kind === "actual" ? "actual" : "reserved", runId: cleanText(row.runId, 96) ?? "background" })).slice(-64));
}

function emptyStore() {
  return Object.freeze({ version: RESERVE_STORE_VERSION, lastActivityAt: 0, radarGeneratedAt: null, signals: Object.freeze([]), candidates: Object.freeze([]), approved: Object.freeze([]), ledger: Object.freeze([]) });
}

function readStore(storage, now = Date.now()) {
  if (storage === null || storage === undefined || typeof storage.getItem !== "function") return emptyStore();
  try {
    const parsed = JSON.parse(storage.getItem(RESERVE_STORE_KEY) ?? "null");
    if (parsed === null || typeof parsed !== "object" || parsed.version !== RESERVE_STORE_VERSION) return emptyStore();
    return Object.freeze({
      version: RESERVE_STORE_VERSION,
      lastActivityAt: Number.isFinite(Number(parsed.lastActivityAt)) ? Number(parsed.lastActivityAt) : 0,
      radarGeneratedAt: typeof parsed.radarGeneratedAt === "string" ? parsed.radarGeneratedAt : null,
      signals: Object.freeze((Array.isArray(parsed.signals) ? parsed.signals : []).map((entry) => cleanSignal(entry, now)).filter(Boolean).slice(-MAX_RESERVE_SIGNALS)),
      candidates: Object.freeze((Array.isArray(parsed.candidates) ? parsed.candidates : []).map((entry) => cleanPage(entry, now, "candidate")).filter(Boolean).slice(-MAX_RESERVE_CANDIDATES)),
      approved: Object.freeze((Array.isArray(parsed.approved) ? parsed.approved : []).map((entry) => cleanPage(entry, now, "approved")).filter(Boolean).slice(-MAX_RESERVE_APPROVED)),
      ledger: cleanLedger(parsed.ledger, now),
    });
  } catch { return emptyStore(); }
}

function writeStore(storage, store) {
  if (storage === null || storage === undefined || typeof storage.setItem !== "function") return false;
  try { storage.setItem(RESERVE_STORE_KEY, JSON.stringify(store)); return true; } catch { return false; }
}

export function getEditorialReserve(storage, now = Date.now()) { return readStore(storage, now); }

export function markVibeActivity(storage, now = Date.now()) {
  const store = readStore(storage, now);
  writeStore(storage, { ...store, lastActivityAt: now });
  return now;
}

export function replaceRadarSignals(storage, edition, now = Date.now()) {
  if (edition === null || typeof edition !== "object" || !Array.isArray(edition.signals)) return false;
  const signals = edition.signals.map((entry) => cleanSignal({ ...entry, collectedAt: now }, now)).filter(Boolean).slice(-MAX_RESERVE_SIGNALS);
  if (signals.length === 0) return false;
  const store = readStore(storage, now);
  return writeStore(storage, { ...store, radarGeneratedAt: typeof edition.generatedAt === "string" ? edition.generatedAt : null, signals });
}

export function appendReservePages(storage, candidates, state, now = Date.now()) {
  if (!Array.isArray(candidates) || !["candidate", "approved"].includes(state)) return Object.freeze([]);
  const store = readStore(storage, now);
  const existing = state === "candidate" ? store.candidates : store.approved;
  const seen = new Set(existing.map(({ id }) => id));
  const appended = [];
  for (const candidate of candidates) {
    const page = cleanPage({ ...candidate, generatedAt: candidate?.generatedAt ?? now }, now, state);
    if (page === null || seen.has(page.id)) continue;
    seen.add(page.id); appended.push(page);
  }
  const key = state === "candidate" ? "candidates" : "approved";
  const limit = state === "candidate" ? MAX_RESERVE_CANDIDATES : MAX_RESERVE_APPROVED;
  writeStore(storage, { ...store, [key]: [...existing, ...appended].slice(-limit) });
  return Object.freeze(appended);
}

export function consumeApprovedPages(storage, count = 4, now = Date.now()) {
  const store = readStore(storage, now);
  const take = Math.max(0, Math.min(12, Number.isInteger(count) ? count : 4));
  const consumed = store.approved.slice(0, take);
  if (consumed.length > 0) writeStore(storage, { ...store, approved: store.approved.slice(consumed.length) });
  return Object.freeze(consumed);
}

export function consumeCandidatePages(storage, count = 4, now = Date.now()) {
  const store = readStore(storage, now);
  const take = Math.max(0, Math.min(12, Number.isInteger(count) ? count : 4));
  const consumed = store.candidates.slice(0, take);
  if (consumed.length > 0) writeStore(storage, { ...store, candidates: store.candidates.slice(consumed.length) });
  return Object.freeze(consumed);
}

export function reserveBackgroundRun(storage, dailyBudgetUsd, runId, now = Date.now()) {
  const store = readStore(storage, now);
  const spent = store.ledger.reduce((sum, row) => sum + row.amountUsd, 0);
  const limit = Math.max(0, Math.min(2, Number(dailyBudgetUsd) || 0));
  if (spent + BACKGROUND_RUN_RESERVATION_USD > limit + 1e-9) return false;
  const day = new Date(now).toISOString().slice(0, 10);
  return writeStore(storage, { ...store, ledger: [...store.ledger, { day, amountUsd: BACKGROUND_RUN_RESERVATION_USD, kind: "reserved", runId }].slice(-64) });
}

export function dailyBackgroundSpend(storage, now = Date.now()) {
  return readStore(storage, now).ledger.reduce((sum, row) => sum + row.amountUsd, 0);
}

export function clearEditorialReserve(storage) {
  if (storage === null || storage === undefined || typeof storage.removeItem !== "function") return false;
  try { storage.removeItem(RESERVE_STORE_KEY); return true; } catch { return false; }
}
