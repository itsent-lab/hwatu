import { describe, expect, it } from 'vitest';
import { loadAiDifficulty, loadDiscardConfirmation, loadGostopAiDifficulty, loadGostopPointValue, loadPointValue, saveAiDifficulty, saveDiscardConfirmation, saveGostopAiDifficulty, saveGostopPointValue, savePointValue } from '../lib/gamePreferences';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, next: string) => { values.set(key, next); }
  };
}

describe('AI 난이도 기기 설정', () => {
  it('저장값이 없거나 잘못되면 보통을 사용한다', () => {
    expect(loadAiDifficulty(memoryStorage())).toBe('normal');
    expect(loadAiDifficulty(memoryStorage({ 'nsrnb-hwatu-ai-difficulty-v1': 'legend' }))).toBe('normal');
  });

  it('네 난이도를 기기에 저장하고 다시 읽는다', () => {
    const storage = memoryStorage();
    saveAiDifficulty('expert', storage);
    expect(loadAiDifficulty(storage)).toBe('expert');
  });

  it('고스톱 AI 난이도를 맞고와 별도로 저장한다', () => {
    const storage = memoryStorage();
    saveAiDifficulty('easy', storage);
    saveGostopAiDifficulty('expert', storage);
    expect(loadAiDifficulty(storage)).toBe('easy');
    expect(loadGostopAiDifficulty(storage)).toBe('expert');
  });

  it('점당 100냥·1천냥·2천냥·5천냥·1만냥만 기억한다', () => {
    const storage = memoryStorage();
    for (const pointValue of [100, 1_000, 2_000, 5_000, 10_000] as const) {
      savePointValue(pointValue, storage);
      expect(loadPointValue(storage)).toBe(pointValue);
    }
    expect(loadPointValue(memoryStorage({ 'nsrnb-hwatu-point-value-v1': '500' }))).toBe(100);
  });

  it('고스톱 점당 금액은 맞고와 다른 설정으로 기억한다', () => {
    const storage = memoryStorage();
    savePointValue(1_000, storage);
    saveGostopPointValue(5_000, storage);
    expect(loadPointValue(storage)).toBe(1_000);
    expect(loadGostopPointValue(storage)).toBe(5_000);
    expect(loadGostopPointValue(memoryStorage({ 'nsrnb-hwatu-gostop-point-value-v1': '500' }))).toBe(100);
  });

  it('버림패 확인은 기본으로 끄고 기기별 선택을 기억한다', () => {
    const storage = memoryStorage();
    expect(loadDiscardConfirmation(storage)).toBe(false);
    saveDiscardConfirmation(true, storage);
    expect(loadDiscardConfirmation(storage)).toBe(true);
  });
});
