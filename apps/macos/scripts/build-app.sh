#!/bin/zsh
set -euo pipefail

SCRIPT_DIR=${0:A:h}
MACOS_DIR=${SCRIPT_DIR:h}
REPOSITORY_DIR=${MACOS_DIR:h:h}
APP_NAME=FamilyHwatu
BUNDLE_ID=${FAMILY_HWATU_BUNDLE_ID:-kr.co.nsrnb.familyhwatu.macos}
API_BASE_URL=${FAMILY_HWATU_API_URL:-}
DISTRIBUTION_BUILD=${FAMILY_HWATU_DISTRIBUTION:-0}
SIGN_IDENTITY=${FAMILY_HWATU_SIGN_IDENTITY:--}
OUTPUT_DIR="$MACOS_DIR/build"
APP_DIR="$OUTPUT_DIR/$APP_NAME.app"
CONTENTS_DIR="$APP_DIR/Contents"
RELEASE_DIR="$MACOS_DIR/.build/arm64-apple-macosx/release"

if [[ "$DISTRIBUTION_BUILD" == "1" ]]; then
  if [[ -z "$API_BASE_URL" || "$API_BASE_URL" != https://* ]]; then
    print -u2 "배포 빌드는 FAMILY_HWATU_API_URL에 HTTPS 서버 주소가 필요합니다."
    exit 1
  fi
  SERVER_SETTINGS_ENABLED=false
else
  SERVER_SETTINGS_ENABLED=true
fi

"$SCRIPT_DIR/sync-resources.sh"
cd "$MACOS_DIR"
swift build -c release

if [[ "$APP_DIR" != "$MACOS_DIR/build/FamilyHwatu.app" ]]; then
  print -u2 "예상하지 않은 앱 출력 경로입니다: $APP_DIR"
  exit 1
fi
rm -rf "$APP_DIR"
mkdir -p "$CONTENTS_DIR/MacOS" "$CONTENTS_DIR/Resources"
cp "$RELEASE_DIR/$APP_NAME" "$CONTENTS_DIR/MacOS/$APP_NAME"
cp "$MACOS_DIR/Support/Info.plist" "$CONTENTS_DIR/Info.plist"
sed -i '' "s/__BUNDLE_ID__/$BUNDLE_ID/g" "$CONTENTS_DIR/Info.plist"
/usr/bin/plutil -replace HwatuAPIBaseURL -string "$API_BASE_URL" "$CONTENTS_DIR/Info.plist"
/usr/bin/plutil -replace HwatuServerSettingsEnabled -bool "$SERVER_SETTINGS_ENABLED" "$CONTENTS_DIR/Info.plist"
cp -R "$RELEASE_DIR/FamilyHwatuMac_FamilyHwatu.bundle" "$CONTENTS_DIR/Resources/FamilyHwatuMac_FamilyHwatu.bundle"

ICON_SOURCE="$REPOSITORY_DIR/apps/web/public/icons/hwatu-icon-512.png"
if [[ -f "$ICON_SOURCE" ]]; then
  ICONSET_DIR="$OUTPUT_DIR/AppIcon.iconset"
  mkdir -p "$ICONSET_DIR"
  sips -z 16 16 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_16x16.png" >/dev/null
  sips -z 32 32 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_16x16@2x.png" >/dev/null
  sips -z 32 32 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_32x32.png" >/dev/null
  sips -z 64 64 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_32x32@2x.png" >/dev/null
  sips -z 128 128 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_128x128.png" >/dev/null
  sips -z 256 256 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_128x128@2x.png" >/dev/null
  sips -z 256 256 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_256x256.png" >/dev/null
  sips -z 512 512 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_256x256@2x.png" >/dev/null
  sips -z 512 512 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_512x512.png" >/dev/null
  sips -z 1024 1024 "$ICON_SOURCE" --out "$ICONSET_DIR/icon_512x512@2x.png" >/dev/null
  iconutil -c icns "$ICONSET_DIR" -o "$CONTENTS_DIR/Resources/AppIcon.icns"
fi

if [[ "$SIGN_IDENTITY" == "-" ]]; then
  codesign --force --sign - "$APP_DIR"
else
  codesign --force --options runtime --timestamp --sign "$SIGN_IDENTITY" "$APP_DIR"
fi
print "$APP_DIR"
