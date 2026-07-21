import { describe, expect, it } from 'vitest';
import { EFFECT_AUDIO_ASSETS, GAME_AUDIO_ASSETS, VOICE_AUDIO_ASSETS } from '../lib/audioAssets';

describe('게임 오디오 자산', () => {
  it('공개 배경음과 효과음 경로를 제공한다', () => {
    expect(GAME_AUDIO_ASSETS.background).toMatch(/^\/audio\//);
    expect(Object.values(GAME_AUDIO_ASSETS)).toEqual(expect.arrayContaining([
      '/audio/card-deal.mp3',
      '/audio/card-slide.mp3',
      '/audio/card-contact.mp3',
      '/audio/wood-block.mp3'
    ]));
    expect(Object.keys(EFFECT_AUDIO_ASSETS)).toHaveLength(41);
    expect(Object.values(EFFECT_AUDIO_ASSETS).filter(path => path.startsWith('/audio/effects/'))).toHaveLength(37);
    expect(EFFECT_AUDIO_ASSETS.effectBomb).toBe('/audio/effects/bomb.wav');
    expect(EFFECT_AUDIO_ASSETS.effectMoneyLose).toBe('/audio/effects/money-lose.wav');
    expect(EFFECT_AUDIO_ASSETS.effectChongtong).toBe('/audio/effects/chongtong.wav');
    expect(EFFECT_AUDIO_ASSETS.effectDealerHuman).toBe('/audio/effects/dealer-human.wav');
  });

  it('게임 사건별 사전 생성 한국어 음성을 제공한다', () => {
    expect(Object.keys(VOICE_AUDIO_ASSETS)).toHaveLength(99);
    expect(Object.values(VOICE_AUDIO_ASSETS).every(path => path.startsWith('/audio/voices/'))).toBe(true);
    expect(VOICE_AUDIO_ASSETS.voicePlayerGo).toBe('/audio/voices/player-go.wav');
    expect(VOICE_AUDIO_ASSETS.voiceOpponentStop).toBe('/audio/voices/opponent-stop.wav');
    expect(VOICE_AUDIO_ASSETS.voicePlayerChongtong).toBe('/audio/voices/player-chongtong.wav');
    expect(VOICE_AUDIO_ASSETS.voiceGookjinDouble).toBe('/audio/voices/gookjin-double.wav');
    expect(VOICE_AUDIO_ASSETS.voiceGostopComputerAGo).toBe('/audio/voices/gostop-computer-a-go.wav');
    expect(VOICE_AUDIO_ASSETS.voiceGostopComputerAWin).toBe('/audio/voices/gostop-computer-a-win.wav');
    expect(VOICE_AUDIO_ASSETS.voiceMatgoFemaleGo).toBe('/audio/voices/matgo-female-go.wav');
    expect(VOICE_AUDIO_ASSETS.voiceGostopComputerBGo).toBe('/audio/voices/gostop-computer-b-go.wav');
    expect(VOICE_AUDIO_ASSETS.voiceGostopComputerBWin).toBe('/audio/voices/gostop-computer-b-win.wav');
    expect(VOICE_AUDIO_ASSETS.voiceGostopComputerCGo).toBe('/audio/voices/gostop-computer-c-go.wav');
    expect(VOICE_AUDIO_ASSETS.voiceGostopComputerCWin).toBe('/audio/voices/gostop-computer-c-win.wav');
    expect(VOICE_AUDIO_ASSETS.voiceGostopComputerDGo).toBe('/audio/voices/gostop-computer-d-go.wav');
    expect(VOICE_AUDIO_ASSETS.voiceGostopComputerDWin).toBe('/audio/voices/gostop-computer-d-win.wav');
  });
});
