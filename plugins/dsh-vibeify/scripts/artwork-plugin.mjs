import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ASSETS = Object.freeze({
  neonRain: Object.freeze({ filename: "neon-rain.jpg", mime: "image/jpeg" }),
  getReady: Object.freeze({ filename: "get-ready.jpg", mime: "image/jpeg" }),
  sayItBetter: Object.freeze({ filename: "say-it-better.jpg", mime: "image/jpeg" }),
  shopScene: Object.freeze({ filename: "shop-the-scene.jpg", mime: "image/jpeg" }),
  makeupArtist: Object.freeze({ filename: "makeup-artist.jpg", mime: "image/jpeg" }),
  cityStyle: Object.freeze({ filename: "city-style.jpg", mime: "image/jpeg" }),
  neonGraphic: Object.freeze({ filename: "graphic-neon.svg", mime: "image/svg+xml" }),
  careGraphic: Object.freeze({ filename: "graphic-care.svg", mime: "image/svg+xml" }),
  conversationGraphic: Object.freeze({ filename: "graphic-conversation.svg", mime: "image/svg+xml" }),
  styleGraphic: Object.freeze({ filename: "graphic-style.svg", mime: "image/svg+xml" }),
  makeupGraphic: Object.freeze({ filename: "graphic-makeup.svg", mime: "image/svg+xml" }),
  streetGraphic: Object.freeze({ filename: "graphic-street.svg", mime: "image/svg+xml" }),
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
        const entries = await Promise.all(Object.entries(ASSETS).map(async ([key, asset]) => {
          const bytes = await readFile(join(pluginRoot, "assets", "experience", asset.filename));
          return [key, `data:${asset.mime};base64,${bytes.toString("base64")}`];
        }));
        return {
          contents: `export const ARTWORK = Object.freeze(${JSON.stringify(Object.fromEntries(entries))});`,
          loader: "js",
        };
      });
    },
  };
}
