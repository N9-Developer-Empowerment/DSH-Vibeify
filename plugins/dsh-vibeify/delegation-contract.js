function requiredText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`DSH delegation ${label} must be a non-empty string`);
  }
  return value.trim();
}

export function buildDelegationPacket({ task, acceptance, evidence }) {
  return [
    "WORKER ROLE: Execute this bounded packet as a DeepSeek worker behind the Codex lead.",
    "Do not redefine the plan, broaden scope, make authorization-bearing decisions, or claim final acceptance.",
    "Codex alone accepts, integrates, and reports the finished result to the user.",
    "",
    "TASK",
    requiredText(task, "task"),
    "",
    "ACCEPTANCE CONTRACT",
    requiredText(acceptance, "acceptance contract"),
    "",
    "REQUIRED EVIDENCE",
    requiredText(evidence, "evidence request"),
    "",
    "Return concise execution evidence, exact changed artifacts when applicable, validation results, and unresolved risks. Stop and report a structured blocker if the packet cannot be completed without changing its plan or authority boundary.",
  ].join("\n");
}

export function delegationResultForCodex({ output, route, costSummary }) {
  return [
    `DSH delegation to ${requiredText(route, "route")} returned ${requiredText(output, "output").length} characters.`,
    requiredText(costSummary, "cost summary"),
    "UNVERIFIED WORKER EVIDENCE: inspect the actual artifacts and rerun or otherwise validate the acceptance contract before integration.",
    "Do not repeat work that already passes direct verification; repair only failed or unverifiable parts.",
    "Codex is the only acceptance authority and must produce the final answer.",
    "<<<DSH_SUBAGENT_RESULT>>>",
    output,
    "<<<END_DSH_SUBAGENT_RESULT>>>",
  ].join("\n");
}
