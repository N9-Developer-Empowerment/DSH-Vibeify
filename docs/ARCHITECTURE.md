# Architecture

DSH Vibeify has four deliberately separate faces.

| Face | Runs where | Responsibility |
| --- | --- | --- |
| Provider-neutral DSH client bundle | DSH Web UI | Supplies the complete Vibe experience while leaving DSH's native provider and lead agent untouched. |
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
- `client-src/experience/stream-recipe.js` owns the automatic refill, semantic chunk, media, questionnaire, worker-lane and safety contract. `recipes.js` retains legacy source recipes for tests/migration but is no longer shipped through the browser catalogue.
- `client-src/experience/catalog.js` maps those recipes onto the visual channels with explicit source and AI provenance.
- `client-src/experience/editorial.js` builds the date-keyed editor's edition. The same date is deterministic; different editions vary hero, selection notes and rail order while avoiding adjacent duplicate categories when possible. It is a local presentation function and makes no model call.
- `client-src/experience/feed.js` builds the 24-chunk synchronous editorial well, parses questionnaire cards, presents append-only arrivals newest-first, assigns every tile a stable local photograph, and owns the high/low-water refill policy.
- `client-src/experience/state.js` owns the Vibe/Chat state plus saved and last-read chunk ids. Every browser visit lands on Vibe even if Chat was previously open.
- `client-src/experience/content-store.js` owns the append-only 30-day cache for at most 160 allow-listed editor chunks and 32 visible questionnaire labels. It never accepts prompts, sessions, accounts, attachments or automatic Chat projections.
- `client-src/experience/editorial-settings.js` owns the browser-local default, built-in editorial directions, bounded custom brief, sanitisation and settings event. Colour remains separate and presentation-only.
- `chat-vibe-contract.js` tells the Codex lead when an explicit public-content browse request may use the closed Vibe transport and when technical, private, draft or authorization-bearing work must remain in Chat.
- `client-src/experience/stream-metrics.js` owns the content-free local duration ledger; it performs no network request.
- `client-src/experience/output.js` infers a presentation tone from already-rendered answer text and returns metadata only; it cannot rewrite content.
- `client-src/experience/vibe-result.js` collects closed `<vibe-chunk>` envelopes, renders safe Markdown, detects refill completion, removes legacy Chat decoration, and adds the Vibe return tab inside Chat. It also projects every completed rendered assistant answer as a non-persistent in-memory card while rejecting explicit user-role rows and never reading raw prompts. It does not create a separate result panel or replace earlier feed content.
- `client-src/experience/recipe-runner.js` opens a fresh DSH session, verifies that session selection changed, inserts an automatic refill contract, and submits it when the idle composer is ready. If it cannot prove a fresh idle session, it fails closed rather than touching the current conversation.
- `client-src/experience/shell.jsx` owns the full-screen presentation and exposes one integration function: `registerExperienceShell(ctx)`.
- `client-src/legacy-client.template.js` keeps the already-characterised approval, progress, capability, and palette controls isolated from the new shell.
- `scripts/build-client.mjs` composes those modules into the two CommonJS-style artifacts required by the provider-neutral and governed DSH packages.

## Experience boundary

```text
Vibe continuous edition
  ├─ newest completed Chat answer -> in-memory top card
  ├─ automatic refill wave -> add closed verified chunks at top
  ├─ explicit public-content request -> add closed verified chunks at top
  ├─ bundled well + saved stream -> older local depth
  ├─ questionnaire answer -> soft input to a later wave
  ├─ reading position -> low-water refill signal
  └─ Chat
      └─ existing DSH AppFrame, sessions, settings and approvals
          ├─ Chat: normal conversation and steering
          ├─ Trajectory: agent and tool activity
          ├─ Vibe: return to the continuous edition
          └─ optional VIBE colour palette
```

The Experience Shell registers in DSH's additive `shell.overlay` slot. Vibe covers the application completely without replacing its session or agent state. Chat mode makes the shell non-interactive and reveals the normal DSH surface. A characterised Vibe tab appears only inside that conventional surface and returns to the feed. There is no guide player, result panel, floating handoff brief, or DSH chrome within Vibe.

The feed starts from 24 deterministic local chunks plus up to 160 saved editor chunks and presents the append-only sequence in reverse arrival order. After the first frame, the browser attempts at least three sequential warm-up refill sessions and continues toward a 64-chunk high-water buffer; later refills occur when fewer than fourteen older chunks remain ahead, with a six-run per-visit ceiling. Each refill can use several bounded independent worker lanes behind the Codex lead. A user-explicit public-content browse request may use the same closed commentary transport directly from Chat. Only complete closed `<vibe-chunk>` envelopes enter persistent storage. Separately, every completed rendered assistant answer—including finished technical work—becomes an in-memory top card; its bounded title can also act as a soft topic signal for later refills. Prompts, reasoning, tool chatter, approvals, attachments, incomplete progress and raw worker output are ignored. Run namespacing keeps the editor store append-only, so deeper research becomes a new contextual page rather than a replacement. The runner uses a fresh session so a refill cannot steer unrelated work, and every purchase or other protected external write remains separately confirmed. See [Content streaming](CONTENT_STREAMING.md).

The visible photographic layer uses locally bundled real photographs. Every catalogue entry must declare `kind: "photograph"`, alt text, photographer, source page, licence URL and a hand-tuned focal point; `assets/experience/PHOTO_CREDITS.json` mirrors those credits for package review. Every valid tile resolves to its topic photograph or to a stable id-hashed fallback. Later images decode lazily, so the richer grid makes no model or network call. The interface links the photographer and labels AI as graphic treatment only. Generated graphics may support the composition, but cannot masquerade as a photograph, source, product, show or creator.

## Configuration boundaries

- `plugins/dsh-vibeify/cordis.patch.yml` registers the governed bundle's Codex host row and default provider.
- `plugins/dsh-vibeify-experience/cordis.patch.yml` is an empty activation patch; the package contributes only the provider-neutral browser client.
- `plugins/dsh-vibeify/package.json` declares both the DSH bundle patch and browser client entry.
- `~/.dsh/settings.yaml` owns the user-selected Codex capability level (or exact custom model/reasoning values) and DSH permissions.
- `model-routing-policy.json` owns dated worker capabilities, price assumptions, and the quality-first invariant.
- Codex's own authentication and connected-app configuration remain under Codex; Vibeify does not copy credentials.
- Experience navigation, saved/last-read chunk ids, bounded editor content, visible questionnaire labels, colour choice and editorial direction stay in browser local storage.
- VIBE colour selection affects the underlying Chat palette only. Editorial direction is passed to the Codex lead for future refills and never changes the model, permissions, routing, approvals or billing.

## Why a bundle

The earlier installation was a plain dependency plus a handwritten profile patch. A DSH bundle declares `dsh.bundle.patch`, so `dsh plugin --profile <name> add ...` can add the package and its configuration layer together. Profile-local and home-local patch layers remain later overrides, preserving normal DSH composition.

## Portability boundary

Connected apps surfaced by the Codex app-server are available to the lead. Desktop-only capabilities such as an interactive Chrome or Computer Use session may also require the appropriate Codex desktop host connection; permission configuration alone cannot manufacture that host session.

The browser client and its Vibes do not depend on Codex-specific model logic. Native DSH/DeepSeek can already reuse that UI through the provider-neutral package. Other governed lead-agent adapters still require separate authentication, capability checks, and equivalent acceptance tests.
