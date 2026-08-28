#!/usr/bin/env bash
set -euo pipefail

provider_mode="auto"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider)
      provider_mode="${2:-}"
      shift 2
      ;;
    *)
      echo "Usage: $0 [--provider auto|deepseek|chatgpt]" >&2
      exit 2
      ;;
  esac
done

if [[ "$provider_mode" != "auto" && "$provider_mode" != "deepseek" && "$provider_mode" != "chatgpt" ]]; then
  echo "Provider mode must be auto, deepseek, or chatgpt." >&2
  exit 2
fi

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_directory/.." && pwd)"
profile="${DSH_PROFILE:-web}"
dsh_home="${DSH_HOME:-$HOME/.dsh}"
profile_directory="$dsh_home/profiles/$profile"
legacy_package="dsh-llm-codex-chatgpt-local"

if ! command -v dsh >/dev/null 2>&1; then
  echo "DeepSeek Harness is not installed. Run $repository_root/scripts/install-dsh.sh first." >&2
  exit 1
fi

codex_authenticated=false
if command -v codex >/dev/null 2>&1; then
  login_status="$(codex login status 2>&1 || true)"
  if [[ "$login_status" == *"Logged in using ChatGPT"* ]]; then
    codex_authenticated=true
  fi
fi

if [[ "$provider_mode" == "auto" ]]; then
  if [[ "$codex_authenticated" == true ]]; then provider_mode="chatgpt"; else provider_mode="deepseek"; fi
fi
if [[ "$provider_mode" == "chatgpt" && "$codex_authenticated" != true ]]; then
  echo "ChatGPT mode needs Codex signed in with ChatGPT. Run 'codex login' or choose '--provider deepseek'." >&2
  exit 1
fi

if [[ "$provider_mode" == "chatgpt" ]]; then
  plugin_name="dsh-vibeify"
  opposite_plugin="dsh-vibeify-experience"
else
  plugin_name="dsh-vibeify-experience"
  opposite_plugin="dsh-vibeify"
fi
plugin_directory="$repository_root/plugins/$plugin_name"
package_cache="$dsh_home/package-cache/$plugin_name"

if [[ ! -f "$plugin_directory/package.json" ]]; then
  echo "The $plugin_name package is missing from this Vibeify checkout." >&2
  exit 1
fi

if [[ -f "$profile_directory/package.json" ]] && grep -q "\"$legacy_package\"" "$profile_directory/package.json"; then
  echo "Migrating the older local Vibeify bridge..."
  dsh plugin --profile "$profile" remove --workspace-root "$legacy_package"
  node "$script_directory/migrate-profile.mjs" "$profile_directory"
fi

# Only one Vibeify package may own the client surface. Removing the opposite
# mode is a profile change; an already-running DSH process keeps its loaded code
# until the user explicitly restarts it.
if [[ -f "$profile_directory/package.json" ]] && grep -q "\"$opposite_plugin\"" "$profile_directory/package.json"; then
  echo "Switching Vibeify provider mode to $provider_mode..."
  dsh plugin --profile "$profile" remove --workspace-root "$opposite_plugin"
fi

pack_directory="$(mktemp -d -t dsh-vibeify-pack.XXXXXX)"
config_dump="$(mktemp -t dsh-vibeify-config.XXXXXX)"
trap 'rm -rf "$pack_directory"; rm -f "$config_dump"' EXIT

# Install an immutable, content-addressed tarball. This prevents a source edit
# from changing files underneath a live DSH process.
mkdir -p "$package_cache"
packed_name="$(npm pack "$plugin_directory" --silent --pack-destination "$pack_directory")"
packed_archive="$pack_directory/$packed_name"
archive_hash="$(shasum -a 256 "$packed_archive" | awk '{print $1}')"
plugin_version="$(node -p "require('$plugin_directory/package.json').version")"
snapshot_archive="$package_cache/${plugin_name}-${plugin_version}-${archive_hash:0:16}.tgz"

if [[ ! -f "$snapshot_archive" ]]; then
  cp "$packed_archive" "$snapshot_archive"
fi

node "$script_directory/validate-package-archive.mjs" "$snapshot_archive"

echo "Installing $plugin_name into DSH profile '$profile'..."
dsh plugin --profile "$profile" add --workspace-root "file:$snapshot_archive"
dsh --profile "$profile" --dump-config >"$config_dump"

if [[ "$provider_mode" == "chatgpt" ]] && ! grep -q "provider: codex-chatgpt" "$config_dump"; then
  echo "Vibeify was installed but Codex is not the composed default provider." >&2
  exit 1
fi
if [[ "$provider_mode" == "deepseek" ]] && grep -q "provider: codex-chatgpt" "$config_dump"; then
  echo "DeepSeek mode was requested but the Codex provider still owns the composed profile." >&2
  exit 1
fi
if [[ "$provider_mode" == "deepseek" ]] && ! node -e '
  const p=require(process.argv[1]);
  const n=process.argv[2];
  if (!p.dependencies?.[n] || !p.dsh?.profile?.bundles?.includes(n)) process.exit(1);
' "$profile_directory/package.json" "$plugin_name"; then
  echo "The provider-neutral Vibeify package is not active in the DSH profile." >&2
  exit 1
fi

printf 'Vibeify mode: %s\n' "$provider_mode"
if [[ "$provider_mode" == "deepseek" ]]; then
  echo "Open Settings → Models after launch to connect a DeepSeek account. Installation itself needs no account."
else
  echo "Codex will lead. A DeepSeek key remains optional and can add lower-cost worker routes."
fi

if lsof -nP -iTCP:"${DSH_PORT:-3080}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Vibeify is staged. A running DSH process still uses its previously loaded code."
  echo "Finish active tasks before activation. This installer does not restart DSH."
else
  echo "Vibeify is installed. Start it with: dsh --profile $profile"
fi
