export const EXPERIENCE_STORAGE_KEY = "dsh-vibeify.experience.v2";

const ID = /^[a-z0-9][a-z0-9_.:-]{0,95}$/;

export function createExperienceState() {
  return Object.freeze({
    view: "home",
    savedChunkIds: Object.freeze([]),
    lastReadChunkId: null,
  });
}

function withState(state, patch) {
  return Object.freeze({ ...state, ...patch });
}

export function reduceExperience(state, action) {
  if (action === null || typeof action !== "object") return state;
  switch (action.type) {
    case "home":
      return withState(state, { view: "home" });
    case "enter-chat":
      return withState(state, { view: "chat" });
    case "toggle-save": {
      if (typeof action.chunkId !== "string" || !ID.test(action.chunkId)) return state;
      const saved = new Set(state.savedChunkIds);
      if (saved.has(action.chunkId)) saved.delete(action.chunkId); else saved.add(action.chunkId);
      return withState(state, { savedChunkIds: Object.freeze([...saved]) });
    }
    case "mark-read":
      return typeof action.chunkId === "string" && ID.test(action.chunkId)
        ? withState(state, { lastReadChunkId: action.chunkId })
        : state;
    default:
      return state;
  }
}

function sanitiseStoredState(value) {
  const base = createExperienceState();
  if (value === null || typeof value !== "object") return base;
  const savedChunkIds = Array.isArray(value.savedChunkIds)
    ? [...new Set(value.savedChunkIds.filter((id) => typeof id === "string" && ID.test(id)))].slice(-80)
    : [];
  return Object.freeze({
    // Chat is a deliberate lean-forward visit, never the next landing page.
    view: "home",
    savedChunkIds: Object.freeze(savedChunkIds),
    lastReadChunkId: typeof value.lastReadChunkId === "string" && ID.test(value.lastReadChunkId) ? value.lastReadChunkId : null,
  });
}

export function loadExperienceState(storage) {
  if (storage === undefined || storage === null) return createExperienceState();
  try {
    const raw = storage.getItem(EXPERIENCE_STORAGE_KEY);
    return raw === null ? createExperienceState() : sanitiseStoredState(JSON.parse(raw));
  } catch {
    return createExperienceState();
  }
}

export function saveExperienceState(storage, state) {
  if (storage === undefined || storage === null) return;
  try {
    storage.setItem(EXPERIENCE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // The feed remains usable when browser storage is unavailable.
  }
}
