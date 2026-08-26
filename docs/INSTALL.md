# Installation

These instructions install a persistent DSH CLI, authenticate Codex with a ChatGPT account, install the Vibeify bundle into the `web` profile, and optionally expose the repository's helper skill to Codex.

## Requirements

- macOS 14+ on Apple silicon or another platform supported by DeepSeek Harness
- Node.js 22 or newer and npm
- Git
- A ChatGPT account with Codex access
- Optional: a DeepSeek API key for separately billed DeepSeek worker calls

The tested combination is:

- `@deepseek-ai/dsh` `0.1.1-rc.2`
- `@openai/codex` `0.147.0` inside the bridge
- DSH Vibeify `0.7.0`

## 1. Obtain this repository

When a remote is available:

```bash
git clone <repository-url> /Users/you/IdeaProjects/DSH-Vibeify
cd /Users/you/IdeaProjects/DSH-Vibeify
```

For the current local checkout:

```bash
cd /Users/errolelliott/IdeaProjects/DSH-Vibeify
```

## 2. Install DeepSeek Harness

```bash
./scripts/install-dsh.sh
```

The script installs the pinned developer-preview release globally. If another DSH version is already installed, it stops and asks for an explicit upgrade/downgrade:

```bash
./scripts/install-dsh.sh --replace
```

DeepSeek's upstream quick start also supports `npx @deepseek-ai/dsh web`, but a persistent CLI is more convenient for installing an out-of-tree bundle into a named profile.

## 3. Sign Codex into ChatGPT

```bash
codex login
codex login status
```

Complete the browser login with the ChatGPT account whose Codex subscription you want to use. Do not use `--with-api-key`: the bridge deliberately accepts ChatGPT authentication only and removes `OPENAI_API_KEY` and `OPENAI_API_KEY_PATH` from its child process.

The bundle carries its own pinned Codex executable, but it reuses the account authentication stored by Codex.

## 4. Install Vibeify into DSH

```bash
./scripts/install-vibeify.sh
```

The installer:

1. adds `plugins/dsh-vibeify` to the DSH `web` profile using DSH's official plugin mechanism;
2. migrates the exact legacy `dsh-llm-codex-chatgpt-local` dependency and handwritten loader row when present, preserving a timestamped backup;
3. verifies the composed configuration without booting the Web UI; and
4. never restarts DSH automatically.

Use a different profile with:

```bash
DSH_PROFILE=my-profile ./scripts/install-vibeify.sh
```

For a manual local install:

```bash
dsh plugin --profile web add --workspace-root file:/absolute/path/to/DSH-Vibeify/plugins/dsh-vibeify
dsh --profile web --dump-config
```

For a future GitHub-hosted repository, clone it and check out a reviewed commit before running the installer:

```bash
git clone https://github.com/<owner>/DSH-Vibeify.git
cd DSH-Vibeify
git checkout <reviewed-commit>
./scripts/install-vibeify.sh
```

## 5. Enable DeepSeek-first execution

Start DSH, open **Settings → Models**, enter the DeepSeek credential there, and save it. Do not place the key in this repository, shell history, screenshots, or support logs.

DeepSeek credentials are separate from ChatGPT/Codex. When a key is configured, Vibeify asks DeepSeek to perform most eligible bounded execution work. Codex remains the lead and independently validates the returned artifacts or evidence. Without a DeepSeek key, the same Codex lead still works but cannot offload those packets.

## 6. Start and verify

```bash
./scripts/doctor.sh
dsh web
```

The Web UI normally opens at [http://127.0.0.1:3080](http://127.0.0.1:3080). If the address is already in use, check whether an existing DSH process owns it and reuse that process rather than launching another instance.

In a new session, ask:

```text
Report your Codex model, reasoning effort, access mode, and available DSH worker routes. Do not make a paid worker call.
```

Expected lead status: `Frontier (recommended) · GPT-5.6 Sol · Extra High · Full Access`.

## 7. Choose the Codex capability level

Open **Settings → Codex** in DSH:

- **Frontier (recommended):** GPT-5.6 Sol · Extra High. This is the default and preserves the strongest lead for planning and verification.
- **Maximum:** GPT-5.6 Sol · Max for the hardest quality-first work.
- **Balanced:** GPT-5.6 Terra · High for a lighter lead.
- **Efficient:** GPT-5.6 Luna · High for routine, highly checkable work.

The capability setting changes the Codex model and reasoning effort together. It never makes DeepSeek the lead. Lower levels are explicit trade-offs; test them on representative tasks before relying on them for high-value work. Changes apply to subsequent Codex turns.

To verify both routing and the active lead without making a paid worker call, ask:

```text
Report your Codex capability level, model, reasoning effort, access mode, and available DSH worker routes. Explain the DeepSeek-first acceptance contract. Do not call a paid worker.
```

## Optional: install the Codex helper plugin

This does not install the DSH runtime bundle. It gives Codex the repository's installation and diagnostic skill:

```bash
codex plugin marketplace add /absolute/path/to/DSH-Vibeify
codex plugin add dsh-vibeify@dsh-vibeify
```

Start a new Codex task after installation so the skill is discovered cleanly.

## Updates

```bash
git pull --ff-only
./scripts/install-vibeify.sh
./scripts/doctor.sh
```

Finish active work before restarting DSH. Because DSH is a developer preview, review version changes and rerun the full doctor and plugin tests after every upstream upgrade.

## Removal

```bash
dsh plugin --profile web remove --workspace-root dsh-vibeify
```

Removing the bundle does not delete DSH sessions, Codex authentication, DeepSeek credentials, or browser-stored VIBE preferences.
