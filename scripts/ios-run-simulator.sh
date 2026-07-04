#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ios-common.sh"

CONFIGURATION="${IOS_CONFIGURATION:-Debug}"
DERIVED_DATA_PATH="${IOS_DERIVED_DATA_PATH:-$IOS_ROOT_DIR/build/SimulatorDerivedData}"
SIMULATOR_ID="$(ios_resolve_simulator_id)"

[[ -n "$SIMULATOR_ID" ]] || ios_die "No available simulator found for IOS_SIMULATOR_NAME=$IOS_SIMULATOR_NAME."

xcrun simctl boot "$SIMULATOR_ID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$SIMULATOR_ID" -b

xcodebuild \
    -project "$IOS_PROJECT_PATH" \
    -scheme "$IOS_SCHEME_NAME" \
    -configuration "$CONFIGURATION" \
    -sdk iphonesimulator \
    -destination "id=$SIMULATOR_ID" \
    -derivedDataPath "$DERIVED_DATA_PATH" \
    CODE_SIGNING_ALLOWED=NO \
    build

APP_PATH="${IOS_APP_PATH:-$DERIVED_DATA_PATH/Build/Products/$CONFIGURATION-iphonesimulator/$IOS_SCHEME_NAME.app}"

[[ -d "$APP_PATH" ]] || ios_die "Built app not found at $APP_PATH."

xcrun simctl install "$SIMULATOR_ID" "$APP_PATH"

if [[ "${IOS_SHOWCASE_DATA:-0}" == "1" ]]; then
    xcrun simctl launch "$SIMULATOR_ID" "$IOS_BUNDLE_ID_VALUE" --showcase-data
else
    xcrun simctl launch "$SIMULATOR_ID" "$IOS_BUNDLE_ID_VALUE"
fi

echo "Updated and launched $IOS_BUNDLE_ID_VALUE on simulator $SIMULATOR_ID."
