export const VIBE_PERSISTENCE_FAILURE_EVENT = "dsh-vibeify:persistence-failure";

let persistenceFailed = false;
export function hasPersistenceFailure() { return persistenceFailed; }

// Notify the active magazine without exposing article content or storage details.
export function reportPersistenceFailure() {
  persistenceFailed = true;
  try { globalThis.window?.dispatchEvent(new Event(VIBE_PERSISTENCE_FAILURE_EVENT)); } catch { /* No active browser. */ }
}
