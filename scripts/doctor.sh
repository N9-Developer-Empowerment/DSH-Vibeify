#!/usr/bin/env bash
set -u

profile="${DSH_PROFILE:-web}"
source_only=false
if [[ "${1:-}" == "--source" ]]; then
  source_only=true
elif [[ $# -gt 0 ]]; then
  echo "Usage: $0 [--source]" >&2
  exit 2
fi

failures=0
check() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf 'OK   %s\n' "$label"
  else
    printf 'FAIL %s\n' "$label"
    failures=$((failures + 1))
  fi
}

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_directory/.." && pwd)"
plugin_directory="$repository_root/plugins/dsh-vibeify"

check "plugin JavaScript syntax" node --check "$plugin_directory/index.js"
check "browser JavaScript syntax" node --check "$plugin_directory/client.js"
check "routing policy tests" node --test "$plugin_directory/routing-policy.test.js"
check "DSH bundle manifest" grep -q '"bundle"' "$plugin_directory/package.json"
check "Codex manifest JSON" node -e 'const p=require(process.argv[1]);if(p.name!=="dsh-vibeify"||p.skills!=="./skills/")process.exit(1)' "$plugin_directory/.codex-plugin/plugin.json"
check "Codex marketplace JSON" node -e 'const p=require(process.argv[1]);if(p.plugins?.[0]?.name!=="dsh-vibeify")process.exit(1)' "$repository_root/.agents/plugins/marketplace.json"
codex_home="${CODEX_HOME:-$HOME/.codex}"
plugin_validator="$codex_home/skills/.system/plugin-creator/scripts/validate_plugin.py"
if [[ -f "$plugin_validator" ]] && python3 -c 'import yaml' >/dev/null 2>&1; then
  check "Codex plugin manifest" python3 "$plugin_validator" "$plugin_directory"
else
  printf 'INFO Full Codex validator is unavailable; dependency-free manifest checks were used.\n'
fi

if [[ "$source_only" != true ]]; then
  check "DSH command" command -v dsh
  check "Codex command" command -v codex
  login_status="$(codex login status 2>&1 || true)"
  if [[ "$login_status" == *"Logged in using ChatGPT"* ]]; then
    printf 'OK   ChatGPT authentication\n'
  else
    printf 'FAIL ChatGPT authentication\n'
    failures=$((failures + 1))
  fi

  if command -v dsh >/dev/null 2>&1; then
    config_dump="$(mktemp -t dsh-vibeify-doctor.XXXXXX)"
    if dsh --profile "$profile" --dump-config >"$config_dump" 2>/dev/null; then
      check "Vibeify host layer in profile '$profile'" grep -q "name: dsh-vibeify" "$config_dump"
      check "Codex is the default provider" grep -q "provider: codex-chatgpt" "$config_dump"
    else
      printf 'FAIL composed DSH profile\n'
      failures=$((failures + 1))
    fi
    rm -f "$config_dump"
  fi

  if command -v curl >/dev/null 2>&1 && curl --silent --fail --max-time 2 http://127.0.0.1:3080/ >/dev/null 2>&1; then
    printf 'OK   DSH Web UI is listening at http://127.0.0.1:3080\n'
  else
    printf 'INFO DSH Web UI is not currently reachable at http://127.0.0.1:3080\n'
  fi
fi

if [[ "$failures" -gt 0 ]]; then
  printf '\n%d check(s) failed.\n' "$failures" >&2
  exit 1
fi

printf '\nDSH Vibeify checks passed. No external write or paid model call was made.\n'
