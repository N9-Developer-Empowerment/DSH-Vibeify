# DSH Vibeify

**One lead agent. More ways to work. Your own VIBE.**

[Visit the DSH Vibeify website](https://dsh-vibeify.ezzye.chatgpt.site) · [Read the installation guide](docs/INSTALL.md)

DSH Vibeify turns [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) into a clearer, more personal workspace led by Codex.

You keep talking to Codex as your main agent. Codex can use DeepSeek models for carefully bounded pieces of work when doing so will not reduce quality. It then checks the work, brings everything together, and remains responsible for the result.

The project also improves the everyday experience: more useful progress in Chat, visible approvals, Queue and Steer controls, image support, and visual themes called **VIBEs**.

> DSH is a fast-moving developer preview. Vibeify pins the versions it has tested and includes a health check, but you should still expect upstream changes.

## Start here

### I am curious, but not a developer

Think of DSH as a control room for AI agents. DSH Vibeify changes that control room in three important ways:

1. **Codex stays in charge.** It plans, checks, integrates, and answers.
2. **Other models can help safely.** They receive small tasks that Codex can independently verify.
3. **The workspace feels understandable.** You see more of what is happening and can choose a look that suits you.

It does not silently replace Codex with another model, send your images elsewhere, approve emails or other external actions for you, or promise savings at the expense of quality.

### I want to try it

You need a Mac or other DSH-supported computer, Node.js 22 or newer, Git, and a ChatGPT account with Codex access. A DeepSeek API key is optional.

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
- **Optional specialist workers.** DeepSeek Flash, Pro, and experimental Vision routes are available for bounded, independently checkable work.
- **A quality-first routing policy.** If equivalent quality cannot be demonstrated, Codex does the work itself.
- **Clearer live work.** Chat receives useful progress, and Queue or Steer controls remain available while the agent is busy.
- **Fewer unnecessary prompts.** Full local access avoids repeated shell approvals while protected external writes still require confirmation.
- **Connected Codex apps.** Installed tools can be surfaced through their normal Codex approval boundaries; desktop-only capabilities still require the appropriate host connection.
- **Image support.** Images can be uploaded to Codex; sending them to another provider always requires explicit intent.
- **Five built-in VIBEs.** Choose System, Ocean, Broadcast, Forest, or Synthwave. Your choice stays in browser storage and never changes models, permissions, prompts, routing, or billing.

## What “lower cost without lower quality” means

Codex cannot see the exact quota remaining on your ChatGPT plan. Vibeify therefore does not wait for a quota alarm or automatically move whole jobs elsewhere.

Instead, Codex may send one well-defined task to a cheaper worker when:

- the task is self-contained;
- its result can be checked independently;
- the selected model has the right capability; and
- the same acceptance bar can be maintained.

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
│   ├── client.js                      # progress, approvals and VIBEs
│   └── skills/dsh-vibeify/SKILL.md    # Codex operational guidance
└── scripts/                            # installer, migration and doctor
```

The bridge currently pins:

- `@deepseek-ai/dsh` `0.1.1-rc.2`
- `@openai/codex` `0.147.0`
- DSH Vibeify `0.6.0`

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
