#!/usr/bin/env bash
set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_directory/.." && pwd)"
plugin_directory="$repository_root/plugins/dsh-vibeify"
profile="${DSH_PROFILE:-web}"
dsh_home="${DSH_HOME:-$HOME/.dsh}"
profile_directory="$dsh_home/profiles/$profile"
legacy_package="dsh-llm-codex-chatgpt-local"

if ! command -v dsh >/dev/null 2>&1; then
  echo "DeepSeek Harness is not installed. Run $repository_root/scripts/install-dsh.sh first." >&2
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "Codex is not installed. Install Codex and complete 'codex login' before using Vibeify." >&2
  exit 1
fi

login_status="$(codex login status 2>&1 || true)"
if [[ "$login_status" != *"Logged in using ChatGPT"* ]]; then
  echo "Codex must be signed in using ChatGPT rather than an API key. Run 'codex login' and retry." >&2
  exit 1
fi

if [[ -f "$profile_directory/package.json" ]] && grep -q "\"$legacy_package\"" "$profile_directory/package.json"; then
  echo "Migrating the older local Vibeify bridge..."
  dsh plugin --profile "$profile" remove --workspace-root "$legacy_package"
  node "$script_directory/migrate-profile.mjs" "$profile_directory"
fi

echo "Installing DSH Vibeify into profile '$profile'..."
dsh plugin --profile "$profile" add --workspace-root "file:$plugin_directory"

config_dump="$(mktemp -t dsh-vibeify-config.XXXXXX)"
trap 'rm -f "$config_dump"' EXIT
dsh --profile "$profile" --dump-config >"$config_dump"

if ! grep -q "name: dsh-vibeify" "$config_dump"; then
  echo "Vibeify was installed but its host layer is absent from the composed DSH configuration." >&2
  exit 1
fi
if ! grep -q "provider: codex-chatgpt" "$config_dump"; then
  echo "Vibeify was installed but Codex is not the composed default provider." >&2
  exit 1
fi

if pgrep -f "(^|/)(dsh)( |$)|node .*dsh .*web" >/dev/null 2>&1; then
  echo "Vibeify is staged. A DSH process is already running and still uses its previously loaded code."
  echo "Finish active tasks before restarting DSH. This installer does not restart it."
else
  echo "Vibeify is installed. Start it with: dsh --profile $profile"
fi
