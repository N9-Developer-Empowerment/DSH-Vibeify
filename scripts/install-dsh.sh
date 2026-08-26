#!/usr/bin/env bash
set -euo pipefail

target_version="${DSH_VERSION:-0.1.1-rc.2}"
replace=false
if [[ "${1:-}" == "--replace" ]]; then
  replace=true
elif [[ $# -gt 0 ]]; then
  echo "Usage: $0 [--replace]" >&2
  exit 2
fi

for command_name in node npm; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing $command_name. Install Node.js 22 or newer, then retry." >&2
    exit 1
  fi
done

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$node_major" -lt 22 ]]; then
  echo "Node.js 22 or newer is required; found $(node --version)." >&2
  exit 1
fi

if command -v dsh >/dev/null 2>&1; then
  current_version="$(dsh --version)"
  if [[ "$current_version" == "$target_version" ]]; then
    echo "DeepSeek Harness $target_version is already installed."
    exit 0
  fi
  if [[ "$replace" != true ]]; then
    echo "DeepSeek Harness $current_version is installed, but Vibeify is tested with $target_version." >&2
    echo "Review the version change, then run: $0 --replace" >&2
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
echo "Next: sign Codex into ChatGPT with 'codex login', then run ./scripts/install-vibeify.sh"
