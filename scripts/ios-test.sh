#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ios-common.sh"

TEST_DIRECTORY="$(mktemp -d "${TMPDIR:-/tmp}/akuma-ios-tests.XXXXXX")"
trap 'rm -rf "$TEST_DIRECTORY"' EXIT

xcrun swiftc -parse-as-library -module-cache-path "$TEST_DIRECTORY/module-cache" \
    "$IOS_APP_DIR/AccentModel.swift" \
    "$IOS_APP_DIR/MarkAccentAPI.swift" \
    "$IOS_APP_DIR/ReadingSession.swift" \
    "$IOS_ROOT_DIR/tests/ios/ReadingSessionTests.swift" \
    -o "$TEST_DIRECTORY/reading-session-tests"
"$TEST_DIRECTORY/reading-session-tests"
