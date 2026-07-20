import hashlib
import json
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
    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    np.random.seed(20_260_721)
    tts = TTS(auto_download=True)
    assets = []
    for filename, (voice_name, text, speed) in VOICE_CLIPS.items():
        samples, _ = tts.synthesize(
            text=text,
            lang="ko",
            voice_style=tts.get_voice_style(voice_name=voice_name),
            total_steps=12,
            speed=speed,
        )
        output_path = OUTPUT_DIRECTORY / f"{filename}.wav"
        sf.write(output_path, trim_and_normalize(samples), SAMPLE_RATE, subtype="PCM_16")
        data = output_path.read_bytes()
        assets.append({
            "file": output_path.name,
            "text": text,
            "voice": voice_name,
            "speed": speed,
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
        })
        print(f"{output_path.name}: {voice_name} / {text}")

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
