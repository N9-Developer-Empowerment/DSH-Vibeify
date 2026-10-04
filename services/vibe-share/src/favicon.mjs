import { cleanArticleAppearance, MAGAZINE_PALETTES } from "../../../shared/article-appearance.js";

/** Stable tab identity using only the fixed, shareable appearance catalogue. */
export function faviconPath(value) {
  const {look, mood, palette} = cleanArticleAppearance(value);
  return `/favicon.svg?v=1&look=${look}&mood=${mood}&palette=${palette}`;
}

export function faviconSvg(value) {
  const appearance = cleanArticleAppearance(value);
  const {background, ink, accent} = MAGAZINE_PALETTES[appearance.palette].colors;
  const radius = appearance.look === "bbc-news" ? 0 : 12;
  // A path, rather than text, keeps the V crisp and independent of installed fonts.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>VIBE</title><rect width="64" height="64" rx="${radius}" fill="${ink}"/><path d="M12 12h10l10 29 10-29h10L36 52h-8Z" fill="${background}"/><path d="M0 58h64v6H0Z" fill="${accent}"/></svg>`;
}
