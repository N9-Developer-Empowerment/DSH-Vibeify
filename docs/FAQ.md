# Installation and help FAQ

This page is for people who want to use DSH Vibeify without becoming terminal experts. The installer never needs an AI password or API key. DSH asks for provider details later, inside its own settings or the provider's official sign-in page.

## Which download should I use?

| Computer | Download | Current confidence |
| --- | --- | --- |
| Apple-silicon Mac, macOS 14 or newer | `DSH-Vibeify-Installer-macOS.zip` | Tested on a real Apple-silicon Mac, including the public download, archive integrity, source validation, and an isolated installer-flow simulation. |
| Windows 10/11, x64 or arm64 | `DSH-Vibeify-Installer-Windows.zip` | Preview. The PowerShell source and cross-platform contracts are checked, but this release still needs a real Windows-machine installation run before it is labelled fully verified. |
| Current desktop Linux, x64 or arm64 | `DSH-Vibeify-Installer-Linux.zip` | Preview. The shell syntax and cross-platform contracts are checked, but each distribution still needs a real-machine installation run before it is labelled fully verified. |

DeepSeek Harness itself is a fast-moving developer preview. Its official npm route uses Node.js and is intended to be cross-platform. Vibeify nevertheless labels its own platform evidence separately: a working Mac does not prove that Windows or every Linux distribution works.

## Can I check a download without installing anything?

Yes. Each installer has a check-only mode. It downloads a fresh copy of the public repository, checks its expected files and JavaScript, and exits without installing DSH, changing a profile, signing in, restarting anything, or making a model call.

On macOS:

```bash
./Install\ DSH\ Vibeify.command --check
```

On Windows PowerShell:

```powershell
& '.\Install DSH Vibeify.ps1' -Check
```

On Linux:

```bash
./install-dsh-vibeify-linux.sh --check
```

## The Mac says it cannot verify the installer

The downloaded community `.command` file is unsigned and not Apple-notarized. Package/source checks do not make it Apple-trusted. Use the [update page](https://dsh-vibeify.ezzye.chatgpt.site/#update): choose macOS, copy the displayed command, open Terminal and paste it. The command downloads the published installer, verifies its SHA-256 before running it with Bash, and asks you to confirm idle work before stopping DSH. It does not remove quarantine or disable Gatekeeper.

If you prefer the downloaded file, verify its source and follow [Apple's instructions](https://support.apple.com/102445) in **System Settings → Privacy & Security** for that specific file. Only approve it after reviewing the named installer. If the warning says malware was detected, stop and contact support.

## Windows blocks the installer

Use the [update page](https://dsh-vibeify.ezzye.chatgpt.site/#update): choose Windows, copy its command into a normal PowerShell window, and read the prompts. It downloads and checks the published ZIP before opening the existing installer launcher. It uses the current user's installation rather than requesting an administrator account. Windows or a managed device can still require approval of an unsigned download; no automatic updater can promise to overrule an organisation's policy.

The existing CMD launcher starts a separate PowerShell process with its installer-only execution policy. It does not change the machine-wide policy or disable SmartScreen/Defender. If a Windows security warning appears, review the named file and the public source before choosing whether to allow it. Do not disable machine-wide protection. Managed devices may require your administrator's approval.

## Windows says updates could not be checked

Vibeify 0.16.4/0.16.5 tried to run `dsh --version` as a subprocess. Windows command wrappers and launcher-specific PATHs can make that fail even while DSH works. Vibeify 0.16.6 reads the running DSH package instead. Use the public update page once to install the fix; thereafter **Settings → Updates → Check again** works without launching a command wrapper. The update guide remains available even if a check fails.

## Linux says “permission denied”

After extracting the official ZIP, make only the installer executable:

```bash
chmod +x ./install-dsh-vibeify-linux.sh
./install-dsh-vibeify-linux.sh
```

The installer should not be run with `sudo`. If npm cannot write its user-level global package location, install Node.js with the distribution's supported method or a user-level Node version manager, then try again.

## It says Node.js is missing or too old

Use the [official Node.js download page](https://nodejs.org/en/download). DSH currently requires Node.js 22.19 or later in the 22.x line, or Node.js 24 or later. Close and reopen the installer after Node finishes installing.

## DSH was updated but the page still looks old

An already-running DSH process keeps the bundle it loaded at launch. On Windows and macOS, the installer asks you to confirm idle work before stopping an identified DSH process and changing files; declining leaves the installation unchanged. Finish the current Chat task before confirming. Linux requires you to close DSH before updating. After the update it opens the authenticated local page without printing its access token.

## The page at 127.0.0.1:3080 does not open

Wait up to one minute after a new installation, then try the address again. If it still fails, create the privacy-safe report below. Do not post the complete DSH log publicly: logs can contain prompts, filenames, or tool output.

```bash
node scripts/support-report.mjs --prompt
```

## DeepSeek or ChatGPT does not answer

Installation and provider connection are separate. Open **Settings → Models** in DSH to connect DeepSeek, or complete the official `codex login` browser flow for ChatGPT/combined mode. At least one working provider is needed before Chat can do AI work. Never paste a provider key into a support chat, screenshot, issue, or terminal command suggested by a stranger.

## How do I get better photographs in Vibe?

Vibeify 0.15.6 installs the separate, optional **DSH Visuals** plugin. Wikimedia Commons and Openverse work without an account. For a wider photographic catalogue, open **Settings → Images**, follow the official **Get a free API key** link for Pexels or Pixabay, and paste the issued key directly into that provider's password field.

Choose **Save key**. The field clears because DSH stores the key locally and never reads its value back into the page; only the **Configured** status is shown. A blank field keeps the current key, while **Remove key** is a separate explicit action. Never send an image-provider key through Chat or include it in a screenshot or support report.

The plugin searches only a short title from an explicit magazine page. It does not send the article body, prompt, attachment, Chat history, preferences or existing images. Every accepted result retains the original creator, licence and source page. If the plugin is absent, a provider is unavailable or no suitable result exists, Vibeify keeps the unique local editorial cover instead of reusing unrelated stock.

## Can a free AI chat help me?

Yes. Installation help does not require the paid account used by DSH. You can use [DeepSeek Chat](https://chat.deepseek.com/), [ChatGPT](https://chatgpt.com/), or [Google Gemini](https://gemini.google.com/) where the service is available to you. Free access, accounts, regional availability, and message limits are controlled by those services and can change.

Start with this request:

```text
I am trying to install or update the open-source DSH Vibeify plugin. Please help me diagnose the problem step by step, using official DSH Vibeify, DeepSeek Harness, Node.js, OpenAI, or Google documentation where possible.

Operating system: [Mac / Windows / Linux and version]
Processor: [Apple silicon / Intel or AMD / ARM]
What I clicked or ran: [the step]
Exact error message: [paste only the error]

Important privacy rule: do not ask me to paste API keys, passwords, cookies, OAuth tokens, .credentials.yaml, private prompts, session transcripts, or the contents of my DSH profile. If more evidence is needed, tell me how to collect a redacted diagnostic.
```

The repository's `node scripts/support-report.mjs --prompt` command fills in the basic machine and command versions without reading credentials, account details, file paths, prompts, sessions, or profile contents.

## What is safe to share when asking for help?

Usually safe:

- operating system and processor type;
- Node.js, npm, DSH, Codex, and Vibeify version numbers;
- the controlled error displayed by an installer;
- whether `http://127.0.0.1:3080/` is reachable.

Keep private:

- API keys, passwords, cookies, tokens, login URLs, QR codes, and account identifiers;
- `.credentials.yaml`, complete DSH profiles, browser storage, session files, and support archives you have not inspected;
- private prompts, attachments, filenames, tool output, and full logs.

## I am still stuck

Use the safe prompt above in one of the three chat services, open a GitHub discussion with only the redacted report and controlled error, or email [info@codingforjustice.org.uk](mailto:info@codingforjustice.org.uk). Do not attach complete logs or include passwords, API keys, cookies, OAuth tokens, private prompts, session exports, or other account data. DSH Vibeify is an independent community project, not an official DeepSeek, OpenAI, or Google product.
