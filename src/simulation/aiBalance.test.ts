import { describe, expect, it } from 'vitest';
import { AI_DIFFICULTIES, AI_DIFFICULTY_ORDER } from '../engine/ai/settings';
import { simulateDifficulty } from './aiBalance';

describe('AI 1,000판 승률 균형', () => {
  const summaries = new Map<(typeof AI_DIFFICULTY_ORDER)[number], ReturnType<typeof simulateDifficulty>>();
  const summaryFor = (difficulty: (typeof AI_DIFFICULTY_ORDER)[number]) => {
    const cached = summaries.get(difficulty);
    if (cached) return cached;
    const result = simulateDifficulty(1_000, difficulty);
    summaries.set(difficulty, result);
    return result;
  };

  for (const difficulty of AI_DIFFICULTY_ORDER) {
    it(`${AI_DIFFICULTIES[difficulty].label} 난이도가 목표 범위에 들어온다`, () => {
      const result = summaryFor(difficulty);
      const [minimum, maximum] = AI_DIFFICULTIES[difficulty].targetWinRate;
      console.info('[AI balance]', result);
      expect(result.stalled).toBe(0);
      expect(result.computerWinRate).toBeGreaterThanOrEqual(minimum);
      expect(result.computerWinRate).toBeLessThanOrEqual(maximum);
    });
  }

  it('초고수는 같은 1,000판에서 어려움보다 더 높은 승률을 보인다', () => {
    expect(summaryFor('expert').computerWinRate).toBeGreaterThan(summaryFor('hard').computerWinRate);
  });
});
