# DSH Vibeify

**DeepSeek does the work. Codex makes sure it is right. Your own VIBE.**

![DSH Vibeify — one lead agent connected to specialist workers](docs/assets/dsh-vibeify-social-preview.png)

[Visit the DSH Vibeify website](https://dsh-vibeify.ezzye.chatgpt.site) · [Read the installation guide](docs/INSTALL.md)

DSH Vibeify turns [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) into a clearer, more personal workspace led by Codex.

You keep talking to Codex as your lead agent. Codex plans the job and defines what “done well” means. DeepSeek then performs most eligible implementation, research, test, documentation, and analysis work. Codex inspects the real artifacts or evidence, validates the result, fixes any gaps, brings everything together, and remains responsible for the answer.

The project also improves the everyday experience: more useful progress in Chat, visible approvals, Queue and Steer controls, image support, and visual themes called **VIBEs**.

> DSH is a fast-moving developer preview. Vibeify pins the versions it has tested and includes a health check, but you should still expect upstream changes.

## Start here

### I am curious, but not a developer

Think of DSH as a control room for AI agents. DSH Vibeify changes that control room in three important ways:

1. **Codex stays in charge.** It plans, checks, integrates, and answers.
2. **DeepSeek does most suitable execution.** It receives clear work packets that Codex can independently verify.
3. **The workspace feels understandable.** You see more of what is happening and can choose a look that suits you.

It does not silently replace Codex with another model, send your images elsewhere, approve emails or other external actions for you, or promise savings at the expense of quality.

### I want to try it

You need a Mac or other DSH-supported computer, Node.js 22 or newer, Git, and a ChatGPT account with Codex access. Add a DeepSeek API key to get the DeepSeek-first cost benefit; without it, Codex remains usable on its own.

```bash
git clone https://github.com/N9-Developer-Empowerment/DSH-Vibeify.git
cd DSH-Vibeify
./scripts/install-dsh.sh
codex login
./scripts/install-vibeify.sh
./scripts/doctor.sh
dsh web
```

The installer does not restart a DSH process that is already running. Finish active work first. If DSH is already open on port 3080, reuse that page instead of starting a second copy.

For screenshots, alternative profiles, DeepSeek credentials, updating, migration, and removal, read the [full installation guide](docs/INSTALL.md).

## What you get

- **Codex remains the lead.** The default route uses ChatGPT-authenticated Codex and deliberately removes OpenAI API-key fallbacks from the child process.
- **DeepSeek-first execution.** Flash handles routine bounded work by default, while Pro is reserved for packets where harder reasoning reduces rework. Experimental Vision remains explicit opt-in for current images.
- **A quality gate, not blind trust.** Every worker receives a Codex-defined acceptance contract and evidence request. Worker prose is never accepted on its own: Codex validates artifacts, tests, or cited evidence before integration.
- **A Codex capability setting.** Open **Settings → Codex** to choose Efficient, Balanced, Frontier, or Maximum. Frontier—GPT-5.6 Sol with Extra High reasoning—is the quality-preserving default.
- **Clearer live work.** Chat receives useful progress, and Queue or Steer controls remain available while the agent is busy.
- **Fewer unnecessary prompts.** Full local access avoids repeated shell approvals while protected external writes still require confirmation.
- **Connected Codex apps.** Installed tools can be surfaced through their normal Codex approval boundaries; desktop-only capabilities still require the appropriate host connection.
- **Image support.** Images can be uploaded to Codex; sending them to another provider always requires explicit intent.
- **Five built-in VIBEs.** Choose System, Ocean, Broadcast, Forest, or Synthwave. Your choice stays in browser storage and never changes models, permissions, prompts, routing, or billing.

## What “lower cost without lower quality” means

Codex cannot see the exact quota remaining on your ChatGPT plan. Vibeify therefore does not wait for a quota alarm. It reduces lead-agent consumption structurally: Codex spends its capability on planning, routing, judgment, validation, and the final result, while DeepSeek performs most eligible execution work.

Codex sends one or more well-defined execution packets to a cheaper worker when:

- the task is self-contained;
- its result can be checked independently;
- the selected model has the right capability; and
- the same acceptance bar can be maintained.

Codex does not simply ask whether the worker says it succeeded. It inspects the actual diff, files, test results, sources, or other task evidence. Passing work is reused; Codex repairs only failed or unverifiable parts instead of pointlessly repeating everything.

No system can promise identical quality on every unseen task. Vibeify preserves the quality *process*: the default Codex lead remains the frontier preset, acceptance criteria do not change, and unverifiable work stays with or returns to Codex. Choosing a lower Codex capability level is an explicit user trade-off and should be evaluated on representative work.

DeepSeek API calls are billed separately by DeepSeek. Pricing and model availability change, so the live DSH catalogue is consulted before making cost claims.

## Choose or create a VIBE

Select **VIBE** at the bottom-right of the DSH Web UI. The selected palette is stored only in that browser.

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
│   ├── client.js                      # progress, approvals and VIBEs
│   └── skills/dsh-vibeify/SKILL.md    # Codex operational guidance
└── scripts/                            # installer, migration and doctor
```

The bridge currently pins:

- `@deepseek-ai/dsh` `0.1.1-rc.2`
- `@openai/codex` `0.147.0`
- DSH Vibeify `0.7.0`

Before changing authentication, approvals, routing, image transfer, external actions, or provider behavior, read [Architecture](docs/ARCHITECTURE.md), [Security and billing](docs/SECURITY.md), [Contributing](CONTRIBUTING.md), and [AGENTS.md](AGENTS.md).

Run the source checks with:

```bash
./scripts/doctor.sh --source
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
