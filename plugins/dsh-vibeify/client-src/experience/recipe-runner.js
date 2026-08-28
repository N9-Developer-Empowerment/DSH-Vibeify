export const RECIPE_RUN_EVENT = "dsh-vibeify:run-recipe";
export const RECIPE_STATUS_EVENT = "dsh-vibeify:recipe-status";
export const RECIPE_STOP_EVENT = "dsh-vibeify:stop-recipe";
export const VIBE_UPDATE_TIMEOUT_MS = 20 * 60 * 1000;

const UPDATE_SESSION_KEY = "dsh-vibeify.magazine-session.v1";

export function createStreamEnvelope({ id, prompt, batchSize, answerLabels = [] }) {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id)) throw new TypeError("stream id is invalid");
  if (typeof prompt !== "string" || prompt.length < 1800) throw new TypeError("stream prompt is not detailed enough");
  if (!Number.isInteger(batchSize) || batchSize < 4 || batchSize > 12) throw new TypeError("stream batch size is invalid");
  const answers = Array.isArray(answerLabels)
    ? [...new Set(answerLabels.filter((label) => typeof label === "string").map((label) => label.trim()).filter(Boolean))].slice(-12)
    : [];
  return Object.freeze({
    id,
    title: "VIBE magazine update",
    prompt,
    batchSize,
    answers: Object.freeze(answers),
    mode: "manual-stream-update",
  });
}

export function createRecipeEnvelope(episode, preferenceLabels = []) {
  if (episode === null || typeof episode !== "object") throw new TypeError("recipe episode is required");
  if (typeof episode.id !== "string" || typeof episode.title !== "string" || typeof episode.studioPrompt !== "string") {
    throw new TypeError("recipe episode is incomplete");
  }
  if (episode.studioPrompt.length < 1800) throw new TypeError("recipe prompt is not detailed enough for one-click execution");
  const preferences = Array.isArray(preferenceLabels)
    ? [...new Set(preferenceLabels.filter((label) => typeof label === "string").map((label) => label.trim()).filter(Boolean))].slice(0, 6)
    : [];
  const preferencePrompt = preferences.length === 0
    ? ""
    : `\n\n## User-selected refresh priorities\nTreat these as optional priorities, not inferred facts: ${preferences.join(", ")}.`;
  return Object.freeze({
    id: episode.id,
    title: episode.title,
    prompt: `${episode.studioPrompt}${preferencePrompt}`,
    preview: Object.freeze({
      eyebrow: episode.eyebrow,
      description: episode.description,
      editorialNote: episode.editorialNote,
      features: Object.freeze([...episode.resultFeatures]),
      accent: episode.accent,
    }),
    preferences: Object.freeze(preferences),
  });
}

function status(detail) {
  window.dispatchEvent(new CustomEvent(RECIPE_STATUS_EVENT, { detail }));
}

function storage() {
  try { return window.localStorage; } catch { return null; }
}

function storedSessionId() {
  try {
    const value = storage()?.getItem(UPDATE_SESSION_KEY) ?? "";
    return /^[a-z0-9][a-z0-9-]{7,95}$/i.test(value) ? value : null;
  } catch {
    return null;
  }
}

function saveSessionId(sessionId) {
  try { storage()?.setItem(UPDATE_SESSION_KEY, sessionId); } catch { /* A fresh session can be created next time. */ }
}

function currentSessionDefaults(sessions) {
  const snapshot = sessions.list.getSnapshot();
  const current = snapshot.current === undefined ? null : snapshot.byId?.[snapshot.current];
  return current === null || current === undefined ? {} : {
    ...(typeof current.cwd === "string" ? { cwd: current.cwd } : {}),
    ...(typeof current.agentPreset === "string" ? { agentPreset: current.agentPreset } : {}),
  };
}

function timeZone() {
  try {
    const value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function latestTurnEnd(entries) {
  let latest = null;
  for (const entry of Array.isArray(entries) ? entries : []) {
    const event = entry?.event ?? entry;
    if (event?.type !== "turn/end" || !Number.isFinite(event.seq)) continue;
    if (latest === null || event.seq > latest.seq) latest = { seq: event.seq, kind: event.data?.reason?.kind };
  }
  return latest;
}

async function historyEnd(connection, sessionId) {
  try {
    const response = await connection.api.sessions.history({ sessionId, maxMessages: 50 });
    if (!response?.result?.ok) return null;
    return latestTurnEnd(response.result.value.events);
  } catch {
    return null;
  }
}

export function installRecipeRunner(ctx) {
  const connection = ctx.get("connection");
  const sessions = ctx.get("sessions");
  ctx.effect(() => {
    let active = null;
    let generation = 0;
    let timeout = null;

    const clearActive = () => {
      if (timeout !== null) window.clearTimeout(timeout);
      timeout = null;
      active = null;
    };

    const checkSettled = async () => {
      if (active === null || active.sessionId === null || active.submitted !== true) return;
      if (active.checking === true) {
        active.checkAgain = true;
        return;
      }
      const candidate = active;
      const summary = sessions.list.getSnapshot().byId?.[candidate.sessionId];
      if (summary === undefined) return;
      if (summary.running === true) {
        candidate.sawRunning = true;
        return;
      }
      candidate.checking = true;
      candidate.checkAgain = false;
      const end = await historyEnd(connection, candidate.sessionId);
      if (active !== candidate) return;
      candidate.checking = false;
      if (end === null || end.seq <= candidate.baselineEndSeq) {
        if (candidate.checkAgain) void checkSettled();
        return;
      }
      clearActive();
      const state = end.kind === "completed" ? "complete" : end.kind === "aborted" ? "stopped" : "error";
      status({ state, id: candidate.id, title: candidate.title, sessionId: candidate.sessionId });
    };

    const stopActive = async (state = "stopped") => {
      if (active === null) return;
      const stopping = active;
      if (stopping.sessionId === null) {
        generation += 1;
        clearActive();
        status({ state, id: stopping.id, title: stopping.title });
        return;
      }
      const response = await connection.api.sessions.cancel({ sessionId: stopping.sessionId });
      if (active !== stopping) return;
      if (!response?.result?.ok) {
        status({ state: "error", id: stopping.id, title: stopping.title, sessionId: stopping.sessionId, message: "The magazine update could not be stopped." });
        return;
      }
      clearActive();
      status({ state, id: stopping.id, title: stopping.title, sessionId: stopping.sessionId });
    };

    const onRun = async (event) => {
      const recipe = event.detail;
      if (recipe === null || typeof recipe !== "object" || recipe.mode !== "manual-stream-update" || typeof recipe.prompt !== "string") return;
      if (active !== null) {
        status({ state: "busy", id: recipe.id, title: recipe.title, sessionId: active.sessionId });
        return;
      }
      generation += 1;
      const thisGeneration = generation;
      active = {
        id: recipe.id,
        title: recipe.title,
        sessionId: null,
        sawRunning: false,
        submitted: false,
        baselineEndSeq: -1,
        checking: false,
        checkAgain: false,
      };
      status({ state: "starting", id: recipe.id, title: recipe.title });
      let sessionId = storedSessionId();
      const snapshot = sessions.list.getSnapshot();
      if (sessionId !== null && snapshot.byId?.[sessionId]?.running === true) {
        clearActive();
        status({ state: "busy", id: recipe.id, title: recipe.title, sessionId });
        return;
      }
      if (sessionId === null || snapshot.byId?.[sessionId] === undefined) {
        const created = await connection.api.sessions.create(currentSessionDefaults(sessions));
        if (thisGeneration !== generation || active === null) return;
        if (!created?.result?.ok) {
          clearActive();
          status({ state: "error", id: recipe.id, title: recipe.title, message: "The magazine update session could not be created." });
          return;
        }
        sessionId = created.result.value.sessionId;
        saveSessionId(sessionId);
        await connection.api.sessions.rename({ sessionId, title: "VIBE magazine updates" });
        if (thisGeneration !== generation || active === null) return;
      }
      active.sessionId = sessionId;
      active.baselineEndSeq = (await historyEnd(connection, sessionId))?.seq ?? -1;
      if (thisGeneration !== generation || active === null) return;
      const zone = timeZone();
      const submitted = await connection.api.sessions.prompt({
        sessionId,
        mode: "queue",
        content: [{ type: "text", text: recipe.prompt }],
        ...(zone === undefined ? {} : { clientTimeZone: zone }),
      });
      if (thisGeneration !== generation || active === null) return;
      if (!submitted?.result?.ok) {
        clearActive();
        status({ state: "error", id: recipe.id, title: recipe.title, sessionId, message: "The magazine update was not accepted." });
        return;
      }
      active.submitted = true;
      status({ state: "submitted", id: recipe.id, title: recipe.title, sessionId });
      timeout = window.setTimeout(() => { void stopActive("timed-out"); }, VIBE_UPDATE_TIMEOUT_MS);
      void checkSettled();
    };
    const onStop = (event) => {
      if (active === null || (event.detail?.id !== undefined && event.detail.id !== active.id)) return;
      status({ state: "stopping", id: active.id, title: active.title, sessionId: active.sessionId });
      void stopActive("stopped");
    };
    const unsubscribe = sessions.list.subscribe(() => { void checkSettled(); });
    window.addEventListener(RECIPE_RUN_EVENT, onRun);
    window.addEventListener(RECIPE_STOP_EVENT, onStop);
    return () => {
      generation += 1;
      if (timeout !== null) window.clearTimeout(timeout);
      unsubscribe();
      window.removeEventListener(RECIPE_RUN_EVENT, onRun);
      window.removeEventListener(RECIPE_STOP_EVENT, onStop);
    };
  }, "dsh-vibeify: explicit bounded magazine update runner");
}
