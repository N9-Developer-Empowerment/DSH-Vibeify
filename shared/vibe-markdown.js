function safeHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "" ? url.href : null;
  } catch {
    return null;
  }
}

function comparableTitle(value) {
  return String(value ?? "")
    .replace(/\[([^\]]+)\]\([^\s)]+\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase();
}

/** The article chrome owns the title; an identical opening heading is redundant. */
export function stripDuplicatedLeadTitle(markdown, title) {
  if (typeof markdown !== "string") return "";
  const lead = markdown.match(/^\s*(?:(?:#{1,3})\s+([^\n]+)|\*\*([^*\n]+)\*\*)\s*(?:\n+|$)/);
  if (lead === null) return markdown;
  const candidate = lead[1] ?? lead[2] ?? "";
  if (comparableTitle(candidate) !== comparableTitle(title)) return markdown;
  return markdown.slice(lead[0].length).trimStart();
}

export function parseVibeInline(value) {
  const text = String(value ?? "").replace(/!\[[^\]\n]*\]\([^\s)]+\)/g, "");
  const pattern = /(\[([^\]\n]{1,240})\]\((https:\/\/[^\s)]+)\)|\*\*([^*\n]{1,300})\*\*|__([^_\n]{1,300})__|`([^`\n]{1,240})`|\*([^*\n]{1,300})\*|_([^_\n]{1,300})_)/g;
  const tokens = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) tokens.push({ type: "text", value: text.slice(cursor, match.index) });
    if (match[2] !== undefined) {
      const href = safeHttps(match[3]);
      tokens.push(href === null
        ? { type: "text", value: match[2] }
        : { type: "link", value: match[2], href });
    } else if (match[4] !== undefined || match[5] !== undefined) {
      tokens.push({ type: "strong", value: match[4] ?? match[5] });
    } else if (match[6] !== undefined) {
      tokens.push({ type: "code", value: match[6] });
    } else {
      tokens.push({ type: "emphasis", value: match[7] ?? match[8] });
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) tokens.push({ type: "text", value: text.slice(cursor) });
  return tokens;
}

function tableCells(line) {
  const value = String(line ?? "").trim();
  if (!value.startsWith("|") || !value.endsWith("|")) return null;
  const cells = value.slice(1, -1).split("|").map((cell) => cell.trim());
  return cells.length >= 2 && cells.every((cell) => cell.length > 0) ? cells : null;
}

export function markdownTableAt(lines, startIndex) {
  if (!Array.isArray(lines) || !Number.isInteger(startIndex)) return null;
  const headers = tableCells(lines[startIndex]);
  const alignment = tableCells(lines[startIndex + 1]);
  if (headers === null || alignment === null || headers.length !== alignment.length) return null;
  if (!alignment.every((cell) => /^:?-{3,}:?$/.test(cell))) return null;
  const rows = [];
  let nextIndex = startIndex + 2;
  while (nextIndex < lines.length) {
    const cells = tableCells(lines[nextIndex]);
    if (cells === null || cells.length !== headers.length) break;
    rows.push(cells);
    nextIndex += 1;
  }
  return { headers, rows, nextIndex };
}

function subscript(value) {
  const characters = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", a: "ₐ", e: "ₑ", h: "ₕ", i: "ᵢ", j: "ⱼ", k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ", o: "ₒ", p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", u: "ᵤ", v: "ᵥ", x: "ₓ" };
  return [...String(value ?? "")].map((character) => characters[character.toLowerCase()] ?? character).join("");
}

/** Convert the small formula vocabulary used by Vibe articles into readable display text. */
export function formatVibeMath(value) {
  let text = String(value ?? "").trim();
  text = text
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/\\rho(?![A-Za-z])/g, "ρ")
    .replace(/\\approx(?![A-Za-z])/g, "≈")
    .replace(/\\times(?![A-Za-z])|\\cdot(?![A-Za-z])/g, "×")
    .replace(/\^\{3\/2\}/g, "³⁄²")
    .replace(/\^\{1\/2\}/g, "¹⁄²")
    .replace(/\^2\b/g, "²")
    .replace(/\^3\b/g, "³")
    .replace(/\\sqrt\{([^{}]*)\}/g, "√($1)")
    .replace(/\\(?:tfrac|frac)\{([^{}]*)\}\{([^{}]*)\}/g, "$1⁄$2")
    .replace(/_\{?([A-Za-z0-9]+)\}?/g, (_match, label) => subscript(label))
    .replace(/[{}]/g, "")
    .replace(/\\([A-Za-z]+)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function displayMathAt(lines, startIndex) {
  const line = String(lines[startIndex] ?? "").trim();
  const sameLine = /^(?:\\\[|\$\$)([\s\S]*?)(?:\\\]|\$\$)$/.exec(line);
  if (sameLine !== null) return { value: formatVibeMath(sameLine[1]), nextIndex: startIndex + 1 };
  const closing = line === "\\[" ? "\\]" : line === "$$" ? "$$" : null;
  if (closing === null) return null;
  const parts = [];
  let nextIndex = startIndex + 1;
  while (nextIndex < lines.length && String(lines[nextIndex]).trim() !== closing) {
    parts.push(String(lines[nextIndex]).trim());
    nextIndex += 1;
  }
  if (nextIndex >= lines.length) return null;
  return { value: formatVibeMath(parts.join(" ")), nextIndex: nextIndex + 1 };
}

/** One presentation AST is consumed by the Vibe, private preview and public article. */
export function parseVibeMarkdown(markdown, title = "") {
  const source = stripDuplicatedLeadTitle(String(markdown ?? ""), title)
    .replace(/!\[[^\]\n]*\]\([^\s)]+\)/g, "");
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;
  const special = (line) => /^#{1,3}\s|^>\s?|^[-*]\s+|^\d+[.)]\s+|^```|^\\\[|^\$\$/.test(String(line).trim());
  while (index < lines.length) {
    const line = String(lines[index] ?? "");
    const trimmed = line.trim();
    if (trimmed === "") { index += 1; continue; }
    const math = displayMathAt(lines, index);
    if (math !== null) {
      blocks.push({ type: "math", value: math.value });
      index = math.nextIndex;
      continue;
    }
    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim().replace(/[^a-zA-Z0-9_+-]/g, "").slice(0, 24);
      const parts = [];
      index += 1;
      while (index < lines.length && !String(lines[index]).trim().startsWith("```")) {
        parts.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code-block", value: parts.join("\n"), language });
      continue;
    }
    const table = markdownTableAt(lines, index);
    if (table !== null) {
      blocks.push({ type: "table", headers: table.headers, rows: table.rows });
      index = table.nextIndex;
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading !== null) {
      blocks.push({ type: "heading", level: Math.min(3, heading[1].length + 1), value: heading[2] });
      index += 1;
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
    const ordered = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    if (bullet !== null || ordered !== null) {
      const kind = bullet !== null ? "unordered" : "ordered";
      const pattern = bullet !== null ? /^[-*]\s+(.+)$/ : /^\d+[.)]\s+(.+)$/;
      const items = [];
      while (index < lines.length) {
        const item = pattern.exec(String(lines[index]).trim());
        if (item === null) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ type: "list", kind, items });
      continue;
    }
    if (/^>\s?/.test(trimmed)) {
      const parts = [];
      while (index < lines.length && /^>\s?/.test(String(lines[index]).trim())) {
        parts.push(String(lines[index]).trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", value: parts.join(" ") });
      continue;
    }
    const paragraph = [];
    while (index < lines.length && String(lines[index]).trim() !== "" && !special(lines[index]) && markdownTableAt(lines, index) === null) {
      paragraph.push(String(lines[index]).trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", value: paragraph.join(" ") });
  }
  return blocks;
}

/** Embed the exact parser functions in the privacy-preserving standalone preview client. */
export function vibeMarkdownRuntimeSource() {
  return [
    safeHttps,
    comparableTitle,
    stripDuplicatedLeadTitle,
    parseVibeInline,
    tableCells,
    markdownTableAt,
    subscript,
    formatVibeMath,
    displayMathAt,
    parseVibeMarkdown,
  ].map((fn) => fn.toString()).join("\n\n");
}
