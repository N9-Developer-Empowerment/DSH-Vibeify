# Architecture

DSH Vibeify has four deliberately separate faces.

| Face | Runs where | Responsibility |
| --- | --- | --- |
| Provider-neutral DSH bundle | DSH Node process and Web UI | Supplies the complete Vibe experience while leaving DSH's native provider and lead agent untouched; its host half provides only the local update-status endpoint. |
| DSH host bundle | DSH Node process | Registers the ChatGPT-authenticated Codex adapter, capability settings, access policy, model routing, image handling, connected-app support, and bounded DSH delegation tool. |
| DSH browser client | DSH Web UI | Presents the lean-back Experience Shell, preserves conventional DSH Chat underneath, keeps approvals live, expands progress, adds Queue/Steer and Codex capability controls, and applies the selected Chat VIBE. |
| Codex plugin skill | Codex | Teaches a Codex agent how to install, diagnose, update, and operate the DSH bundle safely. It does not itself run the DSH bridge. |

## Provider modes

`plugins/dsh-vibeify-experience` declares an empty DSH host patch only so the official plugin installer activates its browser client. It contains no host `main`, no Codex dependency, and no provider override. DSH therefore keeps its native `deepseek-official` provider.

`plugins/dsh-vibeify` composes the same generated visual client with Codex-only capability, approval, progress, Queue, and Steer controls enabled, plus the host bridge. A build-time feature constant keeps those Codex controls out of the provider-neutral runtime while both modes reuse one tested source implementation.

## Combined-mode lead and worker flow

```text
User
  └─ DSH Web UI
      └─ Vibeify Codex adapter (ChatGPT authentication)
          ├─ plan + acceptance contract (Codex)
          ├─ one or more bounded execution packets
          │   └─ DeepSeek route selected from the live DSH catalogue
          ├─ artifact/evidence validation (Codex)
          └─ integration + final answer (Codex)
```

Codex owns the parent turn throughout. For non-trivial work it first defines the plan, authority boundary, acceptance criteria, and required evidence. Eligible packets then go to DeepSeek by default. The worker result returns as unverified evidence; Codex inspects the real artifacts or sources and reruns or otherwise validates the acceptance contract. It reuses passing work, repairs gaps, and remains the only acceptance and final-answer authority.

The modular boundary is deliberate:

- `codex-capability.js` owns named model/reasoning presets and backward-compatible resolution.
- `codex-settings.js` owns DSH's settings namespace and live configuration source.
- `delegation-contract.js` owns the worker packet and unverified-result envelope.
- `routing-policy.js` owns model catalogue, cost, route eligibility, and governance instructions.
- `index.js` owns protocol integration, process isolation, and execution.
- `progressive-output.js` maps Codex progress and final-answer deltas onto DSH reasoning and text blocks without buffering the completed result or duplicating it.
- `update-check.js` owns fixed-source DSH, Vibeify, and Codex version checks, semantic comparison, compatibility gating, six-hour caching, and the loopback-only status endpoint. It cannot install or restart anything.
- `client-src/experience/stream-recipe.js` owns the single user-requested magazine-update, semantic chunk, media, questionnaire, worker-lane and safety contract. It explicitly ends after one batch. `recipes.js` retains legacy source recipes for tests/migration but is no longer shipped through the browser catalogue.
- `client-src/experience/live-stream-collector.js` owns the active update's loopback mux subscription and complete-envelope boundary. It publishes only ids belonging to the active run; final history is the lossless fallback.
- `client-src/experience/update-session.js` owns the browser-local identity of the one reusable update session so neither it nor its subagents can be mistaken for ordinary Chat content.
- `client-src/experience/catalog.js` maps those recipes onto the visual channels with explicit source and AI provenance.
- `client-src/experience/editorial.js` builds the date-keyed editor's edition. The same date is deterministic; different editions vary hero, selection notes and rail order while avoiding adjacent duplicate categories when possible. It is a local presentation function and makes no model call.
- `client-src/experience/feed.js` builds the 24-chunk synchronous editorial well, spends a locally prepared visual short and questionnaire at explicit update time, parses questionnaire cards, presents append-only arrivals newest-first, and assigns every tile a stable local photograph. It contains no model scheduler.
- `client-src/experience/state.js` owns the Vibe/Chat state plus saved and last-read chunk ids. Every browser visit lands on Vibe even if Chat was previously open.
- `client-src/experience/content-store.js` owns the append-only 30-day cache for at most 160 allow-listed presentation chunks and 32 visible questionnaire labels. Chat cards contain only a hashed local id, source class, title, bounded Markdown and publication time; prompts and DSH session/message ids never enter storage.
- `client-src/experience/editorial-settings.js` owns the browser-local default, built-in editorial directions, bounded custom brief, sanitisation and settings event. Colour remains separate and presentation-only.
- `chat-vibe-contract.js` tells the Codex lead when an explicit public-content browse request may use the closed Vibe transport and when technical, private, draft or authorization-bearing work must remain in Chat.
- `client-src/experience/stream-metrics.js` owns the content-free local duration ledger; it performs no network request.
- `client-src/experience/output.js` infers a presentation tone from already-rendered answer text and returns metadata only; it cannot rewrite content.
- `client-src/experience/vibe-result.js` parses complete closed `<vibe-chunk>` envelopes, renders safe Markdown, removes legacy Chat decoration, and adds the Vibe return tab inside Chat. It never uses visible DOM mutations to infer that a Chat turn completed.
- `client-src/experience/thread-magazine.js` pages through local DSH session history without resuming or publishing an Agent. It scans only idle non-blank reader sessions, excludes subagents, accepts only durable `turn/end: completed` output, ignores user messages and interrupted/aborted work, sanitises final assistant answers, and projects every real Chat thread into one browser-local magazine. The dedicated update session accepts only closed Vibe envelopes and has no raw-card fallback.
- `client-src/experience/refresh-control.js` is a pure pull-to-refresh state machine. A pull begins only at the top and requests at most one update after crossing the threshold and being released.
- `client-src/experience/recipe-runner.js` reuses one dedicated magazine-update session, submits exactly one queued update after an explicit gesture, never opens that session, refuses overlapping work, exposes exact-session Stop, and enforces a 20-minute timeout.
- `client-src/experience/shell.jsx` owns the full-screen presentation and exposes one integration function: `registerExperienceShell(ctx)`.
- `client-src/legacy-client.template.js` keeps the already-characterised approval, progress, capability, and palette controls isolated from the new shell.
- `scripts/build-client.mjs` composes those modules into the two CommonJS-style artifacts required by the provider-neutral and governed DSH packages.

## Experience boundary

```text
Vibe continuous edition
  ├─ completed answers from all local threads -> browser-local top cards
  ├─ pull-to-update or Update -> exactly one bounded magazine turn
  ├─ Stop -> cancel only that dedicated update turn
  ├─ explicit public-content request -> add closed verified chunks at top
  ├─ bundled well + saved stream -> older local depth
  ├─ questionnaire answer -> soft input to the next requested update
  ├─ opening, scrolling and settings changes -> no model work
  └─ Chat
      └─ existing DSH AppFrame, sessions, settings and approvals
          ├─ Chat: normal conversation and steering
          ├─ Trajectory: agent and tool activity
          ├─ Vibe: return to the continuous edition
          └─ optional VIBE colour palette
```

The Experience Shell registers in DSH's additive `shell.overlay` slot. Vibe covers the application completely without replacing its session or agent state. Chat mode makes the shell non-interactive and reveals the normal DSH surface. A characterised Vibe tab appears only inside that conventional surface and returns to the feed. There is no guide player, result panel, floating handoff brief, or DSH chrome within Vibe.

The feed starts from 24 deterministic local chunks plus up to 160 saved presentation chunks and shows the append-only sequence in reverse arrival order. The session-list bridge discovers idle reader threads and reads their complete persisted histories through `session.history`; this is a cold-log read and does not resume or publish an Agent. Subagent sessions are excluded. Only the final assistant output of durably completed reader turns becomes a Chat card. Prompts, raw worker reports, reasoning, tool chatter, approvals, attachments, interrupted/aborted work and session identifiers are ignored. A new Chat completion enters Vibe without a model call.

Additional editorial generation begins only from pull-to-update or the accessible **Update** button. One gesture first appends a local visual short and questionnaire synchronously, then submits one bounded six-page generated batch to one reusable, dedicated update session. A private loopback mux listener releases each closed active-run envelope while the parent is still working; completion history supplies a lossless fallback. Completion never chains another batch; opening Vibe, scrolling, reaching the tail, and changing settings never generate work. The visible **Stop update** control cancels only that session, while a timeout prevents an abandoned turn from running indefinitely. Independent quick, culture/media and deep lanes work behind the lead, and no slow lane blocks an already verified page. Run namespacing keeps storage append-only, and every protected external write remains separately confirmed in Chat. See [Content streaming](CONTENT_STREAMING.md).

The visible photographic layer uses locally bundled real photographs. Every catalogue entry must declare `kind: "photograph"`, alt text, photographer, source page, licence URL and a hand-tuned focal point; `assets/experience/PHOTO_CREDITS.json` mirrors those credits for package review. Every valid tile resolves to its topic photograph or to a stable id-hashed fallback. Later images decode lazily, so the richer grid makes no model or network call. The interface links the photographer and labels AI as graphic treatment only. Generated graphics may support the composition, but cannot masquerade as a photograph, source, product, show or creator.

## Configuration boundaries

- `plugins/dsh-vibeify/cordis.patch.yml` registers the governed bundle's Codex host row and default provider.
- `plugins/dsh-vibeify-experience/cordis.patch.yml` mounts only the loopback update-status host service; the package's browser client still owns the provider-neutral Vibe surface and does not change the native DSH provider.
- `plugins/dsh-vibeify/package.json` declares both the DSH bundle patch and browser client entry.
- `~/.dsh/settings.yaml` owns the user-selected Codex capability level (or exact custom model/reasoning values) and DSH permissions.
- `model-routing-policy.json` owns dated worker capabilities, price assumptions, and the quality-first invariant.
- Codex's own authentication and connected-app configuration remain under Codex; Vibeify does not copy credentials.
- Experience navigation, saved/last-read chunk ids, bounded presentation content, visible questionnaire labels, colour choice and editorial direction stay in browser local storage.
- VIBE colour selection affects the underlying Chat palette only. Editorial direction is passed to the lead on the next explicit magazine update and never changes the model, permissions, routing, approvals or billing.

## Why a bundle

The earlier installation was a plain dependency plus a handwritten profile patch. A DSH bundle declares `dsh.bundle.patch`, so `dsh plugin --profile <name> add ...` can add the package and its configuration layer together. Profile-local and home-local patch layers remain later overrides, preserving normal DSH composition.

## Portability boundary

Connected apps surfaced by the Codex app-server are available to the lead. Desktop-only capabilities such as an interactive Chrome or Computer Use session may also require the appropriate Codex desktop host connection; permission configuration alone cannot manufacture that host session.

The browser client and its Vibes do not depend on Codex-specific model logic. Native DSH/DeepSeek can already reuse that UI through the provider-neutral package. Other governed lead-agent adapters still require separate authentication, capability checks, and equivalent acceptance tests.
