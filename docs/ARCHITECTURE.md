# Architecture

For the reader-facing lifecycle before the module-level detail, see [How DSH Vibeify works](HOW_IT_WORKS.md).

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
- `client-src/experience/live-stream-collector.js` owns the loopback mux and complete-envelope boundary for both the active update and ordinary public-content Chat turns. It publishes only active-run ids on the update route and `chat-` ids from eligible reader sessions; final history is the lossless fallback.
- `client-src/experience/update-session.js` owns the browser-local identity of the one reusable update session so neither it nor its subagents can be mistaken for ordinary Chat content.
- `client-src/experience/catalog.js` maps those recipes onto the visual channels with explicit source and AI provenance.
- `client-src/experience/editorial.js` builds the date-keyed editor's edition. The same date is deterministic; different editions vary hero, selection notes and rail order while avoiding adjacent duplicate categories when possible. It is a local presentation function and makes no model call.
- `client-src/experience/feed.js` builds the 24-chunk synchronous editorial well, spends a locally prepared visual short and questionnaire at explicit update time, parses questionnaire cards, presents append-only arrivals newest-first, assigns every tile stable visual media plus an explicit editorial span, and admits only allow-listed lead-image URLs into the rolling visual catalogue. It contains no model scheduler.
- `client-src/experience/welcome-edition.js` owns the evergreen reader orientation issue and the launch composition order. It puts the installed version's welcome pages above older local cards, retains the bundled well below them, and lets any new current-visit page rise naturally to the top. It contains no model call or storage write.
- `client-src/experience/state.js` owns the Vibe/Chat state plus saved and last-read chunk ids. Every browser visit lands on Vibe even if Chat was previously open.
- `client-src/experience/share-client.js` owns the reader-clicked public-preview handshake. It maps a displayed card through the shared allow-list contract, opens only the pinned share origin, and posts the snapshot only after the exact window and versioned origin respond. It never calls the publishing API.
- `client-src/experience/content-retention.js` owns the single 160-card presentation bound and its 96-card protected reserve for completed, non-questionnaire Chat Vibes. `content-store.js` and `welcome-edition.js` both use it so durable storage and in-memory presentation cannot disagree about which reader work survives a large editorial refill.
- `client-src/experience/content-store.js` owns the append-only 30-day cache for the allow-listed reader-specific presentation chunks and 32 visible questionnaire labels. Deterministic welcome and bundled-example pages are rebuilt from the active plugin and rejected from durable storage, including during migration from older cache versions. Chat cards contain only a hashed local id, source class, title, bounded Markdown and publication time; prompts and DSH session/message ids never enter storage. `vibe-library.js` supplies bounded, all-term title/body search over that already-cleaned local cache and performs no provider or network call.
- `client-src/experience/editorial-settings.js` owns the browser-local default, built-in editorial directions, the bounded free-text editor note that can refine any preset, sanitisation and settings event. Colour remains separate and presentation-only.
- `chat-vibe-contract.js` tells the Codex lead that **make/create/write a Vibe** or **turn this into a Vibe** explicitly selects the closed visual-card transport, when an implicit public-content browse request may also use it, and when technical, private, draft or authorization-bearing work must remain in Chat.
- `client-src/experience/stream-metrics.js` owns the content-free local duration ledger; it performs no network request.
- `client-src/experience/output.js` infers a presentation tone from already-rendered answer text and returns metadata only; it cannot rewrite content.
- `client-src/experience/vibe-result.js` parses complete closed `<vibe-chunk>` envelopes, renders safe Markdown, removes legacy Chat decoration, and adds the Vibe return tab inside Chat. It never uses visible DOM mutations to infer that a Chat turn completed.
- `client-src/experience/thread-magazine.js` passively routes complete `chat-` envelopes from eligible reader sessions while their turns run, then pages through local DSH session history without resuming or publishing an Agent. Its durable fallback scans only idle non-blank reader sessions, excludes subagents, accepts only `turn/end: completed` output, ignores user messages and interrupted/aborted work, sanitises final assistant answers, and projects every real Chat thread into one browser-local magazine. The dedicated update session accepts only closed Vibe envelopes and has no raw-card fallback.
- `client-src/experience/refresh-control.js` is a pure pull-to-refresh state machine. A pull begins only at the top and requests at most one update after crossing the threshold and being released.
- `client-src/experience/recipe-runner.js` reuses one dedicated magazine-update session, submits exactly one queued update after an explicit gesture, never opens that session, refuses overlapping work, exposes exact-session Stop, and enforces a 20-minute timeout.
- `client-src/experience/shell.jsx` owns the full-screen presentation and exposes one integration function: `registerExperienceShell(ctx)`.
- `client-src/legacy-client.template.js` keeps the already-characterised approval, progress, capability, and palette controls isolated from the new shell.
- `scripts/build-client.mjs` composes those modules into the two CommonJS-style artifacts required by the provider-neutral and governed DSH packages.

## Experience boundary

```text
Vibe continuous edition
  ├─ relaunch -> current welcome issue above older saved pages, no model work
  ├─ each closed verified public-content card -> immediate browser-local top card
  ├─ completed answers from all local threads -> durable-history top cards and fallback
  ├─ pull-to-update or Update -> exactly one bounded magazine turn
  ├─ Stop -> cancel only that dedicated update turn
  ├─ explicit public-content request -> add closed verified chunks at top
  ├─ bundled well + saved stream -> older local depth below the welcome issue
  ├─ questionnaire answer -> soft input to the next requested update
  ├─ opening, scrolling and settings changes -> no model work
  └─ Chat
      └─ existing DSH AppFrame, sessions, settings and approvals
          ├─ Chat: normal conversation and steering
          ├─ Trajectory: agent and tool activity
          ├─ Vibe: return to the continuous edition
          └─ optional VIBE colour palette
```

The Experience Shell registers in DSH's additive `shell.overlay` slot. Vibe covers the application completely without replacing its session or agent state. Chat mode makes the shell non-interactive and reveals the normal DSH surface. A characterised **VIBE** navigation tab aligns with Chat and Trajectory, uses a restrained active underline, and returns to the feed. There is no guide player, result panel, floating handoff brief, or DSH chrome within Vibe.

## Optional public article sharing

Public sharing is a separate service boundary, not another DSH plugin permission. `shared/vibe-share-contract.js` defines the only serializable fields and rejects questionnaires, unsafe schemes, credentials in URLs, tracking parameters, oversized text, and unrecognised page kinds. DSH opens the first-party `/new` preview and transfers one cleaned snapshot through `window.postMessage` only after matching both the expected opener window and `https://share.codingforjustice.org.uk`.

The Cloudflare-compatible service in `services/vibe-share/` owns the second confirmation, bounded abuse protection, D1 storage, public rendering, social metadata, retention, and capability-based removal token. It also owns the public-image freshness boundary. D1 permanently records a canonical image key with crop and resize queries removed; publication reserves unused candidates in the order photograph, editorial image, generated image, AI graphic, then typography. Removing or expiring an article never releases that key. The private preview checks those keys before enabling publication and always prepares a 1200×630 article-specific JPEG from the already-reviewed title and excerpt. When no unused supplied visual remains—or a concurrent publisher wins the same image—the service stores that JPEG in its bound object store and exposes it through the article's immutable `/i/{slug}.jpg` route for the page and Open Graph/X card. Generated work remains labelled and never masquerades as photography.

The service stores no account and DSH holds no publishing secret. The default managed protection stores only a salted one-day request fingerprint and counters; Turnstile remains an optional replacement. Production publishing fails closed when storage, the uniqueness register, cover storage when needed, or protection is absent. The public renderer escapes raw HTML, permits only HTTPS article links, keeps image credits attached, and applies a restrictive content-security policy. Supported YouTube, Vimeo, Spotify and SoundCloud media crosses as an original allow-listed URL rather than iframe source or HTML; preview and public renderers independently derive a sandboxed, no-autoplay player after a click, while CSP admits only those four player hosts. The `share` subdomain uses the managed host's external-DNS CNAME, so the existing apex site, nameservers, and mail records do not move. This service can be deployed or removed independently from DSH; the local magazine remains functional when it is unavailable.

The feed starts from 24 deterministic local chunks plus up to 160 saved presentation chunks and shows the append-only sequence in reverse arrival order. One passive loopback mux subscription routes complete `chat-` envelopes from ordinary reader sessions immediately while the source turn continues. A session-list bridge also discovers idle reader threads and reads their complete persisted histories through `session.history`; this is a cold-log read, supplies the live route's lossless fallback, and does not resume or publish an Agent. Subagent, foreground-update and hidden-background-editor sessions are excluded by durable identity, with the exact background title as a recovery boundary after cache loss. Only a closed verified Chat envelope or the final assistant output of a durably completed reader turn becomes a card. Prompts, unfinished envelopes, raw worker reports, reasoning, tool chatter, approvals, attachments, interrupted/aborted work and session identifiers are ignored. Duplicate leading titles are removed and pipe tables remain structured. No Chat projection makes an additional model call.

The visible edition changes only from a closed verified public-content Chat card, a completed ordinary Chat answer, or pull-to-update/the accessible **Update** button. One gesture first releases ready pages from the local reserve and appends a local visual short and questionnaire synchronously. It submits one bounded generated batch to the reusable foreground update session only when fewer than four ready pages were available. The private loopback mux releases each closed semantic card while its parent is still working; completion history supplies a lossless fallback. Completion never chains another foreground batch. The visible **Stop update** control cancels only that session, while a timeout prevents an abandoned turn from running indefinitely. Independent quick, culture/media and deep lanes work behind the lead, and no slow lane blocks an already verified page. Namespacing keeps storage append-only, and every protected external write remains separately confirmed in Chat. See [Content streaming](CONTENT_STREAMING.md).

The visible media layer starts with six locally bundled real photographs and six locally bundled AI-assisted SVG compositions. Every catalogue entry keeps a `kind: "photograph"` record with alt text, photographer, source page, licence URL and a hand-tuned focal point; `assets/experience/PHOTO_CREDITS.json` mirrors those credits for package review. Its separate `kind: "ai-graphic"` record carries alt text and a provenance link. Every tile resolves deterministically to one of those media variants and one of four treatments, so the first frame never waits for a model or network call.

An explicit update can then extend that reserve with remote public imagery. The editor considers at least 18 potential images from three or more source families before selecting for subject/entity relevance, useful information, verified reusable licence, credit clarity, composition, freshness and recent-use diversity. Google Images may supply candidates through its Usage rights filter, but only the original file/licence page can approve one. Every generated non-questionnaire envelope begins with a subject-matched photograph from a reviewed catalogue/family host or a direct first-party image paired to a separate official page; pages above 500 words can carry two or three credited images that `shell.jsx` presents as additional visual beats. A distinct reader-facing content destination remains inside the article copy. `feed.js` validates the host/licence-family relationship, keeps visual credits separate from content links, removes image Markdown even when a candidate is rejected, and discards image files or visual-credit pages as article destinations. When no accepted exact image exists, it generates a deterministic SVG cover from that story's title and excerpt rather than borrowing an unrelated catalogue photograph. `shell.jsx` suppresses referrer data and passes the 80 most recent accepted image URLs into the next update contract for de-duplication. `shared/vibe-markdown.js` provides the common formatting AST for local, preview and public renderers, including duplicate-title removal and readable display maths. The layout clips page-level horizontal overflow, keeps display headlines on whole-word boundaries, and stacks split hero cards before zoom or viewport width makes their copy column too narrow; tables and code retain bounded internal scrolling. The complete card remains subject to `content-store.js`'s existing 30-day and 160-item bounds, so the rolling catalogue naturally sheds stale material without a background refresher or a second storage system.

## Configuration boundaries

- `plugins/dsh-vibeify/cordis.patch.yml` registers the governed bundle's Codex host row and default provider.
- `plugins/dsh-vibeify-experience/cordis.patch.yml` mounts only the loopback update-status host service; the package's browser client still owns the provider-neutral Vibe surface and does not change the native DSH provider.
- `plugins/dsh-vibeify/package.json` declares both the DSH bundle patch and browser client entry.
- `~/.dsh/settings.yaml` owns the user-selected Codex capability level (or exact custom model/reasoning values) and DSH permissions.
- `model-routing-policy.json` owns dated worker capabilities, price assumptions, and the quality-first invariant.
- Codex's own authentication and connected-app configuration remain under Codex; Vibeify does not copy credentials.
- Experience navigation, saved/last-read chunk ids, bounded presentation content, visible questionnaire labels, colour choice, multi-tribe editorial direction, explicit interaction learning, radar reserve and conservative daily ledger stay in browser local storage.
- VIBE colour selection affects the underlying Chat palette only. Editorial direction is passed to the lead on the next explicit magazine update and never changes the model, permissions, routing, approvals or billing.

## Shared radar, local intelligence

The public GitHub repository owns only a shared content radar. A scheduled Action gathers reviewed public trend/community/knowledge endpoints and publishes a validated static JSON document. It contains no installation identifier, settings, Chat history, behaviour or credentials.

Each installation owns its private editorial intelligence. `background-editor.js` combines the public signals with locally selected broad tribes and a bounded summary of explicit interactions, then prompts a separate hidden DSH session. In combined mode the prompt keeps Codex as lead and asks one or two DeepSeek Flash workers to perform most discovery/drafting; Codex validates the closed pages. In provider-neutral mode DeepSeek produces candidates without a Codex-verification claim. That session cannot become a reader Chat card and its pages remain hidden until an explicit update.

## Why a bundle

The earlier installation was a plain dependency plus a handwritten profile patch. A DSH bundle declares `dsh.bundle.patch`, so `dsh plugin --profile <name> add ...` can add the package and its configuration layer together. Profile-local and home-local patch layers remain later overrides, preserving normal DSH composition.

## Portability boundary

Connected apps surfaced by the Codex app-server are available to the lead. Desktop-only capabilities such as an interactive Chrome or Computer Use session may also require the appropriate Codex desktop host connection; permission configuration alone cannot manufacture that host session.

The browser client and its Vibes do not depend on Codex-specific model logic. Native DSH/DeepSeek can already reuse that UI through the provider-neutral package. Other governed lead-agent adapters still require separate authentication, capability checks, and equivalent acceptance tests.
