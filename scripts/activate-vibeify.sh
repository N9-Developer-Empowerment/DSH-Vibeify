#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" != "--confirmed-idle" ]]; then
  echo "Usage: $0 --confirmed-idle [--provider auto|deepseek|chatgpt]" >&2
  echo "Use only after the user explicitly authorises activation and the current DSH task is complete." >&2
  exit 2
fi

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_directory/.." && pwd)"
plugin_directory="$repository_root/plugins/dsh-vibeify"
shift

npm --prefix "$plugin_directory" test
npm --prefix "$plugin_directory" run check
"$script_directory/install-vibeify.sh" "$@"
node "$script_directory/dsh-restart.mjs" queue --confirmed-idle \
  --profile "${DSH_PROFILE:-web}" \
  --port "${DSH_PORT:-3080}"
