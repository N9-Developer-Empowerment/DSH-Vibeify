/** Shared provenance rules. Display and sharing must agree on reusable image families. */
export const REUSABLE_IMAGE_FAMILIES = Object.freeze([
  { image: /^(?:upload|thumb)\.wikimedia\.org$/, source: /^commons\.wikimedia\.org$/, licence: /\b(?:CC0|CC BY(?:-SA)?(?!-)(?: \d(?:\.\d)?)?|public domain)\b/i },
  { image: /^live\.staticflickr\.com$/, source: /^(?:www\.)?flickr\.com$/, licence: /\b(?:CC0|CC BY(?:-SA)?(?!-)(?: \d(?:\.\d)?)?|no known copyright restrictions|public domain)\b/i },
  { image: /^images-assets\.nasa\.gov$/, source: /^images\.nasa\.gov$/, licence: /\b(?:NASA|public domain)\b/i },
  { image: /^tile\.loc\.gov$/, source: /^(?:www\.)?loc\.gov$/, licence: /\b(?:no known copyright restrictions|public domain)\b/i },
  { image: /^ids\.si\.edu$/, source: /^(?:www\.)?si\.edu$/, licence: /\b(?:CC0|CC BY(?:-SA)?(?!-)|public domain)\b/i },
]);
