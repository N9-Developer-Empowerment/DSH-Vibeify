export const name = "dsh-vibeify-deepseek";
export const inject = ["systemPrompt"];

export const ROUTING_POLICY = `DeepSeek leads this task: understand and plan the work, integrate results, independently verify evidence, and deliver the final answer. You may use subagent_codex for at most two bounded, self-contained text-only packets per task when useful. Give each packet clear acceptance criteria and evidence requirements. Workers must not spawn or delegate to further workers. Do not delegate protected external writes. Do not transfer private inputs or current images without the user's explicit permission. Worker claims alone are not acceptance; inspect artifacts and verify the result yourself.`;

// Third-party slot between the runtime's TEAM_POLICY (600) and PTC_ONLY (800).
export function apply(ctx) {
  ctx.effect(() => ctx.systemPrompt.section({
    name: "vibeify:deepseek-routing",
    order: 700,
    text: ROUTING_POLICY,
    interpolate: false,
  }), "DeepSeek-led routing policy");
}
