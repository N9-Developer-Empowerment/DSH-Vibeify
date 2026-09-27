/** Self-contained article widgets. The consumer must retain the iframe sandbox. */
export const INTERACTIVE_SANDBOX = "allow-scripts allow-forms";
export const INTERACTIVE_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'";

function normalizedInteractive(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.html !== "string" || !value.html.trim() || value.html.length > 12000) return null;
  if (typeof value.title !== "string" || !value.title.trim() || value.title.length > 120) return null;
  const height = typeof value.height === "number" && Number.isFinite(value.height)
    ? Math.min(900, Math.max(240, Math.round(value.height))) : 480;
  return { type: "interactive", title: value.title.trim(), html: value.html, height };
}

/** Only top-level, complete vibe-app fences execute; examples and malformed blocks stay text. */
export function splitInteractiveBlocks(markdown) {
  if (typeof markdown !== "string" || !markdown) return [];
  const parts = [];
  const lines = markdown.match(/[^\n]*\n|[^\n]+$/g) || [];
  let offset = 0;
  let textStart = 0;
  let fence = null;
  let count = 0;
  for (const line of lines) {
    const content = line.replace(/\r?\n$/, "");
    if (fence) {
      const closing = content.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (closing && closing[1][0] === fence.mark && closing[1].length >= fence.length) {
        if (fence.interactive && count < 3) {
          let part = null;
          try { part = normalizedInteractive(JSON.parse(markdown.slice(fence.bodyStart, offset))); } catch { /* Preserve invalid JSON as ordinary markdown. */ }
          if (part) {
            if (fence.start > textStart) parts.push({ type: "markdown", value: markdown.slice(textStart, fence.start) });
            parts.push(part);
            count += 1;
            textStart = offset + line.length;
          }
        }
        fence = null;
      }
    } else {
      const opening = content.match(/^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/);
      // Backticks in the info string do not form a Markdown fence.
      if (opening && !(opening[1][0] === "`" && opening[2].includes("`"))) {
        fence = { mark: opening[1][0], length: opening[1].length, start: offset,
          bodyStart: offset + line.length, interactive: opening[2].trim() === "vibe-app" };
      }
    }
    offset += line.length;
  }
  if (textStart < markdown.length) parts.push({ type: "markdown", value: markdown.slice(textStart) });
  return parts;
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;");
}

/** The first CSP is trusted; later app metadata cannot relax it. */
export function interactiveDocument(html, nonce = "") {
  if (typeof html !== "string" || html.length > 12000) throw new TypeError("Invalid interactive document");
  const trustedNonce = typeof nonce === "string" && /^[A-Za-z0-9+/_=-]+$/.test(nonce) ? nonce : "";
  // Intersect the parent nonce policy with this inline-only policy. Adding nonce
  // sources here would also authorize external scripts carrying that nonce.
  const policy = INTERACTIVE_CSP;
  const content = trustedNonce ? html.replace(/<script(?=[\s/>])/gi, `<script nonce="${trustedNonce}"`) : html;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escapeAttribute(policy)}"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html{color-scheme:light}body{margin:0;font-family:system-ui,sans-serif}*,*::before,*::after{box-sizing:border-box}</style></head><body>${content}</body></html>`;
}

export function interactiveMarkup(part, nonce = "") {
  const app = normalizedInteractive(part);
  if (!app) return "";
  return `<iframe class="vibe-interactive" title="${escapeAttribute(app.title)}" sandbox="${INTERACTIVE_SANDBOX}" referrerpolicy="no-referrer" height="${app.height}" style="width:100%;border:0;display:block" srcdoc="${escapeAttribute(interactiveDocument(app.html, nonce))}"></iframe>`;
}

/** Same implementation in the standalone sharing preview, without a separate parser. */
export function vibeInteractiveRuntimeSource() {
  return `const INTERACTIVE_SANDBOX = ${JSON.stringify(INTERACTIVE_SANDBOX)};\nconst INTERACTIVE_CSP = ${JSON.stringify(INTERACTIVE_CSP)};\n` + [normalizedInteractive, splitInteractiveBlocks, escapeAttribute, interactiveDocument, interactiveMarkup].map(fn => fn.toString()).join("\n\n");
}
