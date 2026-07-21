import { describe, expect, it } from 'vitest';
import {
  escalateGameMusicMood,
  gameMusicMoodForGoCount,
  gameMusicMoodForScore,
  getGameMusicProfile
} from '../lib/gameMusic';

describe('상황별 배경음 분위기', () => {
  it('승부가 긴박해질수록 템포와 음량을 단계적으로 높인다', () => {
    const calm = getGameMusicProfile('calm');
    const active = getGameMusicProfile('active');
    const tense = getGameMusicProfile('tense');
    const climax = getGameMusicProfile('climax');
    expect(active.playbackRate).toBeGreaterThan(calm.playbackRate);
    expect(tense.playbackRate).toBeGreaterThan(active.playbackRate);
    expect(climax.playbackRate).toBeGreaterThan(tense.playbackRate);
    expect(climax.gain).toBeGreaterThan(calm.gain);
  });

  it('점수와 고 횟수에 맞는 긴박도를 선택한다', () => {
    expect(gameMusicMoodForScore(2)).toBe('active');
    expect(gameMusicMoodForScore(6)).toBe('tense');
    expect(gameMusicMoodForScore(12)).toBe('climax');
    expect(gameMusicMoodForGoCount(1)).toBe('tense');
    expect(gameMusicMoodForGoCount(3)).toBe('climax');
  });

  it('한 판 안에서는 더 약한 사건으로 긴박도가 내려가지 않는다', () => {
    expect(escalateGameMusicMood('tense', 'active')).toBe('tense');
    expect(escalateGameMusicMood('active', 'climax')).toBe('climax');
    expect(getGameMusicProfile('result').playbackRate).toBeLessThan(1);
  });
});
