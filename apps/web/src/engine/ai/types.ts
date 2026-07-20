import type { PlayerId } from '../types';

export type AiDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type AiMove =
  | { kind: 'card'; cardId: string; playedMatchId?: string }
  | { kind: 'bomb'; month: number }
  | { kind: 'shake'; month: number }
  | { kind: 'flip-only' };

export interface MoveEvaluation {
  move: AiMove;
  immediateValue: number;
  opponentRisk: number;
  combinationValue: number;
  total: number;
  reason: string;
}

export interface AiMoveChoice {
  player: PlayerId;
  difficulty: AiDifficulty;
  move: AiMove | null;
  evaluations: MoveEvaluation[];
  selectedOptimal: boolean;
}

export interface AiDifficultyConfig {
  difficulty: AiDifficulty;
  label: string;
  optimalMoveProbability: number;
  easyStopProbability: number;
  goRiskTolerance: number;
  targetWinRate: readonly [number, number];
}
