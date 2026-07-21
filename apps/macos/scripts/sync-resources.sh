#!/bin/zsh
set -euo pipefail

SCRIPT_DIR=${0:A:h}
MACOS_DIR=${SCRIPT_DIR:h}
REPOSITORY_DIR=${MACOS_DIR:h:h}
SOURCE_DIR="$REPOSITORY_DIR/apps/web/public/cards/hwatu"
DESTINATION_DIR="$MACOS_DIR/Sources/FamilyHwatu/Resources/cards"
AUDIO_SOURCE_DIR="$REPOSITORY_DIR/apps/web/public/audio"
AUDIO_DESTINATION_DIR="$MACOS_DIR/Sources/FamilyHwatu/Resources/audio"
LEGAL_DESTINATION_DIR="$MACOS_DIR/Sources/FamilyHwatu/Resources/legal"

"$SCRIPT_DIR/verify-resources.sh"

if [[ ! -f "$SOURCE_DIR/verification.json" ]]; then
  print -u2 "검증된 화투패 원본을 찾지 못했습니다: $SOURCE_DIR"
  exit 1
fi

mkdir -p "$DESTINATION_DIR"
for source_file in "$SOURCE_DIR"/m??-??.svg; do
  cp "$source_file" "$DESTINATION_DIR/${source_file:t}"
done
cp "$SOURCE_DIR/ATTRIBUTION.txt" "$DESTINATION_DIR/ATTRIBUTION.txt"
cp "$SOURCE_DIR/verification.json" "$DESTINATION_DIR/verification.json"

if [[ ! -f "$AUDIO_SOURCE_DIR/verification.json" ]]; then
  print -u2 "검증된 게임 음향 원본을 찾지 못했습니다: $AUDIO_SOURCE_DIR"
  exit 1
fi

mkdir -p "$AUDIO_DESTINATION_DIR/effects" "$AUDIO_DESTINATION_DIR/voices"
for source_file in "$AUDIO_SOURCE_DIR"/*.mp3; do
  cp "$source_file" "$AUDIO_DESTINATION_DIR/${source_file:t}"
done
for source_file in "$AUDIO_SOURCE_DIR/effects"/*.wav; do
  cp "$source_file" "$AUDIO_DESTINATION_DIR/effects/${source_file:t}"
done
for source_file in "$AUDIO_SOURCE_DIR/voices"/*.wav; do
  cp "$source_file" "$AUDIO_DESTINATION_DIR/voices/${source_file:t}"
done
cp "$AUDIO_SOURCE_DIR/ATTRIBUTION.txt" "$AUDIO_DESTINATION_DIR/ATTRIBUTION.txt"
cp "$AUDIO_SOURCE_DIR/verification.json" "$AUDIO_DESTINATION_DIR/verification.json"
cp "$AUDIO_SOURCE_DIR/effects/verification.json" "$AUDIO_DESTINATION_DIR/effects/verification.json"
cp "$AUDIO_SOURCE_DIR/voices/verification.json" "$AUDIO_DESTINATION_DIR/voices/verification.json"

mkdir -p "$LEGAL_DESTINATION_DIR/licenses"
cp "$REPOSITORY_DIR/LICENSE" "$LEGAL_DESTINATION_DIR/LICENSE"
cp "$REPOSITORY_DIR/THIRD_PARTY_NOTICES.md" "$LEGAL_DESTINATION_DIR/THIRD_PARTY_NOTICES.md"
for source_file in "$REPOSITORY_DIR"/licenses/*.txt; do
  cp "$source_file" "$LEGAL_DESTINATION_DIR/licenses/${source_file:t}"
done

print "화투패, 게임 음향과 라이선스를 macOS 리소스에 동기화했습니다."
