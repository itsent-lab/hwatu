import { describe, expect, it } from 'vitest';
import { DEFAULT_AUDIO_SETTINGS, normalizeAudioSettings } from '../lib/audioSettings';

describe('오디오 설정', () => {
  it('처음에는 낮은 음량과 꺼진 배경음으로 시작한다', () => {
    expect(DEFAULT_AUDIO_SETTINGS).toEqual({ muted: false, volume: 0.28, backgroundMusic: false });
  });

  it('저장된 음량을 안전한 범위로 제한한다', () => {
    expect(normalizeAudioSettings({ muted: true, volume: 4, backgroundMusic: true })).toEqual({ muted: true, volume: 1, backgroundMusic: true });
    expect(normalizeAudioSettings({ muted: false, volume: -2, backgroundMusic: false }).volume).toBe(0);
  });

  it('잘못된 저장값에는 기본 설정을 사용한다', () => {
    expect(normalizeAudioSettings('broken')).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(normalizeAudioSettings({ volume: Number.NaN }).volume).toBe(DEFAULT_AUDIO_SETTINGS.volume);
  });
});
