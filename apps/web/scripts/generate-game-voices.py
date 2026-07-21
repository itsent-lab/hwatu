import hashlib
import json
from argparse import ArgumentParser
from datetime import date
from importlib.metadata import version
from pathlib import Path

import numpy as np
import soundfile as sf
from supertonic import TTS


OUTPUT_DIRECTORY = Path(__file__).resolve().parents[1] / "public" / "audio" / "voices"
SAMPLE_RATE = 44_100

VOICE_CLIPS: dict[str, tuple[str, str, float]] = {
    "player-capture": ("F2", "딱! 잡았다!", 1.12),
    "opponent-capture": ("M1", "딱! 내가 잡았지!", 1.1),
    "player-bonus-two": ("F2", "쌍피다! 좋았어!", 1.1),
    "opponent-bonus-two": ("M1", "쌍피! 부럽지?", 1.08),
    "player-bonus-three": ("F2", "쓰리피다! 좋았어!", 1.1),
    "opponent-bonus-three": ("M1", "쓰리피! 부럽지?", 1.08),
    "player-pee-transfer": ("F2", "피 뺏기! 잡았다!", 1.1),
    "opponent-pee-transfer": ("M1", "피 가져간다!", 1.08),
    "player-ppeok": ("F2", "뻑! 아깝다!", 1.08),
    "opponent-ppeok": ("M1", "뻑! 잘한다!", 1.08),
    "double-ppeok": ("F2", "연속 뻑! 한 번 남았다!", 1.12),
    "triple-ppeok": ("F2", "삼연 뻑! 판 끝났다!", 1.12),
    "player-bomb": ("F2", "폭탄이다! 받아라!", 1.12),
    "opponent-bomb": ("M1", "폭탄이다! 제대로 맞아라!", 1.12),
    "shake": ("F2", "흔들었다! 두 배 간다!", 1.12),
    "player-jjok": ("F2", "쪽! 잡았다!", 1.1),
    "opponent-jjok": ("M1", "쪽! 약 오르지?", 1.08),
    "player-ttadak": ("F2", "따닥! 딱 걸렸어!", 1.1),
    "opponent-ttadak": ("M1", "따닥! 딱 걸렸지?", 1.08),
    "player-sweep": ("F2", "싹쓸이! 다 내 거!", 1.12),
    "opponent-sweep": ("M1", "싹쓸이! 하나도 없지?", 1.1),
    "player-ppeok-capture": ("F2", "싼 패! 가져간다!", 1.1),
    "opponent-ppeok-capture": ("M1", "싼 패! 잘 먹을게!", 1.08),
    "player-self-ppeok": ("F2", "자뻑! 좋았어!", 1.1),
    "opponent-self-ppeok": ("M1", "자뻑! 운도 좋지!", 1.08),
    "player-mission": ("F2", "미션 성공! 크게 간다!", 1.12),
    "opponent-mission": ("M1", "미션 성공! 어쩔 수 없지?", 1.1),
    "player-score": ("F2", "점수 났다! 좋았어!", 1.12),
    "opponent-score": ("M1", "점수 났다! 따라와 봐!", 1.1),
    "player-go": ("F2", "고! 더 가자!", 1.08),
    "opponent-go": ("M1", "고! 어디까지 가나 보자!", 1.1),
    "player-stop": ("F2", "스톱! 여기까지!", 1.08),
    "opponent-stop": ("M1", "스톱! 게임 끝!", 1.08),
    "win": ("F2", "좋았어! 승리!", 1.08),
    "lose": ("M1", "내가 이겼지!", 1.08),
    "nagari": ("M1", "나가리! 다시 붙어!", 1.08),
    "start": ("F2", "시작! 한 판 붙어 보자!", 1.1),
    "player-chongtong": ("F2", "총통! 네 장 완성!", 1.1),
    "opponent-chongtong": ("M1", "총통! 네 장 다 모았다!", 1.1),
    "dealer-human": ("F2", "좋았어! 내가 선이다!", 1.1),
    "dealer-opponent": ("M1", "이번엔 내가 선이다!", 1.1),
    "gookjin-double": ("F2", "국진은 쌍피로 간다!", 1.1),
    "gookjin-animal": ("F2", "국진은 열끗으로 간다!", 1.1),
    "undo": ("F2", "무르기! 다시 보자!", 1.08),
    "gostop-computer-a-capture": ("F1", "앗, 이건 제가 먹을게요!", 1.18),
    "gostop-computer-a-bonus-two": ("F1", "쌍피예요! 완전 좋아!", 1.18),
    "gostop-computer-a-bonus-three": ("F1", "쓰리피예요! 대박이다!", 1.18),
    "gostop-computer-a-ppeok": ("F1", "앗, 뻑이에요!", 1.16),
    "gostop-computer-a-sweep": ("F1", "싹쓸이! 제가 다 가져갈게요!", 1.18),
    "gostop-computer-a-ppeok-capture": ("F1", "싼 패! 잘 먹을게요!", 1.18),
    "gostop-computer-a-self-ppeok": ("F1", "자뻑! 오늘 운 좋은데요?", 1.18),
    "gostop-computer-a-score": ("F1", "점수 났어요! 신난다!", 1.18),
    "gostop-computer-a-go": ("F1", "고! 한 번 더 가볼게요!", 1.16),
    "gostop-computer-a-stop": ("F1", "스톱! 여기까지 할게요!", 1.16),
    "gostop-computer-a-win": ("F1", "제가 이겼어요! 재밌었다!", 1.16),
    "matgo-female-capture": ("F4", "딱! 제가 잡았어요!", 1.14),
    "matgo-female-bonus-two": ("F4", "쌍피예요! 신난다!", 1.14),
    "matgo-female-bonus-three": ("F4", "쓰리피예요! 대박!", 1.14),
    "matgo-female-ppeok": ("F4", "어머, 뻑이에요!", 1.12),
    "matgo-female-sweep": ("F4", "싹쓸이! 다 가져갈게요!", 1.14),
    "matgo-female-ppeok-capture": ("F4", "싼 패! 잘 먹을게요!", 1.14),
    "matgo-female-self-ppeok": ("F4", "자뻑! 운이 좋네요!", 1.14),
    "matgo-female-score": ("F4", "점수 났어요! 좋아요!", 1.14),
    "matgo-female-go": ("F4", "고! 더 가볼게요!", 1.12),
    "matgo-female-stop": ("F4", "스톱! 여기까지예요!", 1.12),
    "matgo-female-win": ("F4", "제가 이겼어요! 신난다!", 1.12),
    "gostop-computer-b-capture": ("M4", "딱! 이건 내가 먹지!", 1.16),
    "gostop-computer-b-bonus-two": ("M4", "쌍피네! 약 오르지?", 1.16),
    "gostop-computer-b-bonus-three": ("M4", "쓰리피다! 어때?", 1.16),
    "gostop-computer-b-ppeok": ("M4", "뻑이네! 이것도 재미지!", 1.14),
    "gostop-computer-b-sweep": ("M4", "싹쓸이! 구경 잘했지?", 1.16),
    "gostop-computer-b-ppeok-capture": ("M4", "싼 패! 내가 챙긴다!", 1.16),
    "gostop-computer-b-self-ppeok": ("M4", "자뻑! 운까지 내 편이네!", 1.16),
    "gostop-computer-b-score": ("M4", "점수 났네! 따라와 봐!", 1.16),
    "gostop-computer-b-go": ("M4", "고! 겁나면 빠져!", 1.14),
    "gostop-computer-b-stop": ("M4", "스톱! 딱 여기까지!", 1.14),
    "gostop-computer-b-win": ("M4", "내가 이겼네! 다음 판도 콜?", 1.14),
    "gostop-computer-c-capture": ("M5", "좋군. 이 패는 내가 가져가겠네.", 0.98),
    "gostop-computer-c-bonus-two": ("M5", "쌍피로군. 운이 따르는군.", 0.98),
    "gostop-computer-c-bonus-three": ("M5", "쓰리피라, 제법이군.", 0.98),
    "gostop-computer-c-ppeok": ("M5", "허허, 뻑이로군.", 0.96),
    "gostop-computer-c-sweep": ("M5", "싹쓸이군. 패가 잘 붙는군.", 0.98),
    "gostop-computer-c-ppeok-capture": ("M5", "싼 패로군. 잘 가져가겠네.", 0.98),
    "gostop-computer-c-self-ppeok": ("M5", "자뻑이라. 오늘 운이 좋군.", 0.98),
    "gostop-computer-c-score": ("M5", "점수가 났군. 흐름이 좋네.", 0.98),
    "gostop-computer-c-go": ("M5", "고. 조금 더 가보겠네.", 0.96),
    "gostop-computer-c-stop": ("M5", "스톱. 여기서 마무리하지.", 0.96),
    "gostop-computer-c-win": ("M5", "내가 이겼군. 좋은 승부였네.", 0.96),
    "gostop-computer-d-capture": ("F3", "어머, 그 패는 제가 가져갈게요.", 0.98),
    "gostop-computer-d-bonus-two": ("F3", "쌍피네요. 운도 제 편인가 봐요.", 0.98),
    "gostop-computer-d-bonus-three": ("F3", "쓰리피라니, 꽤 마음에 드네요.", 0.98),
    "gostop-computer-d-ppeok": ("F3", "어머, 뻑이네요.", 0.96),
    "gostop-computer-d-sweep": ("F3", "싹쓸이네요. 전부 제 거예요.", 0.98),
    "gostop-computer-d-ppeok-capture": ("F3", "싼 패네요. 제가 챙길게요.", 0.98),
    "gostop-computer-d-self-ppeok": ("F3", "자뻑이라니, 운이 따라주네요.", 0.98),
    "gostop-computer-d-score": ("F3", "점수가 났네요. 흐름이 좋은데요?", 0.98),
    "gostop-computer-d-go": ("F3", "고. 조금 더 즐겨볼까요?", 0.96),
    "gostop-computer-d-stop": ("F3", "스톱. 여기서 끝낼게요.", 0.96),
    "gostop-computer-d-win": ("F3", "제가 이겼네요. 즐거운 승부였어요.", 0.96),
}


def trim_and_normalize(samples: np.ndarray) -> np.ndarray:
    mono = np.asarray(samples, dtype=np.float32).reshape(-1)
    audible = np.flatnonzero(np.abs(mono) >= 0.004)
    if audible.size:
        padding = int(SAMPLE_RATE * 0.035)
        start = max(0, int(audible[0]) - padding)
        end = min(mono.size, int(audible[-1]) + padding)
        mono = mono[start:end]
    peak = float(np.max(np.abs(mono))) if mono.size else 0
    if peak > 0:
        mono = mono * (0.88 / peak)
    return mono


def main() -> None:
    parser = ArgumentParser(description="Generate or verify the prerecorded game voice assets.")
    parser.add_argument(
        "--manifest-only",
        action="store_true",
        help="Keep existing WAV files and rebuild only their verification manifests.",
    )
    args = parser.parse_args()
    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    tts = None
    if not args.manifest_only:
        np.random.seed(20_260_721)
        tts = TTS(auto_download=True)
    assets = []
    for filename, (voice_name, text, speed) in VOICE_CLIPS.items():
        output_path = OUTPUT_DIRECTORY / f"{filename}.wav"
        if tts is not None:
            samples, _ = tts.synthesize(
                text=text,
                lang="ko",
                voice_style=tts.get_voice_style(voice_name=voice_name),
                total_steps=12,
                speed=speed,
            )
            sf.write(output_path, trim_and_normalize(samples), SAMPLE_RATE, subtype="PCM_16")
        elif not output_path.is_file():
            raise FileNotFoundError(f"Voice asset is missing: {output_path}")
        data = output_path.read_bytes()
        assets.append({
            "file": output_path.name,
            "text": text,
            "voice": voice_name,
            "speed": speed,
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
        })
        action = "verified" if args.manifest_only else "generated"
        print(f"{action} {output_path.name}: {voice_name} / {text}")

    manifest = {
        "version": 1,
        "generatedAt": date.today().isoformat(),
        "generator": {
            "name": "Supertonic 3",
            "package": f"supertonic {version('supertonic')}",
            "source": "https://github.com/supertone-inc/supertonic",
            "model": "https://huggingface.co/Supertone/supertonic-3",
            "modelLicense": "BigScience OpenRAIL-M",
            "license": "https://huggingface.co/Supertone/supertonic-3/blob/main/LICENSE",
        },
        "notice": "AI-generated Korean voice. The model licensor claims no rights in generated output; output use remains subject to the OpenRAIL-M use restrictions.",
        "assets": assets,
    }
    manifest_path = OUTPUT_DIRECTORY / "verification.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    audio_verification_path = OUTPUT_DIRECTORY.parent / "verification.json"
    audio_verification = json.loads(audio_verification_path.read_text(encoding="utf-8"))
    manifest_data = manifest_path.read_bytes()
    voice_entry = next(
        asset for asset in audio_verification["assets"]
        if asset["file"] == "voices/verification.json"
    )
    voice_entry["bytes"] = len(manifest_data)
    voice_entry["sha256"] = hashlib.sha256(manifest_data).hexdigest()
    audio_verification_path.write_text(
        json.dumps(audio_verification, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
