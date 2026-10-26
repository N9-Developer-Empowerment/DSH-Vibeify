# Installation

DSH Vibeify supports DeepSeek only, ChatGPT only, or both with DeepSeek leading and optional OpenAI worker support. Installation can finish before accounts are connected. Connect DeepSeek before using a DeepSeek-led mode; ChatGPT sign-in is needed for the ChatGPT-only lead or the optional Codex worker.

New to the idea? Read [How DSH Vibeify works](HOW_IT_WORKS.md) for the two-surface model, what starts an agent, how pages stream, and what remains local.

## Choose the friendly installer

| Platform | Friendly entry point | Evidence status |
| --- | --- | --- |
| Apple-silicon macOS 14+ | [Public macOS ZIP](https://dsh-vibeify.ezzye.chatgpt.site/DSH-Vibeify-Installer-macOS.zip) | Verified on a real Mac. |
| Windows 10/11 | `scripts/Install DSH Vibeify Windows.cmd` in the Windows preview ZIP | Preview until a real Windows installation run passes. |
| Current desktop Linux | `scripts/install-dsh-vibeify-linux.sh` in the Linux preview ZIP | Preview until representative real Linux installation runs pass. |

The release workflow builds all three ZIP files plus `SHA256SUMS`. The public information site should advertise Windows or Linux as verified only after that platform's real-machine run has passed; source parsing or a macOS simulation is not equivalent evidence. See [Installation and help FAQ](FAQ.md) for current download status, safe platform-warning steps, and a privacy-safe support prompt.

Every installer supports a non-installing check mode: macOS and Linux accept `--check`; Windows PowerShell accepts `-Check`. It downloads the current public repository, checks its expected files and JavaScript, and exits without installing software, changing a DSH profile, signing in, restarting DSH, or making a model call.

## Friendly macOS installation

1. Visit [dsh-vibeify.ezzye.chatgpt.site](https://dsh-vibeify.ezzye.chatgpt.site).
2. Download and unzip **DSH-Vibeify-Installer-macOS.zip**.
3. Double-click **Install DSH Vibeify.command**. If macOS blocks an unsigned community script, right-click it, choose **Open**, and review the prompt.
4. Choose DeepSeek only, ChatGPT only, both with DeepSeek leading, or connect later.

The helper checks Node.js, downloads the public GitHub repository, installs or updates the qualified `@deepseek-ai/dsh` version pinned by this compatibility bundle, installs an immutable Vibeify snapshot, runs non-billing checks, and opens the local Web UI. It never requests an API key or account password. The combined option keeps DeepSeek in the lead and uses ChatGPT-authenticated Codex only for optional bounded work.

If a supported Node.js is missing, the helper opens the official Node.js download page and stops. DSH currently requires Node.js 22.19 or later in the 22.x line, or Node.js 24 or later. Install Node, then run it again.

If DSH is already running, the helper asks you to confirm that active work is finished before stopping the verified DSH process. Declining leaves software and profile files unchanged; after confirmation, it installs the update and opens the verified local page. The installer does not print the local access token.

## Friendly Windows preview

1. Download the Windows preview ZIP from the project release artifacts and compare it with `SHA256SUMS`.
2. Extract it. Double-click **Install DSH Vibeify Windows.cmd**. Its execution-policy override applies only to that one process; it does not weaken the machine-wide PowerShell policy.
3. Choose DeepSeek only, ChatGPT only, both with DeepSeek leading, or connect later.

The PowerShell implementation downloads a fresh public repository copy, runs a cross-platform source check, installs the official npm DSH package, creates and validates an immutable Vibeify package, composes the selected profile, and opens the loopback page. If DSH is already open, it stops before changing global software or profile files and asks you to finish active work, close DSH, and rerun the installer. This implementation must not be described as verified until the workflow has passed on a real Windows x64 or arm64 machine.

## Friendly Linux preview

1. Download the Linux preview ZIP from the project release artifacts and compare it with `SHA256SUMS`.
2. Extract it, then make only the installer executable: `chmod +x ./install-dsh-vibeify-linux.sh`.
3. Run `./install-dsh-vibeify-linux.sh` and choose DeepSeek only, ChatGPT only, both with DeepSeek leading, or connect later.

Do not run it with `sudo`. The installer downloads a fresh public repository copy, uses the existing immutable package installer and doctor, starts DSH only when its local port is free, and stops before changing global software or profile files if DSH is already open. Finish active work, close DSH, then rerun the installer. Linux remains preview until the complete path passes on representative Debian/Ubuntu and Fedora-family machines.

## Choose a provider mode

| Mode | Installed package | Lead | Account setup |
| --- | --- | --- | --- |
| DeepSeek only | `dsh-vibeify-experience` | Native DSH/DeepSeek agent | Add a DeepSeek key under **Settings → Models** |
| ChatGPT only | `dsh-vibeify` | ChatGPT-authenticated Codex | Complete the official `codex login` browser flow |
| Both: DeepSeek leads, OpenAI supports | `dsh-vibeify-experience` plus `dsh-vibeify-deepseek` | Native DeepSeek; optional GPT-6.1 Sol worker | Connect DeepSeek under **Settings → Models**; sign in to ChatGPT if you want the worker |

The provider-neutral package installs only the Vibe browser experience, so it does not replace DSH's native DeepSeek provider or show Codex-only capability controls. The Codex-led package adds the Codex provider, capability settings, progress controls, and bounded DeepSeek delegation. The DeepSeek-led bundle adds a separate preset with the optional native Codex worker; the original Standard preset remains available.

DeepSeek API use and ChatGPT plan usage are separate. Installation itself makes no paid model call. The two-worker limit is prompt policy rather than a hard technical cap.

## DeepSeek-led with OpenAI support

The `deepseek-codex` mode uses the provider-neutral magazine plus the optional `dsh-vibeify-deepseek` routing bundle. DeepSeek V4.1 Flash 1017 (`deepseek-flash`) is the lead. GPT-6.1 Sol (`gpt-6.1-sol`) runs only when DeepSeek calls the bounded `subagent_codex` tool, using the existing ChatGPT login. DeepSeek reviews worker evidence and owns the final answer. The original Standard preset remains available; new sessions default to the separate Vibeify DeepSeek preset.

From a checked-out 0.17.1 source tree, finish active DSH work, then run:

```sh
./scripts/install-dsh.sh --replace
./scripts/activate-vibeify.sh --confirmed-idle --provider deepseek-codex
```

The qualified versions are DSH `0.2.1-rc.2` and Codex `0.164.0`. The installer aligns the whole profile, keeps the launcher and profile on one physical bootstrap, and pins the native Codex worker's payload to that qualified Codex version. It backs up settings before changing the default model and preset. Existing private conversations are not submitted or resumed by installation. Use a fresh session to adopt the new preset; existing sessions retain their own composition.

The native Codex worker uses `approve-for-me`: workspace-write sandboxing and Codex automatic permission review. It does not use the dangerous sandbox bypass. Human input and protected connected-app requests are unavailable to this unattended worker and fail closed; perform those actions through the lead's normal confirmation flow. The two-worker bound is a routing instruction, not a programmatic quota cap. DeepSeek API usage and ChatGPT usage remain separate.

## Developer installation

Requirements:

- macOS 14+ on Apple silicon, Windows 10/11, or a current desktop Linux supported by the official DSH npm route;
- Node.js 22.19+ in the 22.x line, or Node.js 24+, and npm;
- Git;
- a DeepSeek account for a DeepSeek-led mode; ChatGPT sign-in only if you choose the Codex lead or want the optional Codex worker.

The 0.17.1 release uses this qualified compatibility bundle:

- `@deepseek-ai/dsh` `0.2.1-rc.2` (qualified on 26 October 2026);
- `@openai/codex` `0.164.0` inside the governed bridge and native worker;
- DSH Vibeify `0.17.1`.

The full current release CI is pending. Windows and Linux remain preview until tested on real machines. See the [0.17.1 release note](releases/0.17.1.md) for the available checks and evidence limits.

The optional `@deepseek-ai/dsh-subagent-codex` worker uses the native Codex app-server protocol and the profile's ChatGPT sign-in. The qualified package pins its payload to Codex `0.164.0`; the installer aligns it with DSH `0.2.1-rc.2`.

To add only the provider-neutral Vibe experience to an existing DSH Web
profile, use the versioned package path:

```bash
dsh plugin --profile web add --workspace-root 'github:N9-Developer-Empowerment/DSH-Vibeify#v0.17.1&path:/plugins/dsh-vibeify-experience'
```

This keeps native DSH/DeepSeek in the lead. To add optional GPT-6.1 Sol support,
also install the DeepSeek-led bundle from the same release:

```bash
dsh plugin --profile web add --workspace-root 'github:N9-Developer-Empowerment/DSH-Vibeify#v0.17.1&path:/plugins/dsh-vibeify-deepseek'
```

The friendly installer configures the default preset and worker together. Use
the full developer route below for the complete setup.

Clone and install:

```bash
git clone https://github.com/N9-Developer-Empowerment/DSH-Vibeify.git
cd DSH-Vibeify
./scripts/install-dsh.sh --replace
./scripts/install-vibeify.sh --provider deepseek-codex
./scripts/doctor.sh
dsh web
```

Use `--provider deepseek` for DeepSeek only. Use `--provider chatgpt` for the original Codex-led mode after `codex login`. Use `--provider auto` to preserve an installed mode or select from the current account/profile state.

The scripts honour `DSH_PROFILE` for a profile other than `web`:

```bash
DSH_PROFILE=my-profile ./scripts/install-vibeify.sh --provider deepseek
```

## Connect DeepSeek

Create or open an account at [platform.deepseek.com](https://platform.deepseek.com/). Start DSH, open **Settings → Models**, and enter the DeepSeek credential there. Do not put the key in the repository, command history, screenshots, or support logs.

In both DeepSeek modes, native DSH/DeepSeek is the lead. In `deepseek-codex` mode it may delegate bounded tasks to GPT-6.1 Sol and then review the returned evidence. The worker does not own the final answer.

## Connect ChatGPT

```bash
npm install --global @openai/codex@latest
codex login
codex login status
./scripts/install-vibeify.sh --provider chatgpt
```

Complete the browser login with the ChatGPT account whose Codex access you want to use. Do not use `--with-api-key`: the bridge deliberately accepts ChatGPT authentication only and removes `OPENAI_API_KEY` and `OPENAI_API_KEY_PATH` from its child process. In `deepseek-codex` mode, this login authorizes the optional one-shot worker; DeepSeek remains the lead.

In DSH, open **Settings → Codex**, choose **Main Codex model** and **Thinking effort**, then **Save selection**. Models come from your signed-in account; only visible models with image support and supported thinking efforts are offered. Use **Reload available models** after an account or availability change. The page distinguishes the saved choice for the next turn from running Codex turns. Saving applies to the next turn in existing and new chats without interrupting active work. Luna Max remains the initial default in ChatGPT-only mode. This page selects the lead only in that Codex-led mode; it does not change the fixed GPT-6.1 Sol worker model in DeepSeek-led mode. Legacy Efficient, Balanced, Frontier and Maximum settings still resolve for compatibility; duplicate preset cards are no longer shown.

## Add optional image-source keys

The friendly installers also add the separate `dsh-visuals` package. Wikimedia Commons and Openverse work immediately without an account. For a wider photographic catalogue, create keys on the official [Pexels API](https://www.pexels.com/api/) and [Pixabay API](https://pixabay.com/api/docs/) pages, then open DSH **Settings → Images** and paste each key into its named password field.

Choose **Save key**. The field clears after writing because DSH never returns a stored key to the browser; the badge changes to **Configured**. Leaving a field blank keeps its current key. **Remove key** is the only clearing action. Never put either key in the repository, a shell command, a screenshot, an article, a support report or an online chat.

Developer or older manual installations can add the optional package separately:

```bash
dsh plugin --profile web add --workspace-root ./plugins/dsh-visuals
```

If `dsh-visuals` is absent or every source is unavailable, Vibeify keeps its built-in unique cover method and remains fully readable.

Use **Check image sources** on the Images page to test a short public sample search. It reports which providers responded and shows a decoded, credited photograph when one is suitable. **Configured** means a key is stored; the source check verifies that its provider responds. The check never changes keys or starts AI image generation.

## Manual link sharing

The relaunch requires no social account setup. Copy a public link or use the device’s share action, and make the final post yourself. A private article still requires preview and **Publish public link** before its URL becomes public.

The installer updates the legacy `dsh-social-desk` compatibility package so previous scheduled jobs cannot resume. Historical queue data and credentials are preserved; automatic publishing and schedule controls are disabled. See [Sharing](SHARING.md).

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

Choose the platform-appropriate updater or download and run the current friendly installer again. The macOS helper asks for idle confirmation before changing the global DSH runtime or profile. After confirmation it stops only the verified DSH web process, installs and checks the update, then opens the authenticated local page. Windows and Linux preview installers stop before changing software or profile files while DSH is running; finish active work, close DSH, and rerun the installer. Developers can run:

```bash
git pull --ff-only
./scripts/install-dsh.sh --replace
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
dsh plugin --profile web remove --workspace-root dsh-visuals
dsh plugin --profile web remove --workspace-root dsh-social-desk
```

Removing Vibeify does not delete DSH sessions, Codex authentication, DeepSeek credentials, or browser-stored Vibe preferences.

## Optional Codex helper plugin

This repository also contains a Codex helper skill for installation and diagnosis. It is not the DSH runtime package:

```bash
codex plugin marketplace add /absolute/path/to/DSH-Vibeify
codex plugin add dsh-vibeify@dsh-vibeify
```

Start a new Codex task after installation so the skill is discovered cleanly.

### New-session errors after a runtime upgrade

A `tool "subagent" is already registered` error can indicate two physical copies of
`dsh-scope`, even when both advertise the same version. Its private scope markers
are module-local. A tool service from one copy cannot recognise an agent scope
created by the other, so a session tool can incorrectly enter the global registry.

The installer aligns the profile's loader-visible runtime entries from the
qualified upstream base/web bundle manifests, installs them into one dependency
graph, then checks scope identity across agents, presets, tools and delegation.
It preserves the selected bundles and model settings. `scripts/doctor.sh` checks
this identity too. A composed-config or HTTP startup check alone does not prove
that sessions work: verify multiple new sessions after an idle activation.
