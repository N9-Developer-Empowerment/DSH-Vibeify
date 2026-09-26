function coverHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function escapeCoverXml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function coverLines(value, width, limit) {
  const words = String(value ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line === "" ? word : `${line} ${word}`;
    if (candidate.length <= width || line === "") line = candidate;
    else {
      lines.push(line);
      line = word;
      if (lines.length >= limit) break;
    }
  }
  if (line !== "" && lines.length < limit) lines.push(line);
  if (words.length > 0 && lines.join(" ").length < words.join(" ").length) lines[lines.length - 1] = `${lines.at(-1).replace(/[.…]+$/, "")}…`;
  return lines;
}

export function createStoryCoverSvg(titleValue, markdownValue) {
  const title = String(titleValue ?? "A new Vibe").replace(/\s+/g, " ").trim().slice(0, 180);
  const excerpt = String(markdownValue ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>|`\\{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  const hue = coverHash(`${title}:${excerpt}`) % 360;
  const accent = (hue + 142) % 360;
  const titleMarkup = coverLines(title, 27, 4).map((line, index) => `<tspan x="72" y="${176 + index * 78}">${escapeCoverXml(line)}</tspan>`).join("");
  const excerptMarkup = coverLines(excerpt, 68, 2).map((line, index) => `<tspan x="74" y="${515 + index * 36}">${escapeCoverXml(line)}</tspan>`).join("");
  const circles = Array.from({ length: 5 }, (_value, index) => `<circle cx="${1040 - index * 43}" cy="${80 + index * 92}" r="${105 + index * 24}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeCoverXml(title)}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 42% 13%)"/><stop offset="1" stop-color="hsl(${(hue + 54) % 360} 48% 22%)"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><g fill="none" stroke="hsl(${accent} 82% 76%)" stroke-width="3" opacity=".22">${circles}</g><text x="72" y="74" fill="hsl(${accent} 88% 78%)" font-family="Arial,sans-serif" font-size="25" font-weight="800" letter-spacing="5">VIBE · ONE ARTICLE</text><text fill="#fffafc" font-family="Georgia,serif" font-size="68" font-weight="500">${titleMarkup}</text><text fill="#d7cbd2" font-family="Arial,sans-serif" font-size="27">${excerptMarkup}</text></svg>`;
}

/** Include the exact cover renderer in the dependency-free public preview script. */
export function storyCoverRuntimeSource() {
  return [coverHash, escapeCoverXml, coverLines, createStoryCoverSvg].map((fn) => fn.toString()).join("\n\n");
}
