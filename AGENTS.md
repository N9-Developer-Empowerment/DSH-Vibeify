# DSH Vibeify repository instructions

These instructions apply to every agent working in this repository.

## Preserve the agent boundary

- ChatGPT-authenticated Codex remains the lead agent. It owns planning, verification, acceptance, authorization-bearing decisions, integration, and the final answer.
- DeepSeek and other providers are optional bounded workers. Never promote them to lead or claim equal quality without task-specific verification.
- Never forward private content or current images to another provider without explicit user authorization.

## Protect users

- Never commit, print, or copy credentials, OAuth tokens, account metadata, session transcripts, private prompts, app payloads, or attachments.
- Do not turn Full Access into automatic permission for external writes. Sending, publishing, deleting, purchasing, or messaging must retain the connected app's protected confirmation.
- Do not restart DSH while a task is active. Confirm completion or ask the user before interruption.
- Do not install or upgrade DSH, Codex, models, or plugins without explicit authorization.

## Compatibility and quality

- DSH is a developer preview. Keep DSH, Codex, protocol, and peer versions explicit and rerun compatibility checks after upgrades.
- Add characterization tests before changing authentication, approval, request/response, image, model-routing, or profile-migration behavior.
- Run `npm test`, `npm run check`, the Codex plugin validator, the skill validator, `npm pack --dry-run`, and a DSH composed-config smoke test before release.
- Do not claim connected-app, browser, or desktop-host parity from configuration alone. Verify the relevant read path and require user approval before a real external write.
- Keep VIBEs presentation-only. Theme changes must never affect model, permission, routing, prompt, or billing state.
