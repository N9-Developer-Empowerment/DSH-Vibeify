#!/bin/bash
set -euo pipefail

REPOSITORY_ARCHIVE="https://github.com/N9-Developer-Empowerment/DSH-Vibeify/archive/refs/heads/main.zip"
PROFILE="web"
PORT="3080"

say() { printf '\n%s\n' "$1"; }
fail() {
  printf '\nInstallation stopped: %s\n' "$1" >&2
  printf 'This window will stay open so you can read the message.\n'
  read -r -p "Press Return to close... " _
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

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$node_major" -lt 22 ]]; then
  open "https://nodejs.org/en/download"
  fail "Node.js 22 or newer is needed; this Mac has $(node --version)."
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
    npm install --global @openai/codex@latest
  fi
  if [[ "$(codex login status 2>&1 || true)" != *"Logged in using ChatGPT"* ]]; then
    say "Your browser will open for ChatGPT sign-in. Return here when it finishes."
    codex login
  fi
fi

temporary_directory="$(mktemp -d -t dsh-vibeify-download.XXXXXX)"
trap 'rm -rf "$temporary_directory"' EXIT
archive="$temporary_directory/dsh-vibeify.zip"

say "Downloading the latest Vibeify source from the public GitHub project..."
curl --fail --location --retry 3 --connect-timeout 15 --output "$archive" "$REPOSITORY_ARCHIVE"
unzip -q "$archive" -d "$temporary_directory"
project_directory="$temporary_directory/DSH-Vibeify-main"
[[ -d "$project_directory" ]] || fail "The downloaded Vibeify archive had an unexpected layout."
chmod +x "$project_directory/scripts/install-dsh.sh" "$project_directory/scripts/install-vibeify.sh" "$project_directory/scripts/doctor.sh"

say "Installing or updating DeepSeek Harness..."
"$project_directory/scripts/install-dsh.sh" --latest

say "Installing or updating Vibeify..."
"$project_directory/scripts/install-vibeify.sh" --provider "$provider_mode"

say "Checking the installation without making a paid model call..."
"$project_directory/scripts/doctor.sh"

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  printf '\nDSH is already open. Finish any active task before continuing.\n'
  read -r -p "When DSH is idle, type YES to restart it safely: " restart_answer
  if [[ "$restart_answer" != "YES" ]]; then
    say "The update is installed but not activated. Re-run this helper when DSH is idle."
    read -r -p "Press Return to close... " _
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
read -r -p "Press Return to close this installer... " _
