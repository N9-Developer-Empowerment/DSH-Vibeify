import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS = Object.freeze({
  neonRain: "neon-rain.jpg",
  getReady: "get-ready.jpg",
  sayItBetter: "say-it-better.jpg",
  shopScene: "shop-the-scene.jpg",
  makeupArtist: "makeup-artist.jpg",
  cityStyle: "city-style.jpg",
});

export function vibeifyArtworkPlugin(pluginRoot) {
  return {
    name: "vibeify-artwork",
    setup(buildApi) {
      buildApi.onResolve({ filter: /^virtual:vibeify-artwork$/ }, () => ({
        path: "vibeify-artwork",
        namespace: "vibeify",
      }));
      buildApi.onLoad({ filter: /.*/, namespace: "vibeify" }, async () => {
        const entries = await Promise.all(Object.entries(ASSETS).map(async ([key, filename]) => {
          const bytes = await readFile(join(pluginRoot, "assets", "experience", filename));
          return [key, `data:image/jpeg;base64,${bytes.toString("base64")}`];
        }));
        return {
          contents: `export const ARTWORK = Object.freeze(${JSON.stringify(Object.fromEntries(entries))});`,
          loader: "js",
        };
      });
    },
  };
}
