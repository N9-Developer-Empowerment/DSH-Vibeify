import test from "node:test";
import assert from "node:assert/strict";
import { splitInteractiveBlocks, interactiveDocument, interactiveMarkup, INTERACTIVE_SANDBOX, INTERACTIVE_CSP, vibeInteractiveRuntimeSource } from "./vibe-interactive.js";

const app = (overrides = {}) => ({ title: "Local game", html: "<button onclick=\"this.textContent='Played'\">Play</button>", ...overrides });
const block = (value = app()) => "```vibe-app\n" + JSON.stringify(value) + "\n```\n";

test("splits a self-contained widget while preserving surrounding article prose", () => {
  assert.deepEqual(splitInteractiveBlocks("Before\n" + block() + "After"), [
    { type: "markdown", value: "Before\n" }, { type: "interactive", ...app(), height: 480 }, { type: "markdown", value: "After" },
  ]);
});

test("malformed, ordinary, unterminated and nested example fences remain markdown", () => {
  for (const source of ["```vibe-app\n{bad}\n```", "```js\n" + JSON.stringify(app()) + "\n```", "```vibe-app\n" + JSON.stringify(app()), "````markdown\n" + block() + "````\n", "~~~text\n" + block() + "~~~\n", "    " + block().replaceAll("\n", "\n    ")]) {
    assert.deepEqual(splitInteractiveBlocks(source), [{ type: "markdown", value: source }]);
  }
});

test("closing fences must match their opener, with CRLF and longer fences supported", () => {
  assert.equal(splitInteractiveBlocks(block().replaceAll("\n", "\r\n"))[0].type, "interactive");
  const longer = "````vibe-app\n" + JSON.stringify(app()) + "\n`````";
  assert.equal(splitInteractiveBlocks(longer)[0].type, "interactive");
  const mismatched = "```vibe-app\n" + JSON.stringify(app()) + "\n~~~";
  assert.deepEqual(splitInteractiveBlocks(mismatched), [{ type: "markdown", value: mismatched }]);
});

test("rejects oversized or invalid payloads without silently losing article content", () => {
  for (const value of [null, [], { html: "hi" }, app({ title: " " }), app({ html: " " }), app({ title: "x".repeat(121) }), app({ html: "x".repeat(12001) })]) {
    const source = block(value);
    assert.deepEqual(splitInteractiveBlocks(source), [{ type: "markdown", value: source }]);
    assert.equal(interactiveMarkup(value), "");
  }
  assert.equal(splitInteractiveBlocks(block(app({ title: "x".repeat(120), html: "x".repeat(12000) })))[0].type, "interactive");
});

test("bounds height and executes at most three widgets per article", () => {
  for (const [height, expected] of [[1, 240], [950, 900], [500.6, 501], ["900", 480], [null, 480]]) {
    assert.equal(splitInteractiveBlocks(block(app({ height })))[0].height, expected);
  }
  const parts = splitInteractiveBlocks(block().repeat(4));
  assert.equal(parts.filter(part => part.type === "interactive").length, 3);
  assert.equal(parts.at(-1).value, block());
});

test("iframe markup cannot escape its attributes or grant origin, popups or navigation capabilities", () => {
  const html = '</iframe><script>parent.document.body.innerHTML="bad"</script>';
  const output = interactiveMarkup(app({ title: '"><img src=x onerror=alert(1)>', html }));
  assert.equal(INTERACTIVE_SANDBOX, "allow-scripts allow-forms");
  assert.match(output, /sandbox="allow-scripts allow-forms"/);
  assert.match(output, /referrerpolicy="no-referrer"/);
  assert.equal((output.match(/<iframe/g) || []).length, 1);
  assert.equal((output.match(/<\/iframe>/g) || []).length, 1);
  assert.doesNotMatch(output, /<script>|<img/);
  assert.match(output, /&lt;\/iframe&gt;/);
});

test("trusted CSP precedes untrusted HTML and denies network, nested frames and form submission", () => {
  const html = '<meta http-equiv="Content-Security-Policy" content="default-src *"><script>fetch("https://example.com")</script>';
  const doc = interactiveDocument(html);
  assert.ok(doc.indexOf("default-src &#39;none&#39;") < doc.indexOf(html));
  for (const policy of ["connect-src 'none'", "frame-src 'none'", "form-action 'none'", "base-uri 'none'", "object-src 'none'", "img-src data: blob:"]) assert.ok(INTERACTIVE_CSP.includes(policy));
  assert.throws(() => interactiveDocument("x".repeat(12001)), TypeError);
});

test("shared documents nonce their app scripts under the inherited site CSP", () => {
  const doc = interactiveDocument('<script>document.body.textContent="ok"</script><SCRIPT type="module">void 0</SCRIPT>', "safeNonce123");
  assert.match(doc, /script-src &#39;unsafe-inline&#39;/);
  assert.equal((doc.match(/<script nonce="safeNonce123"/g) || []).length, 2);
  assert.doesNotMatch(doc, /script-src &#39;nonce-/);
  assert.doesNotMatch(interactiveDocument("<script>void 0</script>", '\"><img src=x>'), /nonce=/);
  const parse = new Function(vibeInteractiveRuntimeSource() + ";return splitInteractiveBlocks;")();
  assert.deepEqual(parse(block()), splitInteractiveBlocks(block()));
});

test("child CSP denies remote scripts even if app code attaches the inherited nonce", () => {
  const doc = interactiveDocument('<script src="https://example.com/remote.js"></script>', "safeNonce123");
  assert.match(doc, /script-src &#39;unsafe-inline&#39;/);
  assert.doesNotMatch(doc, /script-src[^;]*(?:nonce-|https:|\*)/);
  assert.match(doc, /form-action &#39;none&#39;/);
  assert.match(interactiveMarkup(app()), /sandbox="allow-scripts allow-forms"/);
});
