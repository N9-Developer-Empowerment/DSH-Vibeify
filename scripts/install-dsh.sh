#!/usr/bin/env bash
set -euo pipefail

tested_version="0.1.1-rc.2"
target_version="${DSH_VERSION:-$tested_version}"
replace=false
use_latest=false
if [[ "${1:-}" == "--replace" ]]; then
  replace=true
elif [[ "${1:-}" == "--latest" ]]; then
  replace=true
  use_latest=true
elif [[ $# -gt 0 ]]; then
  echo "Usage: $0 [--replace|--latest]" >&2
  exit 2
fi

for command_name in node npm; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing $command_name. Install Node.js 22 or newer, then retry." >&2
    exit 1
  fi
done

if [[ "$use_latest" == true ]]; then
  target_version="$(npm view @deepseek-ai/dsh@latest version)"
  if [[ -z "$target_version" ]]; then
    echo "The official npm registry did not return a DSH latest version." >&2
    exit 1
  fi
fi

if ! node -e 'const [major,minor]=process.versions.node.split(".").map(Number);process.exit((major===22&&minor>=19)||major>=24?0:1)'; then
  echo "Node.js 22.19 or later in the 22.x line, or Node.js 24 or later, is required; found $(node --version)." >&2
  exit 1
fi

if command -v dsh >/dev/null 2>&1; then
  current_version="$(dsh --version)"
  if [[ "$current_version" == "$target_version" ]]; then
    echo "DeepSeek Harness $target_version is already the latest requested version."
    exit 0
  fi
  if [[ "$replace" != true ]]; then
    echo "DeepSeek Harness $current_version is installed; Vibeify is tested with $target_version." >&2
    echo "Run '$0 --latest' to update to the current official release." >&2
    exit 2
  fi
fi

echo "Installing @deepseek-ai/dsh@$target_version globally..."
npm install --global "@deepseek-ai/dsh@$target_version"

installed_version="$(dsh --version)"
if [[ "$installed_version" != "$target_version" ]]; then
  echo "DSH version verification failed: expected $target_version, found $installed_version." >&2
  exit 1
fi

echo "DeepSeek Harness $installed_version is installed."
echo "Next: run ./scripts/install-vibeify.sh; it will use ChatGPT when signed in and DeepSeek mode otherwise."
