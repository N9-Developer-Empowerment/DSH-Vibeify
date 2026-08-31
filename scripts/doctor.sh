#!/usr/bin/env bash
set -u

profile="${DSH_PROFILE:-web}"
dsh_home="${DSH_HOME:-$HOME/.dsh}"
profile_directory="$dsh_home/profiles/$profile"
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
experience_plugin_directory="$repository_root/plugins/dsh-vibeify-experience"
visual_plugin_directory="$repository_root/plugins/dsh-visuals"

check "plugin JavaScript syntax" node --check "$plugin_directory/index.js"
check "browser JavaScript syntax" node --check "$plugin_directory/client.js"
check "provider-neutral browser JavaScript syntax" node --check "$experience_plugin_directory/client.js"
check "update checker JavaScript syntax" node --check "$plugin_directory/update-check.js"
check "provider-neutral update host syntax" node --check "$experience_plugin_directory/index.js"
check "provider-neutral package manifest" node -e 'const p=require(process.argv[1]);if(p.name!=="dsh-vibeify-experience"||p.main!=="index.js"||p.dsh?.bundle?.patch!=="./cordis.patch.yml")process.exit(1)' "$experience_plugin_directory/package.json"
check "visual-source package manifest" node -e 'const p=require(process.argv[1]);if(p.name!=="dsh-visuals"||p.main!=="index.js"||p.dsh?.bundle?.patch!=="./cordis.patch.yml")process.exit(1)' "$visual_plugin_directory/package.json"
check "visual-source host syntax" node --check "$visual_plugin_directory/index.js"
check "restart handoff syntax" node --check "$script_directory/dsh-restart.mjs"
check "restart handoff tests" node --test "$script_directory/dsh-restart.test.mjs"
check "cross-platform DSH starter syntax" node --check "$script_directory/start-dsh.mjs"
check "installer source check syntax" node --check "$script_directory/installer-self-check.mjs"
check "privacy-safe support report syntax" node --check "$script_directory/support-report.mjs"
check "public installer checker syntax" node --check "$script_directory/check-public-mac-installer.mjs"
check "installer contract tests" node --test "$script_directory/installer-contract.test.mjs"
check "isolated macOS installer flow" node --test "$script_directory/installer-macos-flow.test.mjs"
check "package closure syntax" node --check "$script_directory/validate-package-archive.mjs"
check "package closure tests" node --test "$script_directory/validate-package-archive.test.mjs"
check "activation script syntax" bash -n "$script_directory/activate-vibeify.sh"
check "DSH installer syntax" bash -n "$script_directory/install-dsh.sh"
check "Vibeify installer syntax" bash -n "$script_directory/install-vibeify.sh"
check "friendly macOS installer syntax" bash -n "$script_directory/Install DSH Vibeify.command"
check "friendly Linux installer syntax" bash -n "$script_directory/install-dsh-vibeify-linux.sh"
check "installer asset builder syntax" bash -n "$script_directory/build-installer-assets.sh"
check "Windows installer contract" grep -q 'validate-package-archive.mjs' "$script_directory/Install DSH Vibeify.ps1"
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

  if command -v dsh >/dev/null 2>&1; then
    config_dump="$(mktemp -t dsh-vibeify-doctor.XXXXXX)"
    if dsh --profile "$profile" --dump-config >"$config_dump" 2>/dev/null; then
      if node -e 'const p=require(process.argv[1]);if(!p.dependencies?.["dsh-vibeify-experience"]||!p.dsh?.profile?.bundles?.includes("dsh-vibeify-experience"))process.exit(1)' "$profile_directory/package.json"; then
        printf 'OK   Vibeify provider-neutral experience in profile %s\n' "$profile"
        if grep -q "provider: codex-chatgpt" "$config_dump"; then
          printf 'FAIL DeepSeek mode unexpectedly uses the Codex provider\n'
          failures=$((failures + 1))
        else
          printf 'OK   Native DSH provider remains in control\n'
        fi
        printf 'INFO Connect DeepSeek under Settings → Models before asking the agent to work.\n'
      elif grep -q "name: dsh-vibeify" "$config_dump"; then
        printf 'OK   Vibeify Codex host layer in profile %s\n' "$profile"
        check "Codex is the default provider" grep -q "provider: codex-chatgpt" "$config_dump"
        check "Codex command" command -v codex
        login_status="$(codex login status 2>&1 || true)"
        if [[ "$login_status" == *"Logged in using ChatGPT"* ]]; then
          printf 'OK   ChatGPT authentication\n'
        else
          printf 'FAIL ChatGPT authentication\n'
          failures=$((failures + 1))
        fi
      else
        printf 'FAIL No Vibeify package is composed in profile %s\n' "$profile"
        failures=$((failures + 1))
      fi
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
