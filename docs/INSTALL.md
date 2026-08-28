# Installation

DSH Vibeify supports DeepSeek only, ChatGPT only, or both. Neither account is individually required, and you can install before connecting either one. At least one working provider is required before asking the agent to perform AI work.

## Friendly macOS installation

1. Visit [dsh-vibeify.ezzye.chatgpt.site](https://dsh-vibeify.ezzye.chatgpt.site).
2. Download and unzip **DSH-Vibeify-Installer-macOS.zip**.
3. Double-click **Install DSH Vibeify.command**. If macOS blocks an unsigned community script, right-click it, choose **Open**, and review the prompt.
4. Choose DeepSeek, ChatGPT, both, or connect later.

The helper checks Node.js, downloads the public GitHub repository, installs or updates the latest official `@deepseek-ai/dsh` release, installs an immutable Vibeify snapshot, runs non-billing checks, and opens the local Web UI. It never requests an API key or account password.

If Node.js 22 or newer is missing, the helper opens the official Node.js download page and stops. Install Node, then run it again.

If DSH is already running, the helper stages the update and asks you to confirm that current work has finished before a canary-checked detached restart. It never interrupts an active task silently.

## Choose a provider mode

| Mode | Installed package | Lead | Account setup |
| --- | --- | --- | --- |
| DeepSeek only | `dsh-vibeify-experience` | Native DSH/DeepSeek agent | Add a DeepSeek key under **Settings → Models** |
| ChatGPT only | `dsh-vibeify` | ChatGPT-authenticated Codex | Complete the official `codex login` browser flow |
| Both | `dsh-vibeify` | Codex lead with eligible DeepSeek workers | Complete both of the above |

The provider-neutral package installs only the Vibe browser experience, so it does not replace DSH's native DeepSeek provider or show Codex-only capability controls. The governed package adds the Codex provider, capability settings, progress controls, and bounded DeepSeek delegation.

DeepSeek API billing and ChatGPT plan limits are separate. Installation itself makes no paid model call.

## Developer installation

Requirements:

- macOS 14+ on Apple silicon, or another platform supported by DeepSeek Harness;
- Node.js 22 or newer and npm;
- Git;
- one provider account when you are ready to ask the agent to work.

The currently tested combination is:

- `@deepseek-ai/dsh` `0.1.1-rc.2` (also the official `latest` dist-tag at the time of this release);
- `@openai/codex` `0.147.0` inside the governed bridge;
- DSH Vibeify `0.10.0`.

Clone and install:

```bash
git clone https://github.com/N9-Developer-Empowerment/DSH-Vibeify.git
cd DSH-Vibeify
./scripts/install-dsh.sh --latest
./scripts/install-vibeify.sh --provider deepseek
./scripts/doctor.sh
dsh web
```

Use `--provider chatgpt` after completing `codex login`. Use `--provider auto` to select ChatGPT mode when a ChatGPT-authenticated Codex login exists and DeepSeek mode otherwise.

The scripts honour `DSH_PROFILE` for a profile other than `web`:

```bash
DSH_PROFILE=my-profile ./scripts/install-vibeify.sh --provider deepseek
```

## Connect DeepSeek

Create or open an account at [platform.deepseek.com](https://platform.deepseek.com/). Start DSH, open **Settings → Models**, and enter the DeepSeek credential there. Do not put the key in the repository, command history, screenshots, or support logs.

In DeepSeek-only mode the native DSH agent is the lead. In combined mode DeepSeek receives bounded execution packets and Codex validates the resulting artifacts or evidence before integration.

## Connect ChatGPT

```bash
npm install --global @openai/codex@latest
codex login
codex login status
./scripts/install-vibeify.sh --provider chatgpt
```

Complete the browser login with the ChatGPT account whose Codex access you want to use. Do not use `--with-api-key`: the bridge deliberately accepts ChatGPT authentication only and removes `OPENAI_API_KEY` and `OPENAI_API_KEY_PATH` from its child process.

In DSH, open **Settings → Codex** to choose Frontier, Maximum, Balanced, or Efficient. This page exists only in ChatGPT/combined mode. Frontier—GPT-5.6 Sol with Extra High reasoning—is the default quality-preserving lead.

## Verify without a paid call

```bash
./scripts/doctor.sh
```

The doctor validates both browser artifacts, immutable packaging support, restart supervision, the selected profile mode, provider ownership, and local UI reachability. It does not send a model request or perform an external write.

For governed mode, a new DSH conversation can also be asked:

```text
Report your Codex capability level, model, reasoning effort, access mode, and available DSH worker routes. Do not make a paid worker call.
```

## Update safely

Open **Settings → Updates** in DSH to check three independent versions:

- the DSH host installed on the Mac against the official npm `latest` release;
- Vibeify against the latest public GitHub package manifest; and
- the bundled Codex agent against both the current official Codex release and the version qualified by the latest Vibeify bundle.

The check is read-only, uses fixed public release URLs, caches successful results for six hours, and changes nothing. A newer Codex release is shown as **compatibility check pending** until a Vibeify release pins it; this prevents an untested agent upgrade being presented as safe.

Choose **Download safe updater** or download and run the current friendly installer again. The helper updates DSH and the latest Vibeify compatibility bundle, runs non-billing checks, asks the user to confirm that active work is finished, and delegates replacement to the detached restart supervisor. Developers can run:

```bash
git pull --ff-only
./scripts/install-dsh.sh --latest
./scripts/install-vibeify.sh --provider auto
./scripts/doctor.sh
```

`install-vibeify.sh` packages the checkout into a content-addressed snapshot before adding it to the DSH profile. This prevents an editable checkout from changing files underneath a running process.

Finish active work before activation. After explicit authorization:

```bash
./scripts/activate-vibeify.sh --confirmed-idle --provider auto
node scripts/dsh-restart.mjs status
```

The activation script tests the source, installs the immutable snapshot, canary-boots it away from the live port, and gives the replacement to a detached supervisor. A host agent can disconnect during handoff without killing the new DSH process.

## Remove Vibeify

Remove whichever mode is installed:

```bash
dsh plugin --profile web remove --workspace-root dsh-vibeify
dsh plugin --profile web remove --workspace-root dsh-vibeify-experience
```

Removing Vibeify does not delete DSH sessions, Codex authentication, DeepSeek credentials, or browser-stored Vibe preferences.

## Optional Codex helper plugin

This repository also contains a Codex helper skill for installation and diagnosis. It is not the DSH runtime package:

```bash
codex plugin marketplace add /absolute/path/to/DSH-Vibeify
codex plugin add dsh-vibeify@dsh-vibeify
```

Start a new Codex task after installation so the skill is discovered cleanly.
