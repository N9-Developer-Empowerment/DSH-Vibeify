#!/bin/bash
set -euo pipefail

REPOSITORY_ARCHIVE="https://github.com/N9-Developer-Empowerment/DSH-Vibeify/archive/refs/heads/main.zip"
FAQ_URL="https://github.com/N9-Developer-Empowerment/DSH-Vibeify/blob/main/docs/FAQ.md"
PROFILE="web"
PORT="${DSH_PORT:-3080}"
check_only=false
if [[ "${1:-}" == "--check" ]]; then
  check_only=true
elif [[ $# -gt 0 ]]; then
  printf 'Usage: %s [--check]\n' "$0" >&2
  exit 2
fi

say() { printf '\n%s\n' "$1"; }
pause_before_close() {
  if [[ -t 0 ]]; then read -r -p "Press Return to close... " _; fi
}
show_help() {
  printf '\nHelp: %s\n' "$FAQ_URL"
  printf 'Free chat help: DeepSeek https://chat.deepseek.com/ · ChatGPT https://chatgpt.com/ · Gemini https://gemini.google.com/\n'
  printf 'Never paste an API key, password, cookie, token, private prompt, DSH profile, or full log into a support chat.\n'
}
fail() {
  printf '\nInstallation stopped: %s\n' "$1" >&2
  show_help
  pause_before_close
  exit 1
}

clear
printf '╭──────────────────────────────────────────────╮\n'
printf '│          Install or update DSH Vibeify       │\n'
printf '╰──────────────────────────────────────────────╯\n'
printf '\nThis helper downloads open-source code from GitHub, installs the latest\n'
printf 'official DeepSeek Harness release, adds Vibeify, checks it, and opens it.\n'
printf 'No account password or API key is requested by this installer.\n'

if [[ "$(uname -s)" != "Darwin" ]]; then
  fail "This friendly installer currently supports macOS. The GitHub guide covers other systems."
fi
for command_name in curl unzip npm node; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    if [[ "$command_name" == "node" || "$command_name" == "npm" ]]; then
      open "https://nodejs.org/en/download"
      fail "Node.js 22 or newer is needed. Its official download page has been opened; install it, then run this helper again."
    fi
    fail "$command_name is missing from this Mac."
  fi
done

if ! node -e 'const [major,minor]=process.versions.node.split(".").map(Number);process.exit((major===22&&minor>=19)||major>=24?0:1)'; then
  open "https://nodejs.org/en/download"
  fail "DSH needs Node.js 22.19 or later in the 22.x line, or Node.js 24 or later; this Mac has $(node --version)."
fi

temporary_directory="$(mktemp -d -t dsh-vibeify-download.XXXXXX)"
trap 'rm -rf "$temporary_directory"' EXIT
archive="$temporary_directory/dsh-vibeify.zip"

if [[ -n "${DSH_VIBEIFY_SOURCE_DIRECTORY:-}" ]]; then
  project_directory="$DSH_VIBEIFY_SOURCE_DIRECTORY"
  [[ -d "$project_directory/plugins/dsh-vibeify" ]] || fail "The supplied Vibeify source directory is not a valid checkout."
  say "Checking the supplied Vibeify source checkout..."
else
  say "Downloading the latest Vibeify source from the public GitHub project..."
  curl --fail --location --retry 3 --connect-timeout 15 --output "$archive" "$REPOSITORY_ARCHIVE" || fail "The public Vibeify download could not be reached. Check the internet connection and try again."
  unzip -q "$archive" -d "$temporary_directory" || fail "The downloaded ZIP could not be opened. Download it again rather than bypassing the check."
  project_directory="$temporary_directory/DSH-Vibeify-main"
  [[ -d "$project_directory" ]] || fail "The downloaded Vibeify archive had an unexpected layout."
fi
chmod +x "$project_directory/scripts/install-dsh.sh" "$project_directory/scripts/install-vibeify.sh" "$project_directory/scripts/doctor.sh"
if [[ -f "$project_directory/scripts/installer-self-check.mjs" ]]; then
  node "$project_directory/scripts/installer-self-check.mjs" "$project_directory" || fail "The download failed its source checks. Do not install it."
else
  "$project_directory/scripts/doctor.sh" --source || fail "The download failed its source checks. Do not install it."
fi
if [[ "$check_only" == true ]]; then
  say "The macOS downloader check passed. Nothing was installed, no profile changed, and no model was called."
  exit 0
fi

printf '\nChoose how you want the AI side to work:\n'
printf '  1. DeepSeek only — connect a DeepSeek account inside DSH\n'
printf '  2. ChatGPT only — sign in with ChatGPT now\n'
printf '  3. Both — Codex leads; DeepSeek handles suitable work\n'
printf '  4. Install first and connect an account later\n'
read -r -p "Choice [1]: " account_choice
account_choice="${account_choice:-1}"

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
"$project_directory/scripts/install-dsh.sh" --latest || fail "DeepSeek Harness could not be installed. The FAQ explains Node and npm permission problems."

say "Installing or updating Vibeify..."
"$project_directory/scripts/install-vibeify.sh" --provider "$provider_mode" || fail "Vibeify could not be added to the DSH profile."

say "Checking the installation without making a paid model call..."
"$project_directory/scripts/doctor.sh" || fail "The installation completed but did not pass its non-billing checks."

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  printf '\nDSH is already open. Finish any active task before continuing.\n'
  read -r -p "When DSH is idle, type YES to restart it safely: " restart_answer
  if [[ "$restart_answer" != "YES" ]]; then
    say "The update is installed but not activated. Re-run this helper when DSH is idle."
    pause_before_close
    exit 0
  fi
  node "$project_directory/scripts/dsh-restart.mjs" queue --confirmed-idle --delay-ms 1000 --profile "$PROFILE" --port "$PORT" >/dev/null
  for _ in $(seq 1 40); do
    sleep 1
    restart_state="$(node "$project_directory/scripts/dsh-restart.mjs" status 2>/dev/null || true)"
    if [[ "$restart_state" == *'"state": "succeeded"'* ]]; then break; fi
    if [[ "$restart_state" == *'"state": "failed"'* ]]; then fail "The safe restart check failed. Run the helper again or use the GitHub support guide."; fi
  done
else
  mkdir -p "$HOME/.dsh/logs"
  nohup env -u OPENAI_API_KEY -u OPENAI_API_KEY_PATH dsh --profile "$PROFILE" --no-open --host 127.0.0.1 --port "$PORT" \
    </dev/null >>"$HOME/.dsh/logs/dsh-web.log" 2>&1 &
  for _ in $(seq 1 40); do
    if curl --silent --fail --max-time 2 "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then break; fi
    sleep 1
  done
fi

if ! curl --silent --fail --max-time 2 "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
  fail "DSH was installed but did not become ready. The log is at $HOME/.dsh/logs/dsh-web.log."
fi

open "http://127.0.0.1:$PORT/"
say "DSH Vibeify is ready."
if [[ "$account_choice" == "1" || "$account_choice" == "3" ]]; then
  printf 'In DSH, open Settings → Models to connect DeepSeek.\n'
elif [[ "$account_choice" == "4" ]]; then
  printf 'You can browse Vibe now. Connect DeepSeek or ChatGPT before asking the agent to work.\n'
fi
printf 'Updates are safe to run again: download the current helper and repeat these steps.\n'
show_help
pause_before_close
