import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDelegationPacket,
  delegationResultForCodex,
} from "./delegation-contract.js";

test("DeepSeek receives an execution packet, never leadership or final acceptance", () => {
  const packet = buildDelegationPacket({
    task: "Implement the already-planned parser change.",
    acceptance: "Focused parser tests pass and the public schema is unchanged.",
    evidence: "Return changed paths, commands run, results, and any unresolved risk.",
  });
  assert.match(packet, /WORKER ROLE: Execute this bounded packet/);
  assert.match(packet, /Do not redefine the plan/);
  assert.match(packet, /Codex alone accepts, integrates, and reports/);
  assert.match(packet, /Focused parser tests pass/);
});

test("worker output is explicitly untrusted until Codex verifies artifacts", () => {
  const result = delegationResultForCodex({
    output: "Changed parser.js; 12 focused tests passed.",
    route: "deepseek-official/deepseek-v4-flash",
    costSummary: "Estimated DeepSeek API cost: USD $0.001.",
  });
  assert.match(result, /UNVERIFIED WORKER EVIDENCE/);
  assert.match(result, /inspect the actual artifacts and rerun or otherwise validate/);
  assert.match(result, /Do not repeat work that already passes/);
  assert.match(result, /Codex is the only acceptance authority/);
});
