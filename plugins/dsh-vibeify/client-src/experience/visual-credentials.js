// Keep host-version differences outside the Images UI. Neither API returns keys.
export function createVisualCredentials({ remote, legacy } = {}) {
  function accepted(response) {
    if (response?.ok !== true) throw new Error("Image credential operation failed.");
    return response.value;
  }
  return Object.freeze({
    async describe(refs) {
      if (remote) return accepted(await remote.describe(refs));
      const response = await legacy.describe({ refs });
      return accepted(response?.result)?.credentials ?? {};
    },
    async set(ref, value) {
      if (remote) accepted(await remote.set(ref, value));
      else accepted((await legacy.set({ ref, value }))?.result);
    },
    async unset(ref) {
      if (remote) accepted(await remote.unset(ref));
      else accepted((await legacy.unset({ ref }))?.result);
    },
  });
}
