export const BACKGROUND_SESSION_KEY = "dsh-vibeify.background-session.v1";
export const BACKGROUND_SESSION_TITLE = "VIBE background editor";

function validSessionId(value) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{7,95}$/i.test(value) ? value : null;
}

export function readBackgroundSessionId(storage) {
  if (storage === null || storage === undefined || typeof storage.getItem !== "function") return null;
  try { return validSessionId(storage.getItem(BACKGROUND_SESSION_KEY)); } catch { return null; }
}

export function writeBackgroundSessionId(storage, sessionId) {
  const id = validSessionId(sessionId);
  if (id === null || storage === null || storage === undefined || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(BACKGROUND_SESSION_KEY, id);
    return true;
  } catch {
    return false;
  }
}

/** Hidden reserve sessions can be recognised after cache loss as well as by id. */
export function isBackgroundSession(summary, storage) {
  if (summary === null || typeof summary !== "object") return false;
  const title = typeof summary.title === "string" ? summary.title.trim() : "";
  return summary.id === readBackgroundSessionId(storage) || title === BACKGROUND_SESSION_TITLE;
}
