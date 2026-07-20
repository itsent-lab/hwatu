import type { AiDifficulty, AiDifficultyConfig } from './types';

export const AI_DIFFICULTIES: Readonly<Record<AiDifficulty, AiDifficultyConfig>> = Object.freeze({
  easy: Object.freeze({
    difficulty: 'easy', label: '쉬움', optimalMoveProbability: 0.37,
    easyStopProbability: 0.8, goRiskTolerance: 0.25, targetWinRate: [0.3, 0.4] as const
  }),
  normal: Object.freeze({
    difficulty: 'normal', label: '보통', optimalMoveProbability: 0.75,
    easyStopProbability: 0, goRiskTolerance: 0.52, targetWinRate: [0.45, 0.55] as const
  }),
  hard: Object.freeze({
    difficulty: 'hard', label: '어려움', optimalMoveProbability: 1,
    easyStopProbability: 0, goRiskTolerance: 0.68, targetWinRate: [0.55, 0.65] as const
  }),
  expert: Object.freeze({
    difficulty: 'expert', label: '초고수', optimalMoveProbability: 1,
    easyStopProbability: 0, goRiskTolerance: 0, targetWinRate: [0.58, 0.65] as const
  })
});

export const AI_DIFFICULTY_ORDER: readonly AiDifficulty[] = Object.freeze(['easy', 'normal', 'hard', 'expert']);

export function isAiDifficulty(value: unknown): value is AiDifficulty {
  return value === 'easy' || value === 'normal' || value === 'hard' || value === 'expert';
}

export function aiDifficultyLabel(difficulty: AiDifficulty): string {
  return AI_DIFFICULTIES[difficulty].label;
}
