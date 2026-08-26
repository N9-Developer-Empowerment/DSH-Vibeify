---
name: dsh-vibeify
description: Install, configure, diagnose, update, or explain DSH Vibeify, including its ChatGPT-authenticated Codex lead, optional DeepSeek workers, connected-app approvals, image support, progress UI, queue/steer controls, and VIBE themes. Use for DSH Vibeify setup, operation, failures, routing, permissions, or personalization. Do not restart a running DSH task, expose credentials, auto-approve external writes, or forward private inputs to another provider without explicit permission.
---

# DSH Vibeify

Treat the repository README and `docs/` as the operational source of truth. Check the installed DSH version, active process, selected profile, plugin package, Codex authentication, and composed configuration before changing anything.

Keep these invariants:

- ChatGPT-authenticated Codex is the lead. It plans, delegates, verifies, integrates, and answers.
- DeepSeek models are optional bounded workers. Use them only where the result can be independently verified without reducing quality.
- Never send current images or private project content to another provider unless the user explicitly requests that transfer.
- Full Access may suppress local command prompts, but protected connected-app actions still require a one-time user decision.
- A running status, cleared approval, or visible trajectory is not completion. Require a completed agent response or verified artifact.
- Do not restart DSH while a task is active. Inspect the session and ask before interrupting unfinished work.
- Never print, copy, or commit API keys, OAuth tokens, account identifiers, private prompts, or app payloads.

For installation, follow `docs/INSTALL.md`. For health checks, use `scripts/doctor.sh`. For VIBE changes, follow `docs/VIBES.md`. For architecture and security boundaries, read `docs/ARCHITECTURE.md` and `docs/SECURITY.md`.
