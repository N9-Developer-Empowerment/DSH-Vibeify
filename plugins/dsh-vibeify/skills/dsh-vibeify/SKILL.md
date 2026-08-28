---
name: dsh-vibeify
description: Install, configure, diagnose, update, or explain DSH Vibeify, including provider modes, Codex capability, approvals, images, progress, queue/steer, VIBE themes, and the shared magazine lifecycle. Use for DSH Vibeify setup, operation, failures, routing, permissions, or personalization. Do not restart a running DSH task, expose credentials, auto-approve external writes, or forward private inputs to another provider without explicit permission.
---

# DSH Vibeify

Treat the repository README and `docs/` as the operational source of truth. Check the installed DSH version, active process, selected profile, plugin package, Codex authentication, and composed configuration before changing anything.

Keep these invariants:

- First identify the installed mode. `dsh-vibeify-experience` is provider-neutral and keeps native DSH/DeepSeek in the lead. `dsh-vibeify` installs ChatGPT-authenticated Codex as the lead.
- In ChatGPT or combined mode, Codex plans, defines acceptance, delegates, verifies actual artifacts or evidence, integrates, and answers. When a DeepSeek credential is available, use DeepSeek for most eligible bounded execution work by default. Flash handles routine packets; Pro is justified only when its harder reasoning is likely to avoid rework.
- In combined mode, give every worker a self-contained task, unchanged authority boundary, explicit acceptance criteria, and required evidence. Worker prose is unverified; Codex must validate it directly and should not repeat work that already passes.
- In combined mode, keep leadership, final acceptance, connected-app writes, privacy decisions, unverifiable semantic judgment, and final output with Codex. In DeepSeek-only mode, retain DSH's native approval boundaries and do not imply Codex validation occurred.
- The DSH **Settings → Codex** capability level exists only in ChatGPT/combined mode. It changes the Codex model/reasoning preset, never the lead/worker relationship. Frontier is the quality-preserving default; lower levels are explicit user trade-offs.
- Never send current images or private project content to another provider unless the user explicitly requests that transfer.
- Full Access may suppress local command prompts, but protected connected-app actions still require a one-time user decision.
- A running status, cleared approval, or visible trajectory is not completion. Require a completed agent response or verified artifact.
- Keep Chat request-driven: one user request runs one turn and stops after its durable answer. Vibe may read completed local histories without reopening or resuming their threads. It must not use opening, scrolling, settings changes, or update completion to start model work.
- Keep Vibe as one browser-local magazine across all threads. A new completed Chat answer may be projected without another model call. Additional editorial generation requires an explicit pull-to-update or **Update** click, starts at most one bounded turn, exposes **Stop update**, and never chains another run.
- Do not restart DSH while a task is active. Inspect the session and ask before interrupting unfinished work.
- A Codex agent running inside DSH must never kill or restart its own host directly. After the user explicitly authorises activation and the current task is complete, run `scripts/activate-vibeify.sh --confirmed-idle`. It validates and installs an immutable package snapshot, canary-boots it away from the live port, and hands the restart to a detached supervisor. Return immediately after the handoff is queued. On the next interaction, read `node scripts/dsh-restart.mjs status`; do not claim success merely because the old process disconnected.
- Never print, copy, or commit API keys, OAuth tokens, account identifiers, private prompts, or app payloads.

For installation, follow `docs/INSTALL.md`; the friendly macOS loader is `scripts/Install DSH Vibeify.command`. For health checks, use `scripts/doctor.sh`. For VIBE changes, follow `docs/VIBES.md`. For architecture and security boundaries, read `docs/ARCHITECTURE.md` and `docs/SECURITY.md`.
