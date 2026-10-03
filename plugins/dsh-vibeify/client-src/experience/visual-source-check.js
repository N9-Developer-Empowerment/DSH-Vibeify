import { cleanVisualSearchResult, VISUAL_RPC_CHANNEL, visualImageLoads } from "./visual-source-client.js";

export const VISUAL_SOURCE_LABELS = { wikimedia: "Wikimedia Commons", openverse: "Openverse", pexels: "Pexels", pixabay: "Pixabay" };

export async function checkVisualSources(connection, imageLoads = visualImageLoads) {
  const response = await connection.rpc.call(VISUAL_RPC_CHANNEL, "search", { query: "red bicycle", orientation: "landscape", limit: 4 });
  if (response?.ok !== true) throw new Error("Image sources could not be checked.");
  const value = response.value;
  const providers = (value?.providers ?? []).filter(provider => Object.hasOwn(VISUAL_SOURCE_LABELS, provider));
  const failed = providers.filter(provider => value.failedProviders?.includes(provider));
  let image = null;
  for (const candidate of cleanVisualSearchResult(value)) {
    if (await imageLoads(candidate.imageUrl)) { image = candidate; break; }
  }
  return { ready: providers.filter(provider => !failed.includes(provider)), failed, image };
}

