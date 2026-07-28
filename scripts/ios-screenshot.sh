#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ios-common.sh"

SIMULATOR_ID="$(ios_resolve_simulator_id)"
OUTPUT_PATH="${IOS_SCREENSHOT_PATH:-${TMPDIR:-/tmp}/akuma-ios-screenshot.png}"

[[ -n "$SIMULATOR_ID" ]] || ios_die "No available simulator found for IOS_SIMULATOR_NAME=$IOS_SIMULATOR_NAME."
mkdir -p "$(dirname "$OUTPUT_PATH")"
xcrun simctl io "$SIMULATOR_ID" screenshot "$OUTPUT_PATH"

echo "$OUTPUT_PATH"
