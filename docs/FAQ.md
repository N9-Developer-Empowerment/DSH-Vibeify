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

## The Mac says it cannot open the installer

The community installer is readable source code, but it is not Apple-notarized. First verify that it came from the [DSH Vibeify information site](https://dsh-vibeify.ezzye.chatgpt.site/) or the [public GitHub project](https://github.com/N9-Developer-Empowerment/DSH-Vibeify). In Finder, Control-click **Install DSH Vibeify.command**, choose **Open**, read the warning, and choose **Open** only if the source is correct.

Do not disable macOS security globally.

## Windows blocks the PowerShell file

The preview installer is not code-signed. Verify the download against the published SHA-256 file before opening it. Extract the ZIP, right-click **Install DSH Vibeify.ps1**, choose **Properties**, select **Unblock** when that option is present, then run it from PowerShell. Do not change the machine-wide execution policy and do not paste an internet command directly into an administrator terminal.

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

An already-running DSH process keeps the bundle it loaded at launch. The installers never silently stop active work. Finish the current Chat task, close DSH, run the installer again if it asked you to, and reopen `http://127.0.0.1:3080/`. A staged update is not the same as an activated update.

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
