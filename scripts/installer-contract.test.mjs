import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("macOS and Linux installers provide a non-installing download check", async () => {
  for (const relativePath of [
    "scripts/Install DSH Vibeify.command",
    "scripts/install-dsh-vibeify-linux.sh",
  ]) {
    const source = await read(relativePath);
    assert.match(source, /--check/);
    assert.match(source, /installer-self-check\.mjs/);
    assert.match(source, /Nothing was installed, no profile changed, and no model was called/);
    assert.match(source, /major===22&&minor>=19/);
    assert.match(source, /chat\.deepseek\.com/);
    assert.match(source, /chatgpt\.com/);
    assert.match(source, /gemini\.google\.com/);
  }
});

test("Windows preview packages an immutable plugin and never stops live DSH", async () => {
  const source = await read("scripts/Install DSH Vibeify.ps1");
  assert.match(source, /\[switch\]\$Check/);
  assert.match(source, /Get-FileHash -Algorithm SHA256/);
  assert.match(source, /validate-package-archive\.mjs/);
  assert.match(source, /DSH is already open, so this installer will not interrupt it/);
  assert.doesNotMatch(source, /Stop-Process|taskkill|TerminateProcess/);
});

test("support report is deliberately metadata-only", async () => {
  const source = await read("scripts/support-report.mjs");
  assert.match(source, /privacy-safe support report/);
  assert.match(source, /excludes credentials, account details, file paths, prompts, sessions, and profile contents/);
  assert.doesNotMatch(source, /from "node:fs"|from "node:fs\/promises"|readFile\(|localStorage/);
});

test("FAQ names evidence levels and offers privacy-safe free-chat help", async () => {
  const faq = await read("docs/FAQ.md");
  assert.match(faq, /Tested on a real Apple-silicon Mac/);
  assert.match(faq, /Windows[\s\S]*Preview/);
  assert.match(faq, /Linux[\s\S]*Preview/);
  assert.match(faq, /DeepSeek Chat/);
  assert.match(faq, /ChatGPT/);
  assert.match(faq, /Google Gemini/);
  assert.match(faq, /do not ask me to paste API keys/);
});

test("detached starter strips OpenAI API-key fallbacks", async () => {
  const source = await read("scripts/start-dsh.mjs");
  assert.match(source, /delete environment\.OPENAI_API_KEY/);
  assert.match(source, /delete environment\.OPENAI_API_KEY_PATH/);
  assert.match(source, /detached: true/);
  assert.match(source, /127\.0\.0\.1|--host/);
  assert.match(source, /DSH profile name is invalid/);
  assert.match(source, /DSH port is invalid/);
});
