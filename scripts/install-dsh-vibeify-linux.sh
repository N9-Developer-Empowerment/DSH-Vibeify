#!/usr/bin/env bash
set -euo pipefail

repository_archive="https://github.com/N9-Developer-Empowerment/DSH-Vibeify/archive/refs/heads/main.zip"
faq_url="https://github.com/N9-Developer-Empowerment/DSH-Vibeify/blob/main/docs/FAQ.md"
profile="${DSH_PROFILE:-web}"
port="${DSH_PORT:-3080}"
check_only=false

if [[ "${1:-}" == "--check" ]]; then
  check_only=true
elif [[ $# -gt 0 ]]; then
  printf 'Usage: %s [--check]\n' "$0" >&2
  exit 2
fi

pause_before_close() {
  if [[ -t 0 ]]; then read -r -p "Press Return to close... " _; fi
}

show_help() {
  printf '\nHelp: %s\n' "$faq_url"
  printf 'Free chat help: DeepSeek https://chat.deepseek.com/ · ChatGPT https://chatgpt.com/ · Gemini https://gemini.google.com/\n'
  printf 'Never paste an API key, password, cookie, token, private prompt, DSH profile, or full log into a support chat.\n'
}

fail() {
  printf '\nInstallation stopped: %s\n' "$1" >&2
  show_help
  pause_before_close
  exit 1
}

say() { printf '\n%s\n' "$1"; }
local_dsh_responds() {
  curl --silent --output /dev/null --max-time 2 "http://127.0.0.1:$port/"
}

if [[ "$(uname -s)" != "Linux" ]]; then
  fail "This installer is for Linux. Use the macOS or Windows download for another system."
fi

for command_name in curl unzip npm node; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    fail "$command_name is missing. Install Node.js from https://nodejs.org/en/download and your distribution's curl and unzip packages, then retry."
  fi
done

if ! node -e 'const [major,minor]=process.versions.node.split(".").map(Number);process.exit((major===22&&minor>=19)||major>=24?0:1)'; then
  fail "DSH needs Node.js 22.19 or later in the 22.x line, or Node.js 24 or later; this computer has $(node --version)."
fi

temporary_directory="$(mktemp -d -t dsh-vibeify-download.XXXXXX)"
trap 'rm -rf "$temporary_directory"' EXIT
archive="$temporary_directory/dsh-vibeify.zip"

say "Downloading the latest Vibeify source from the public GitHub project..."
curl --fail --location --retry 3 --connect-timeout 15 --output "$archive" "$repository_archive" || fail "The public Vibeify download could not be reached. Check the internet connection and try again."
unzip -q "$archive" -d "$temporary_directory" || fail "The downloaded ZIP could not be opened. Download it again rather than bypassing the check."
project_directory="$temporary_directory/DSH-Vibeify-main"
[[ -d "$project_directory" ]] || fail "The downloaded Vibeify archive had an unexpected layout."
chmod +x "$project_directory/scripts/install-dsh.sh" "$project_directory/scripts/install-vibeify.sh" "$project_directory/scripts/doctor.sh"

if [[ -f "$project_directory/scripts/installer-self-check.mjs" ]]; then
  node "$project_directory/scripts/installer-self-check.mjs" "$project_directory" || fail "The download failed its source checks. Do not install it."
else
  "$project_directory/scripts/doctor.sh" --source || fail "The download failed its source checks. Do not install it."
fi
if [[ "$check_only" == true ]]; then
  say "The Linux downloader check passed. Nothing was installed, no profile changed, and no model was called."
  exit 0
fi

# Global npm upgrades and profile installs replace files used by a running
# DSH process. Defer the complete update until DSH has been closed.
if local_dsh_responds; then
  fail "DSH is already open. No software or profile files were changed. Finish active work, close DSH, then run this installer again to install the update."
fi

# DSH's plugin installation depends on pnpm overrides and build-script policy.
# Keep the qualified pnpm isolated under this user's DSH home rather than
# changing the system or global npm installation.
qualified_pnpm_version="10.34.6"
dsh_home="${DSH_HOME:-$HOME/.dsh}"
pnpm_directory="$dsh_home/tools/pnpm"
pnpm_command="$pnpm_directory/node_modules/.bin/pnpm"
installed_pnpm_version=""
if [[ -x "$pnpm_command" ]]; then
  installed_pnpm_version="$("$pnpm_command" --version)" || fail "The existing user-local pnpm could not be checked."
fi
if [[ "$installed_pnpm_version" != "$qualified_pnpm_version" ]]; then
  say "Installing the qualified pnpm version in the DSH user directory..."
  mkdir -p "$pnpm_directory" || fail "The DSH user tools directory could not be created."
  npm install --prefix "$pnpm_directory" --no-save "pnpm@$qualified_pnpm_version" || fail "The qualified pnpm version could not be installed in the DSH user directory."
  installed_pnpm_version="$("$pnpm_command" --version)" || fail "The qualified pnpm installation could not be verified."
  if [[ "$installed_pnpm_version" != "$qualified_pnpm_version" ]]; then
    fail "pnpm version verification failed: expected $qualified_pnpm_version, found $installed_pnpm_version."
  fi
fi
export PATH="$pnpm_directory/node_modules/.bin:$PATH"

printf '\nChoose how you want the AI side to work:\n'
printf '  1. DeepSeek only — connect a DeepSeek account inside DSH\n'
printf '  2. ChatGPT only — sign in with ChatGPT now\n'
printf '  3. Both — Codex leads; DeepSeek handles suitable work\n'
printf '  4. Install first and connect an account later\n'
default_choice="1"
profile_package="${DSH_HOME:-$HOME/.dsh}/profiles/$profile/package.json"
if [[ -f "$profile_package" ]] && node -e 'const p=require(process.argv[1]);process.exit(p.dependencies?.["dsh-vibeify"]?0:1)' "$profile_package"; then
  default_choice="2"
fi
read -r -p "Choice [$default_choice]: " account_choice
account_choice="${account_choice:-$default_choice}"

provider_mode="deepseek"
if [[ "$account_choice" == "2" || "$account_choice" == "3" ]]; then
  provider_mode="chatgpt"
  if ! command -v codex >/dev/null 2>&1; then
    say "Installing the official Codex command so ChatGPT can be connected..."
    npm install --global @openai/codex@latest || fail "Codex could not be installed. The FAQ explains safe npm permission fixes."
  fi
  if [[ "$(codex login status 2>&1 || true)" != *"Logged in using ChatGPT"* ]]; then
    say "Your browser will open for ChatGPT sign-in. Return here when it finishes."
    codex login || fail "ChatGPT sign-in did not finish. You can rerun the installer and choose connect later."
  fi
fi
say "Installing or updating DeepSeek Harness..."
"$project_directory/scripts/install-dsh.sh" --replace || fail "DeepSeek Harness could not be installed. The FAQ explains Node and npm permission problems."

say "Installing or updating Vibeify..."
"$project_directory/scripts/install-vibeify.sh" --provider "$provider_mode" || fail "Vibeify could not be added to the DSH profile."

say "Checking the installation without making a paid model call..."
"$project_directory/scripts/doctor.sh" || fail "The installation completed but did not pass its non-billing checks."

node "$project_directory/scripts/start-dsh.mjs" --profile "$profile" --host 127.0.0.1 --port "$port" || fail "DSH could not be started."
server_log="${DSH_HOME:-$HOME/.dsh}/logs/dsh-web.log"
for _ in $(seq 1 40); do
  if node "$project_directory/scripts/dsh-web-readiness.mjs" check "$port" "$server_log"; then break; fi
  sleep 1
done

if ! node "$project_directory/scripts/dsh-web-readiness.mjs" check "$port" "$server_log"; then
  fail "DSH was installed but did not become ready. Use the privacy-safe support report in the FAQ; do not share the whole log."
fi

authenticated_url="$(node "$project_directory/scripts/dsh-web-readiness.mjs" url "$port" "$server_log")" || fail "The local DSH page address could not be read."
if command -v xdg-open >/dev/null 2>&1; then xdg-open "$authenticated_url" >/dev/null 2>&1 || true; fi
say "DSH Vibeify is ready at http://127.0.0.1:$port/."
if [[ "$account_choice" == "1" || "$account_choice" == "3" ]]; then
  printf 'In DSH, open Settings → Models to connect DeepSeek.\n'
elif [[ "$account_choice" == "4" ]]; then
  printf 'You can browse Vibe now. Connect DeepSeek or ChatGPT before asking the agent to work.\n'
fi
printf 'Updates are safe to run again; an open DSH task is never stopped silently.\n'
show_help
pause_before_close
