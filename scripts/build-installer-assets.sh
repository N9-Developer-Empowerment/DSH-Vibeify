#!/usr/bin/env bash
set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_directory/.." && pwd)"
output_directory="${1:-$repository_root/dist/installers}"

for command_name in zip shasum; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing %s; it is required to build the downloadable installer archives.\n' "$command_name" >&2
    exit 1
  fi
done

mkdir -p "$output_directory"
rm -f \
  "$output_directory/DSH-Vibeify-Installer-macOS.zip" \
  "$output_directory/DSH-Vibeify-Installer-Windows.zip" \
  "$output_directory/DSH-Vibeify-Installer-Linux.zip" \
  "$output_directory/SHA256SUMS"

working_directory="$(mktemp -d -t dsh-vibeify-installer-assets.XXXXXX)"
trap 'rm -rf "$working_directory"' EXIT

cp "$script_directory/Install DSH Vibeify.command" "$working_directory/Install DSH Vibeify.command"
chmod +x "$working_directory/Install DSH Vibeify.command"
(cd "$working_directory" && zip -q "$output_directory/DSH-Vibeify-Installer-macOS.zip" "Install DSH Vibeify.command")

cp "$script_directory/install-dsh-vibeify-linux.sh" "$working_directory/install-dsh-vibeify-linux.sh"
chmod +x "$working_directory/install-dsh-vibeify-linux.sh"
(cd "$working_directory" && zip -q "$output_directory/DSH-Vibeify-Installer-Linux.zip" "install-dsh-vibeify-linux.sh")

cp "$script_directory/Install DSH Vibeify.ps1" "$working_directory/Install DSH Vibeify.ps1"
cp "$script_directory/Install DSH Vibeify Windows.cmd" "$working_directory/Install DSH Vibeify Windows.cmd"
(cd "$working_directory" && zip -q "$output_directory/DSH-Vibeify-Installer-Windows.zip" "Install DSH Vibeify.ps1" "Install DSH Vibeify Windows.cmd")

(cd "$output_directory" && shasum -a 256 DSH-Vibeify-Installer-*.zip >SHA256SUMS)
printf 'Installer assets written to %s\n' "$output_directory"
