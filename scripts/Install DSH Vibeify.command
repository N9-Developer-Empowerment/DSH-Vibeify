#!/bin/bash
set -euo pipefail

REPOSITORY_ARCHIVE="https://github.com/N9-Developer-Empowerment/DSH-Vibeify/archive/refs/heads/main.zip"
FAQ_URL="https://github.com/N9-Developer-Empowerment/DSH-Vibeify/blob/main/docs/FAQ.md"
PROFILE="${DSH_PROFILE:-web}"
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
list_listener_pids() {
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | awk 'NF && !seen[$0]++'
}
validate_dsh_listener() {
  local pid process_command
  local -a listener_pids=()
  while IFS= read -r pid; do
    [[ "$pid" =~ ^[0-9]+$ ]] && listener_pids+=("$pid")
  done < <(list_listener_pids)
  if (( ${#listener_pids[@]} == 0 )); then return 0; fi
  if (( ${#listener_pids[@]} != 1 )); then
    fail "More than one process is listening on port $PORT. Nothing was changed; close DSH and try again."
  fi
  pid="${listener_pids[0]}"
  process_command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  if [[ ! "$process_command" =~ (^|[[:space:]/])dsh([[:space:]]|$) ]] \
    || [[ ! "$process_command" =~ (--profile[=[:space:]]|[[:space:]])$PROFILE([[:space:]]|$) && ! "$process_command" =~ [[:space:]]web([[:space:]]|$) ]]; then
    fail "The listener on port $PORT is not the expected DSH web process. Nothing was changed."
  fi
  printf '%s\n' "$pid"
}
stop_confirmed_dsh() {
  local expected_pid="$1"
  local pid process_command
  local -a listener_pids=()
  while IFS= read -r pid; do
    [[ "$pid" =~ ^[0-9]+$ ]] && listener_pids+=("$pid")
  done < <(list_listener_pids)
  if (( ${#listener_pids[@]} != 1 )) || [[ "${listener_pids[0]:-}" != "$expected_pid" ]]; then
    fail "The DSH listener changed after confirmation. Nothing was stopped or installed."
  fi
  pid="$expected_pid"
  process_command="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  if [[ ! "$process_command" =~ (^|[[:space:]/])dsh([[:space:]]|$) ]] \
    || [[ ! "$process_command" =~ (--profile[=[:space:]]|[[:space:]])$PROFILE([[:space:]]|$) && ! "$process_command" =~ [[:space:]]web([[:space:]]|$) ]]; then
    fail "The DSH process changed after confirmation. Nothing was stopped or installed."
  fi
  /bin/kill -TERM "$pid" 2>/dev/null || fail "The confirmed DSH process could not be stopped safely."
  for _ in $(seq 1 60); do
    if ! kill -0 "$pid" 2>/dev/null; then return 0; fi
    sleep 0.25
  done
  fail "The confirmed DSH process did not stop after SIGTERM. No update was installed."
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

if ! command -v lsof >/dev/null 2>&1; then
  fail "lsof is needed to check whether DSH is running safely. Nothing was installed."
fi
if [[ ! "$PROFILE" =~ ^[A-Za-z0-9._-]+$ || ! "$PORT" =~ ^[0-9]+$ ]] || (( PORT < 1 || PORT > 65535 )); then
  fail "The DSH profile or port setting is invalid. Nothing was installed."
fi
active_listener="$(list_listener_pids || true)"
if [[ -n "$active_listener" ]]; then
  active_pid="$(validate_dsh_listener)"
  printf '\nDSH is already open. Finish any active task before continuing.\n'
  read -r -p "When DSH is idle, type YES to stop it before installing the update: " restart_answer
  if [[ "$restart_answer" != "YES" ]]; then
    say "No software or profile changes were made. Run this helper again when DSH is idle."
    pause_before_close
    exit 0
  fi
  stop_confirmed_dsh "$active_pid"
fi

profile_directory="${DSH_HOME:-$HOME/.dsh}/profiles/$PROFILE"
existing_provider="$(node -e 'const fs=require("node:fs");try{const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(p.dependencies?.["dsh-vibeify"])process.stdout.write("chatgpt");else if(p.dependencies?.["dsh-vibeify-experience"])process.stdout.write("deepseek")}catch{}' "$profile_directory/package.json")"
default_choice="1"
if [[ "$existing_provider" == "chatgpt" ]]; then default_choice="2"; fi

printf '\nChoose how you want the AI side to work:\n'
printf '  1. DeepSeek only — connect a DeepSeek account inside DSH\n'
printf '  2. ChatGPT only — sign in with ChatGPT now\n'
printf '  3. Both — Codex leads; DeepSeek handles suitable work\n'
printf '  4. Install first and connect an account later\n'
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

node "$project_directory/scripts/start-dsh.mjs" --profile "$PROFILE" --host 127.0.0.1 --port "$PORT" || fail "DSH could not be started."
server_log="${DSH_HOME:-$HOME/.dsh}/logs/dsh-web.log"
for _ in $(seq 1 40); do
  if node "$project_directory/scripts/dsh-web-readiness.mjs" check "$PORT" "$server_log"; then break; fi
  sleep 1
done

if ! node "$project_directory/scripts/dsh-web-readiness.mjs" check "$PORT" "$server_log"; then
  fail "DSH was installed but did not become ready. The log is at $server_log."
fi

authenticated_url="$(node "$project_directory/scripts/dsh-web-readiness.mjs" url "$PORT" "$server_log")" || fail "The local DSH page address could not be read."
open "$authenticated_url"
say "DSH Vibeify is ready."
if [[ "$account_choice" == "1" || "$account_choice" == "3" ]]; then
  printf 'In DSH, open Settings → Models to connect DeepSeek.\n'
elif [[ "$account_choice" == "4" ]]; then
  printf 'You can browse Vibe now. Connect DeepSeek or ChatGPT before asking the agent to work.\n'
fi
printf 'Updates are safe to run again: download the current helper and repeat these steps.\n'
show_help
pause_before_close
