export const PULL_REFRESH_THRESHOLD = 72;
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

