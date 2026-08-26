# DSH Vibeify

DSH Vibeify turns DeepSeek Harness into a more visible, personal, Codex-led agent workspace.

It packages the working local bridge as a real DSH bundle, keeps ChatGPT-authenticated Codex in charge, makes installed Codex apps available behind their normal protected approvals, exposes optional DeepSeek workers for bounded work, and adds a small VIBE picker to the Web UI.

> **Developer preview:** DeepSeek Harness is changing quickly and warns that compatibility-breaking changes should be expected. DSH Vibeify therefore pins the currently tested DSH and Codex versions and includes a read-only doctor command.

## What it provides

- ChatGPT-authenticated Codex as the default lead agent; OpenAI API keys are removed from the Codex child process.
- GPT-5.6 Sol with Extra High reasoning by default, configurable in `~/.dsh/settings.yaml`.
- Optional DeepSeek Flash, Pro, and experimental Vision workers behind a quality-first routing policy.
- Image uploads to Codex and explicit, opt-in image forwarding to image-capable workers.
- Connected Codex apps such as Gmail, GitHub, Google Drive, Calendar, Sites, and Spotify.
- Full local access without repeated shell prompts, while external writes still require one explicit approval.
- Live progress in Chat, approval refresh protection, and Queue/Steer controls during a running turn.
- System, Ocean, Broadcast, Forest, and Synthwave VIBEs stored only in the current browser.
- A Codex skill that teaches another Codex agent how to install, diagnose, and operate the bundle safely.

This release supports ChatGPT-authenticated Codex as the lead. The DSH adapter and browser layers are deliberately separate so future lead-agent adapters can reuse the VIBE and usability work, but parity with another lead agent must be implemented and tested rather than assumed.

## Quick start

```bash
cd /Users/errolelliott/IdeaProjects/DSH-Vibeify
./scripts/install-dsh.sh
codex login
./scripts/install-vibeify.sh
./scripts/doctor.sh
dsh web
```

If DSH is already running, the installer stages the new bundle but does not restart it. Finish or stop active tasks before restarting. If port 3080 is already in use by DSH, reuse the existing page instead of launching a second server.

For a first installation, model credentials, migration from the older local bridge, Codex plugin installation, updates, and removal, read [Installation](docs/INSTALL.md).

## Choose a VIBE

After the bundle is loaded, select **VIBE** in the Web UI and choose a palette. This is presentation only: it does not change models, permissions, prompts, routing, or billing. See [VIBEs](docs/VIBES.md).

## Agent policy

Codex remains the lead. It owns planning, authorization-bearing decisions, verification, integration, and the final answer. A DeepSeek worker may receive only a bounded task whose result Codex can independently check without lowering quality. If parity is uncertain, Codex does the work itself.

DeepSeek API usage is separately billed. DSH Vibeify cannot see the user's remaining Codex-plan quota, so routing is proactive rather than quota-aware.

## Repository map

```text
DSH-Vibeify/
├── .agents/plugins/marketplace.json   # repo-local Codex marketplace
├── docs/                              # installation, design, security, VIBEs
├── plugins/dsh-vibeify/               # installable DSH bundle + Codex skill
└── scripts/                            # installer, migration helper, doctor
```

Read [Architecture](docs/ARCHITECTURE.md), [Security and billing](docs/SECURITY.md), and [Contributing](CONTRIBUTING.md) before extending provider, approval, credential, or external-action behavior.

## Upstream references

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [DSH plugin packaging](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)
- [OpenAI plugin documentation](https://learn.chatgpt.com/docs/build-plugins)

DSH Vibeify is an independent community project and is not an official DeepSeek or OpenAI product.
