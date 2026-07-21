#!/bin/zsh
set -euo pipefail

SCRIPT_DIR=${0:A:h}
MACOS_DIR=${SCRIPT_DIR:h}
REPOSITORY_DIR=${MACOS_DIR:h:h}
CARD_DIR="$REPOSITORY_DIR/apps/web/public/cards/hwatu"
AUDIO_DIR="$REPOSITORY_DIR/apps/web/public/audio"

if ! command -v jq >/dev/null 2>&1; then
  print -u2 "자산 해시 검증에 jq가 필요합니다."
  exit 1
fi

verify_manifest() {
  local manifest=$1
  local base_dir=$2
  local algorithm=$3
  local hash_field=$4
  local file expected_bytes expected_hash target actual_bytes actual_hash

  while IFS='|' read -r file expected_bytes expected_hash; do
    target="$base_dir/$file"
    if [[ ! -f "$target" ]]; then
      print -u2 "검증 자산이 없습니다: $target"
      return 1
    fi
    actual_bytes=$(stat -f %z "$target")
    actual_hash=$(shasum -a "$algorithm" "$target" | cut -d ' ' -f 1)
    if [[ -n "$expected_bytes" && "$actual_bytes" != "$expected_bytes" ]]; then
      print -u2 "자산 바이트 크기가 다릅니다: $target"
      return 1
    fi
    if [[ "$actual_hash" != "$expected_hash" ]]; then
      print -u2 "자산 해시가 다릅니다: $target"
      return 1
    fi
  done < <(jq -r --arg field "$hash_field" '.assets[] | [(.file // (.cardId + ".svg")), ((.bytes // "") | tostring), .[$field]] | join("|")' "$manifest")
}

verify_manifest "$CARD_DIR/verification.json" "$CARD_DIR" 1 sha1
verify_manifest "$AUDIO_DIR/verification.json" "$AUDIO_DIR" 256 sha256
verify_manifest "$AUDIO_DIR/effects/verification.json" "$AUDIO_DIR/effects" 256 sha256
verify_manifest "$AUDIO_DIR/voices/verification.json" "$AUDIO_DIR/voices" 256 sha256
print "화투패와 게임 음향의 바이트 크기 및 해시를 확인했습니다."
