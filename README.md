# DSH Vibeify

**Your AI work, with a Vibe. DeepSeek, ChatGPT, or both.**

![DSH Vibeify — one lead agent connected to specialist workers](docs/assets/dsh-vibeify-social-preview.png)

[Visit the DSH Vibeify website](https://dsh-vibeify.ezzye.chatgpt.site) · [Read the installation guide](docs/INSTALL.md)

DSH Vibeify turns [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) into a creator-first streaming experience. Vibe is the visual, content-first home; Chat remains underneath for detailed requests, progress, approvals, Queue, Steer, and technical evidence.

Choose the provider setup that suits you:

- **DeepSeek only:** native DSH/DeepSeek runs the agent and the provider-neutral Vibe package supplies the experience.
- **ChatGPT only:** a ChatGPT-authenticated Codex agent leads and works without an OpenAI API key.
- **Both (recommended governance mode):** Codex plans, manages, verifies, integrates, and answers while DeepSeek performs eligible bounded execution.

Neither account is individually compulsory, and installation can finish before either is connected. At least one working provider is required before asking the agent to perform AI work. DeepSeek billing and ChatGPT plan limits remain separate.

The first screen is Vibe itself: a full-screen editorial feed is already populated from a bundled well and the reader's saved stream. No guide, tile, recipe, or prompt must be selected. New editor pages and completed Chat answers arrive at the top, so **Vibe** always returns to the latest material while older pages remain intact below. **Chat** is the detailed source view with the conventional DSH conversation and technical controls.

> DSH is a fast-moving developer preview. Vibeify pins the versions it has tested and includes a health check, but you should still expect upstream changes.

## Start here

### I am curious, but not a developer

Think of DSH as a control room for AI agents. DSH Vibeify changes that control room in three important ways:

1. **The product starts with content, not a task form.** Read, scroll, save, watch, listen, or answer an optional question; open Chat only when you want to make or solve something.
2. **Every tile is visual.** A stable locally bundled photograph is available without an AI-art or network wait, and later images decode lazily.
3. **Provider choice is real.** DeepSeek, ChatGPT, and combined Codex-led governance are separate install modes rather than one account being hidden as a requirement.

It does not switch provider mode without telling you, send your images elsewhere, approve emails or other external actions for you, or promise equivalent quality where no Codex verification step is present.

### I want to try it

For the friendly macOS route, [download the installer](https://dsh-vibeify.ezzye.chatgpt.site/DSH-Vibeify-Installer-macOS.zip), unzip it, and open **Install DSH Vibeify.command**. It installs or updates DSH and Vibeify, lets you choose DeepSeek, ChatGPT, both, or later, runs checks, and opens DSH. It never asks for an API key.

For the developer route you need Node.js 22 or newer and Git:

```bash
git clone https://github.com/N9-Developer-Empowerment/DSH-Vibeify.git
cd DSH-Vibeify
./scripts/install-dsh.sh --latest
./scripts/install-vibeify.sh --provider deepseek   # or chatgpt / auto
./scripts/doctor.sh
dsh web
```

The installer does not restart a DSH process that is already running. Finish active work first. If DSH is already open on port 3080, reuse that page instead of starting a second copy.

For screenshots, alternative profiles, DeepSeek credentials, updating, migration, and removal, read the [full installation guide](docs/INSTALL.md).

## What you get

- **A continuous editorial website.** Vibe covers the DSH work surface completely and opens directly into one long, responsive edition. There is no catalogue-to-player-to-result transition.
- **A deep local well.** Twenty-four deterministic editorial chunks—text, credited photography, and questionnaire cards—are available synchronously on a cold visit. Every tile receives a stable local photograph, later images decode lazily, automatic refills build toward a 64-chunk buffer, and up to 160 chunks persist for return visits.
- **Automatic background refill.** Three warm-up waves are attempted per Vibe visit, with later waves triggered before fewer than fourteen chunks remain ahead. Each refill asks for eight complete semantic items and can use several independently verified worker lanes.
- **Newest-first, append-only depth.** Fresh chunks join the top of the same edition while storage remains append-only. They never replace earlier material; deeper research becomes a visible editorial follow-up above the earlier page.
- **Questionnaires are content.** One-tap cards create useful engagement time and softly shape later refills without blocking reading or pretending to change a request already in flight.
- **Chat is the detailed source view.** Every completed rendered assistant answer is projected into the top of Vibe as an edited, in-memory card, including finished technical answers. Chat retains the working detail. Raw prompts, attachments, reasoning, tool activity, approvals and incomplete progress are never copied; explicit public-content requests can still publish richer verified cards progressively.
- **No empty wait.** Bundled and saved content render in the first local frame. A content-free ledger measures first frame, restore, buffer waves, chunk arrival, low-water events, and engagement.
- **Real photography, labelled AI graphics.** Six locally bundled photographs retain visible photographer/source credit and an Unsplash licence record in `assets/experience/PHOTO_CREDITS.json`. AI is used for graphic treatment—colour, typography, layout and motion—not to impersonate documentary or editorial photography.
- **Provider-neutral Vibe.** `dsh-vibeify-experience` supplies Vibe without installing a Codex provider, so native DSH/DeepSeek remains in control.
- **Optional governed mode.** `dsh-vibeify` uses ChatGPT-authenticated Codex and deliberately removes OpenAI API-key fallbacks from the child process. In this mode Codex remains the lead.
- **DeepSeek-first execution.** Flash handles routine bounded work by default, while Pro is reserved for packets where harder reasoning reduces rework. Experimental Vision remains explicit opt-in for current images.
- **A quality gate, not blind trust.** Every worker receives a Codex-defined acceptance contract and evidence request. Worker prose is never accepted on its own: Codex validates artifacts, tests, or cited evidence before integration.
- **A Codex capability setting.** Open **Settings → Codex** to choose Efficient, Balanced, Frontier, or Maximum. Frontier—GPT-5.6 Sol with Extra High reasoning—is the quality-preserving default.
- **Clearer live work.** Chat receives useful progress, Queue or Steer controls remain available while the agent is busy, and automatic refills or explicit public-content requests can publish closed, source-checked chunks into Vibe without exposing reasoning or raw worker prose.
- **Fewer unnecessary prompts.** Full local access avoids repeated shell approvals while protected external writes still require confirmation.
- **Connected Codex apps.** Installed tools can be surfaced through their normal Codex approval boundaries; desktop-only capabilities still require the appropriate host connection.
- **Image support.** Images can be uploaded to Codex; sending them to another provider always requires explicit intent.
- **Colour and editorial settings.** In Chat, **VIBE settings** combines System, Ocean, Broadcast, Forest and Synthwave colour themes with an editorial direction: Open mix, Style & social life, Football, AI & cars, or a short custom brief. Colour remains presentation-only; editorial direction shapes future Codex-led Vibe refills without changing models, permissions, routing or billing.

## What “lower cost without lower quality” means in combined mode

Codex cannot see the exact quota remaining on your ChatGPT plan. Vibeify therefore does not wait for a quota alarm. It reduces lead-agent consumption structurally: Codex spends its capability on planning, routing, judgment, validation, and the final result, while DeepSeek performs most eligible execution work.

Codex sends one or more well-defined execution packets to a cheaper worker when:

- the task is self-contained;
- its result can be checked independently;
- the selected model has the right capability; and
- the same acceptance bar can be maintained.

Codex does not simply ask whether the worker says it succeeded. It inspects the actual diff, files, test results, sources, or other task evidence. Passing work is reused; Codex repairs only failed or unverifiable parts instead of pointlessly repeating everything.

No system can promise identical quality on every unseen task. Vibeify preserves the quality *process*: the default Codex lead remains the frontier preset, acceptance criteria do not change, and unverifiable work stays with or returns to Codex. Choosing a lower Codex capability level is an explicit user trade-off and should be evaluated on representative work.

DeepSeek API calls are billed separately by DeepSeek. Pricing and model availability change, so the live DSH catalogue is consulted before making cost claims.

## Experience Shell and VIBEs

The **Vibe home** owns the lean-back stream, saved chunks, local buffer, questionnaire cards, automatic refill waves, completed-Chat projections, user-directed public-content pages, and reading position. It is the landing page on every visit; a previous Chat visit is not restored as home. **Chat** reveals the normal DSH conversation, **Trajectory** retains technical work, and **Vibe** returns to the top of the continuous newest-first edition. Completed rendered assistant answers are projected in memory and are not written to the persistent content cache. The uppercase **VIBE settings** control remains separate: colour affects Chat presentation, while the explicit editorial direction affects later Vibe refill prompts. Neither changes models, permissions, routing, protected-action confirmation, or billing policy. In DeepSeek-only mode, Codex-specific capability and progress controls are omitted. See [Vibe generated-content streaming](docs/CONTENT_STREAMING.md) for the playout, cache, timing, chunking, worker-lane, and engagement method.

Select **Chat**, then **VIBE settings** at the bottom-right of the conventional DSH UI to choose a colour palette and editorial direction. Both settings are stored only in that browser; the direction is passed to the Codex lead for future editor refills. Select the **Vibe** session tab to return directly to the newest material.

Daniela Elliott leads the project’s experience design, look and feel, and visual VIBEs. The current palettes are a starting point for a more expressive, user-shaped agent workspace. See [VIBEs](docs/VIBES.md) to add or refine a palette.

## For developers

DSH Vibeify is both a real DSH bundle and a Codex helper plugin:

```text
DSH-Vibeify/
├── .agents/plugins/marketplace.json   # repository Codex marketplace
├── docs/                              # installation, design and security
├── plugins/dsh-vibeify/
│   ├── .codex-plugin/plugin.json      # Codex plugin manifest
│   ├── cordis.patch.yml               # DSH bundle configuration
│   ├── index.js                       # Codex adapter and worker routing
│   ├── codex-capability.js            # lead capability presets
│   ├── codex-settings.js              # live DSH settings integration
│   ├── delegation-contract.js         # worker/acceptance boundary
│   ├── progressive-output.js          # live final-answer delta bridge
│   ├── client-src/experience/         # stream shell, playout, cache, timing and catalogue modules
│   ├── preview/                       # isolated visual iteration harness
│   ├── client.js                      # generated DSH browser artifact
│   └── skills/dsh-vibeify/SKILL.md    # Codex operational guidance
├── plugins/dsh-vibeify-experience/    # provider-neutral DSH client package
└── scripts/                            # installer, migration and doctor
```

The bridge currently pins:

- `@deepseek-ai/dsh` `0.1.1-rc.2`
- `@openai/codex` `0.147.0`
- DSH Vibeify `0.8.0`

Before changing authentication, approvals, routing, image transfer, external actions, or provider behavior, read [Architecture](docs/ARCHITECTURE.md), [Security and billing](docs/SECURITY.md), [Contributing](CONTRIBUTING.md), and [AGENTS.md](AGENTS.md).

Run the source checks with:

```bash
./scripts/doctor.sh --source
```

For visual iteration without restarting DSH:

```bash
cd plugins/dsh-vibeify
npm install
npm run build:preview
python3 -m http.server 4173 --directory ../../tmp/vibeify-preview
```

The release workflow also runs the Codex plugin validator, skill validator, package dry-run, isolated DSH composition, and server-start smoke test.

## Install the Codex helper plugin

This optional step teaches Codex how to install and diagnose DSH Vibeify. It does not itself install the DSH runtime bundle.

```bash
codex plugin marketplace add /absolute/path/to/DSH-Vibeify
codex plugin add dsh-vibeify@dsh-vibeify
```

Start a new Codex task after installation so the helper skill is discovered cleanly.

## People

- **Errol Elliott** — agent architecture, integration, and product direction
- **Daniela Elliott** — experience design, look and feel, and visual VIBEs

Contributions are welcome. DSH Vibeify is an independent community project and is not an official DeepSeek or OpenAI product.

## Upstream references

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [DSH plugin packaging](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)
- [OpenAI Codex plugin documentation](https://learn.chatgpt.com/docs/build-plugins)
