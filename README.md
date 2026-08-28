# DSH Vibeify

**A generative-AI harness that feels like a living website. DeepSeek, ChatGPT, or both.**

![DSH Vibeify — one lead agent connected to specialist workers](docs/assets/dsh-vibeify-social-preview.png)

[Visit the DSH Vibeify information and download site](https://dsh-vibeify.ezzye.chatgpt.site) · [See how it works](docs/HOW_IT_WORKS.md) · [Read the installation guide](docs/INSTALL.md)

DSH Vibeify does **not** create or host a public website. It turns [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)—a local runtime for agents, models, tools, permissions and sessions—into a creator-first streaming experience that *behaves* like a website. Vibe is the visual, content-first home; Chat remains underneath for detailed requests, progress, approvals, Queue, Steer and technical evidence.

## The idea: generative AI beyond turn-by-turn chat

Most AI products begin with an empty box. The person writes a prompt, waits for one answer, and repeats. DSH Vibeify begins with something useful to explore and turns completed answers from any Chat thread into one continuous edition. It generates extra magazine material only when the reader asks for an update.

```mermaid
flowchart LR
    OPEN["Open local DSH"] --> VIBE["Vibe already contains a visual edition"]
    VIBE --> EXPLORE["Read · watch · save · respond"]
    EXPLORE --> SIGNAL["A Chat request, pull-to-update, or Update click"]
    SIGNAL --> HARNESS["DSH harness\nsessions · tools · models · permissions"]
    HARNESS --> LEAD["Active lead agent\nplans and defines acceptance"]
    LEAD --> INSTANT["Local reserve\nvisual short + questionnaire in under a second"]
    LEAD --> WORK["Independent specialist lanes\nquick · culture · media · deep"]
    WORK --> CHECK["Lead verifies each finished lane independently"]
    CHECK --> STREAM["Each closed editorial chunk streams immediately"]
    INSTANT --> VIBE
    STREAM --> VIBE
    STREAM --> STOP["One bounded update completes, then stops"]
    EXPLORE -. "open when you want control or detail" .-> CHAT["Chat\nask · queue · steer · approve · inspect"]
    CHAT --> HARNESS
```

The visible surface is website-like, but the machinery underneath is an agent harness:

| Layer | What it does |
| --- | --- |
| **DSH** | Runs sessions, agents, model routes, tools, permissions and approvals on the user's machine. |
| **Vibeify** | Adds the continuous editorial stream, visual presentation, local content buffer and safe route between generated work and the stream. |
| **Vibe** | Presents completed answers from every thread as one newest-first edition. Extra editorial work runs only after Pull to update or Update. It is not a separate public site. |
| **Chat** | Lets the user ask directly, queue or steer work, approve protected actions and inspect progress or technical evidence. |
| **Lead agent** | Plans, sets the acceptance bar, validates work and owns the final result. This is Codex in governed ChatGPT/combined mode, or the native DSH agent in DeepSeek-only mode. |
| **Workers** | Optionally perform bounded research, coding, analysis or media work; their output is not published merely because they say it is finished. |

“Streaming” here means a continuous stream of **complete, formatted content items**, not merely text appearing token by token. The edition is available immediately from local bundled and saved material. A deliberate pull or Update click spends a ready visual short and questionnaire immediately, then publishes each closed generated page as its lane passes lead verification; it does not wait for the slowest lane or the final answer. A completed Chat answer joins the top without another AI call. Opening, scrolling, changing settings, or finishing a batch never starts another one.

This is the different paradigm: **Chat is an available control surface, not the whole product.** Each Chat thread remains request-driven and becomes idle after it answers. Vibe is the shared presentation layer across those threads, with an explicit update gesture when the reader wants more.

For a plain-English walkthrough of the two surfaces, instant local reserve, parallel agent lanes, complete-page streaming, stop conditions, provider modes, and privacy boundary, read [How DSH Vibeify works](docs/HOW_IT_WORKS.md).

Choose the provider setup that suits you:

- **DeepSeek only:** native DSH/DeepSeek runs the agent and the provider-neutral Vibe package supplies the experience.
- **ChatGPT only:** a ChatGPT-authenticated Codex agent leads and works without an OpenAI API key.
- **Both (recommended governance mode):** Codex plans, manages, verifies, integrates, and answers while DeepSeek performs eligible bounded execution.

Neither account is individually compulsory, and installation can finish before either is connected. At least one working provider is required before asking the agent to perform AI work. DeepSeek billing and ChatGPT plan limits remain separate.

The first screen is Vibe itself: a full-screen editorial feed is already populated from a bundled well and the reader's saved magazine. No guide, tile, recipe, or prompt must be selected. Completed answers from all local DSH threads arrive at the top only after their turns finish successfully. **Chat** remains the detailed source view with the conventional DSH conversation and technical controls.

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

For screenshots, alternative profiles, DeepSeek credentials, updating, migration, and removal, read the [full installation guide](docs/INSTALL.md). For the product lifecycle before or after installation, see [How it works](docs/HOW_IT_WORKS.md).

## What you get

- **A continuous editorial website.** Vibe covers the DSH work surface completely and opens directly into one long, responsive edition. There is no catalogue-to-player-to-result transition.
- **A deep local well.** Twenty-four deterministic editorial chunks—text, credited photography, and questionnaire cards—are available synchronously on a cold visit. Every tile receives a stable local photograph, later images decode lazily, and up to 160 completed magazine items persist for return visits.
- **Instant, bounded updates.** Pull down from the top of Vibe—including a two-finger pull on a Mac trackpad—or choose **Update** for a batch of eight complete semantic items. A locally prepared visual short and questionnaire appear immediately; six generated pages then stream independently from quick, culture/media and deep lanes as they are checked. **Stop update** cancels only that dedicated magazine turn, and a 20-minute ceiling stops a stuck update. No mount, ordinary scroll, settings change, or completion event can chain another run.
- **Newest-first, append-only depth.** Fresh chunks join the top of the same edition while storage remains append-only. They never replace earlier material; deeper research becomes a visible editorial follow-up above the earlier page.
- **Questionnaires are content.** One-tap cards create useful engagement time and softly shape the next explicitly requested update without blocking reading or pretending to change a request already in flight.
- **One magazine across every real Chat thread.** Vibe reads local DSH history without reopening or resuming a thread and accepts only turns durably marked completed. Internal subagent sessions and the dedicated update session are not mistaken for reader conversations. The final assistant answer is sanitised into a browser-local card. Raw prompts, worker reports, candidate lists, attachments, reasoning, tool activity, approvals, session identifiers, aborted work and incomplete progress are never copied.
- **No empty wait or hidden work.** Bundled and saved content render in the first local frame. A content-free ledger measures first frame, restore, explicit updates, chunk arrival, and engagement. Simply reading the magazine consumes no model quota.
- **Real photography, labelled AI graphics.** Six locally bundled photographs retain visible photographer/source credit and an Unsplash licence record in `assets/experience/PHOTO_CREDITS.json`. AI is used for graphic treatment—colour, typography, layout and motion—not to impersonate documentary or editorial photography.
- **Provider-neutral Vibe.** `dsh-vibeify-experience` supplies Vibe without installing a Codex provider, so native DSH/DeepSeek remains in control.
- **Optional governed mode.** `dsh-vibeify` uses ChatGPT-authenticated Codex and deliberately removes OpenAI API-key fallbacks from the child process. In this mode Codex remains the lead.
- **DeepSeek-first execution.** Flash handles routine bounded work by default, while Pro is reserved for packets where harder reasoning reduces rework. Experimental Vision remains explicit opt-in for current images.
- **A quality gate, not blind trust.** Every worker receives a Codex-defined acceptance contract and evidence request. Worker prose is never accepted on its own: Codex validates artifacts, tests, or cited evidence before integration.
- **A Codex capability setting.** Open **Settings → Codex** to choose Efficient, Balanced, Frontier, or Maximum. Frontier—GPT-5.6 Sol with Extra High reasoning—is the quality-preserving default.
- **A safe update centre.** Open **Settings → Updates** to check the installed DSH, Vibeify, and bundled Codex agent separately. A newer Codex release is not labelled installable until Vibeify has qualified it. **Download safe updater** opens the friendly Mac updater, which installs immutable packages and asks before a detached, verified restart.
- **Clearer live work.** Chat receives useful progress, Queue or Steer controls remain available while the agent is busy, and explicit magazine updates or public-content requests can publish closed, source-checked chunks into Vibe without exposing reasoning or raw worker prose.
- **Fewer unnecessary prompts.** Full local access avoids repeated shell approvals while protected external writes still require confirmation.
- **Connected Codex apps.** Installed tools can be surfaced through their normal Codex approval boundaries; desktop-only capabilities still require the appropriate host connection.
- **Image support.** Images can be uploaded to Codex; sending them to another provider always requires explicit intent.
- **Colour and editorial settings.** In Chat, **VIBE settings** combines System, Ocean, Broadcast, Forest and Synthwave colour themes with an editorial direction: Open mix, Style & social life, Football, AI & cars, or a short custom brief. Colour remains presentation-only; editorial direction shapes the next user-requested Vibe update without changing models, permissions, routing or billing.

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

The **Vibe home** owns one lean-back magazine, saved chunks, questionnaire cards, completed-Chat projections from every local thread, explicit update controls, user-directed public-content pages, and reading position. It is the landing page on every visit; a previous Chat visit is not restored as home. **Chat** reveals the normal DSH conversation, **Trajectory** retains technical work, and **Vibe** returns to the top of the newest-first edition. Completed answers and explicitly published chunks are retained in a bounded 30-day browser-local cache; prompts, session ids and working activity are not. The uppercase **VIBE settings** control remains separate: colour affects Chat presentation, while editorial direction affects only the next requested magazine update. Neither changes models, permissions, routing, protected-action confirmation, or billing policy. In DeepSeek-only mode, Codex-specific capability and progress controls are omitted. See [Vibe generated-content streaming](docs/CONTENT_STREAMING.md) for the lifecycle, local-history projection, cache, timing, chunking, and worker method.

Select **Chat**, then **VIBE settings** at the bottom-right of the conventional DSH UI to choose a colour palette and editorial direction. Both settings are stored only in that browser; the direction is passed to the lead only when you next pull to update or choose **Update**. Select the **Vibe** session tab to return directly to the newest material.

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
│   ├── update-check.js                # fixed-source version and compatibility checks
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
- DSH Vibeify `0.11.0`

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
