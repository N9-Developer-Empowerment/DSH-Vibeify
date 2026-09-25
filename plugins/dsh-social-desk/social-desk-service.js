function disabledOperation() {
  return Object.assign(new Error("Legacy Social Desk writes are disabled. Share a public link instead."), {
    code: "disabled",
  });
}

function publicItem(item) {
  return structuredClone(item);
}

/**
 * Read-only compatibility for old local queues. No write path, scheduler or
 * connector is allowed to change a saved item or publish on its behalf.
 */
export function createSocialDeskService({ store } = {}) {
  if (typeof store?.read !== "function") throw new TypeError("A readable Social Desk queue store is required.");

  async function capabilities() {
    return Object.freeze({
      name: "Vibe Social Desk",
      available: false,
      channels: Object.freeze([]),
      approval: "disabled",
      automaticPublishing: false,
    });
  }

  async function list() {
    const document = await store.read();
    return { items: Array.isArray(document?.items) ? document.items.map(publicItem) : [] };
  }

  async function rejectWrite() {
    throw disabledOperation();
  }

  async function recover() {
    return { recovered: false };
  }

  async function tick() {
    return { attempted: 0 };
  }

  return Object.freeze({
    capabilities,
    list,
    prepare: rejectWrite,
    approveAndSchedule: rejectWrite,
    cancel: rejectWrite,
    retry: rejectWrite,
    recordManualPost: rejectWrite,
    recover,
    tick,
  });
}
