export const PULL_REFRESH_THRESHOLD = 72;
export const TRACKPAD_PULL_SETTLE_MS = 160;
const MAX_PULL_DISTANCE = 120;

export function createPullRefreshState() {
  return Object.freeze({ tracking: false, startY: 0, distance: 0, armed: false, requested: false });
}

/** Pure pull-to-refresh state machine; only an armed release requests work. */
export function reducePullRefresh(state, action) {
  const current = state ?? createPullRefreshState();
  if (action === null || typeof action !== "object") return current;
  if (action.type === "start") {
    if (action.atTop !== true || !Number.isFinite(action.y)) return current;
    return Object.freeze({ tracking: true, startY: action.y, distance: 0, armed: false, requested: false });
  }
  if (action.type === "move") {
    if (!current.tracking || !Number.isFinite(action.y)) return current;
    const distance = Math.max(0, Math.min(MAX_PULL_DISTANCE, action.y - current.startY));
    return Object.freeze({ ...current, distance, armed: distance >= PULL_REFRESH_THRESHOLD, requested: false });
  }
  if (action.type === "cancel") return createPullRefreshState();
  if (action.type === "end") {
    if (!current.tracking) return createPullRefreshState();
    return Object.freeze({ ...createPullRefreshState(), requested: current.armed });
  }
  return current;
}

export function createTrackpadPullRefreshState() {
  return Object.freeze({ sequence: false, eligible: false, distance: 0, armed: false, requested: false });
}

/**
 * Mac trackpads expose a two-finger pull as pixel wheel deltas and do not expose
 * a release event. A sequence is eligible only when its first delta pulls past
 * the top boundary; reaching the top during an ordinary upward scroll is not
 * enough to request work.
 */
export function reduceTrackpadPullRefresh(state, action) {
  const current = state ?? createTrackpadPullRefreshState();
  if (action === null || typeof action !== "object") return current;
  if (action.type === "cancel") return createTrackpadPullRefreshState();
  if (action.type === "end") {
    if (!current.sequence) return createTrackpadPullRefreshState();
    return Object.freeze({ ...createTrackpadPullRefreshState(), requested: current.eligible && current.armed });
  }
  if (action.type !== "wheel" || !Number.isFinite(action.deltaY)) return current;

  if (!current.sequence) {
    const eligible = action.atTop === true
      && action.deltaMode === 0
      && action.modified !== true
      && action.deltaY < 0;
    if (!eligible) return Object.freeze({ ...createTrackpadPullRefreshState(), sequence: true });
    const distance = Math.min(MAX_PULL_DISTANCE, -action.deltaY);
    return Object.freeze({ sequence: true, eligible: true, distance, armed: distance >= PULL_REFRESH_THRESHOLD, requested: false });
  }

  if (!current.eligible) return current;
  if (action.modified === true || action.deltaMode !== 0 || (action.atTop !== true && action.deltaY > 0)) {
    return Object.freeze({ ...current, eligible: false, distance: 0, armed: false, requested: false });
  }
  const distance = Math.max(0, Math.min(MAX_PULL_DISTANCE, current.distance - action.deltaY));
  return Object.freeze({ ...current, distance, armed: distance >= PULL_REFRESH_THRESHOLD, requested: false });
}
