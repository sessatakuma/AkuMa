#!/usr/bin/env bash

IOS_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_APP_DIR="$IOS_ROOT_DIR/apps/ios/Akuma"
IOS_PROJECT_PATH="${IOS_PROJECT:-$IOS_ROOT_DIR/apps/ios/Akuma.xcodeproj}"
IOS_SCHEME_NAME="${IOS_SCHEME:-Akuma}"
IOS_BUNDLE_ID_VALUE="${IOS_BUNDLE_ID:-dev.sessatakuma.akuma}"
IOS_SIMULATOR_NAME="${IOS_SIMULATOR_NAME:-iPhone 17 Pro}"

ios_die() {
    echo "$*" >&2
    exit 1
}

ios_resolve_simulator_id() {
    if [[ -n "${IOS_SIMULATOR_ID:-}" ]]; then
        printf '%s\n' "$IOS_SIMULATOR_ID"
        return
    fi

    xcrun simctl list devices available | awk -v name="$IOS_SIMULATOR_NAME" '
        index($0, name) > 0 && match($0, /\([0-9A-F-]+\)/) {
            udid = substr($0, RSTART + 1, RLENGTH - 2)
            print udid
            exit
        }
    '
}
