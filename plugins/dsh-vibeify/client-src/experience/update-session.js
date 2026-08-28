export const UPDATE_SESSION_KEY = "dsh-vibeify.magazine-session.v1";

export function readUpdateSessionId(storage) {
  if (storage === null || storage === undefined || typeof storage.getItem !== "function") return null;
  try {
    const value = storage.getItem(UPDATE_SESSION_KEY) ?? "";
    return /^[a-z0-9][a-z0-9-]{7,95}$/i.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeUpdateSessionId(storage, sessionId) {
  if (storage === null || storage === undefined || typeof storage.setItem !== "function") return false;
  if (typeof sessionId !== "string" || !/^[a-z0-9][a-z0-9-]{7,95}$/i.test(sessionId)) return false;
  try {
    storage.setItem(UPDATE_SESSION_KEY, sessionId);
    return true;
  } catch {
    return false;
  }
}
