import { describe, expect, it } from 'vitest';
import { GAME_AUDIO_ASSETS, VOICE_AUDIO_ASSETS } from '../lib/audioAssets';

describe('게임 오디오 자산', () => {
  it('공개 배경음과 효과음 경로를 제공한다', () => {
    expect(GAME_AUDIO_ASSETS.background).toMatch(/^\/audio\//);
    expect(Object.values(GAME_AUDIO_ASSETS)).toEqual(expect.arrayContaining([
      '/audio/card-deal.mp3',
      '/audio/card-slide.mp3',
      '/audio/card-contact.mp3',
      '/audio/wood-block.mp3'
    ]));
  });

  it('게임 사건별 사전 생성 한국어 음성을 제공한다', () => {
    expect(Object.keys(VOICE_AUDIO_ASSETS)).toHaveLength(37);
    expect(Object.values(VOICE_AUDIO_ASSETS).every(path => path.startsWith('/audio/voices/'))).toBe(true);
    expect(VOICE_AUDIO_ASSETS.voicePlayerGo).toBe('/audio/voices/player-go.wav');
    expect(VOICE_AUDIO_ASSETS.voiceOpponentStop).toBe('/audio/voices/opponent-stop.wav');
  });
});
