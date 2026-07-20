import type { AiDifficulty } from './types';

export type AiThinkingKind = 'turn' | 'go-stop' | 'chongtong';

export interface AiThinkingPlan {
  durationMs: number;
  endsAt: number;
  label: string;
}

const TURN_RANGES: Record<AiDifficulty, readonly [number, number]> = {
  easy: [650, 1050],
  normal: [800, 1350],
  hard: [950, 1600],
  expert: [1050, 1800]
};

const LONG_THOUGHT_THRESHOLD = 0.72;
const MAX_THINKING_MS = 5000;

function thinkingVariation(seed: number, turnNumber: number): number {
  const mixed = Math.sin(seed * 0.017 + turnNumber * 12.9898 + 17) * 43758.5453;
  return Math.abs(mixed - Math.trunc(mixed));
}

export function createAiThinkingPlan(
  difficulty: AiDifficulty,
  seed: number,
  turnNumber: number,
  kind: AiThinkingKind,
  autoPlay: boolean,
  now = Date.now()
): AiThinkingPlan {
  const variation = thinkingVariation(seed, turnNumber);
  const [minimum, maximum] = TURN_RANGES[difficulty];
  const needsDeliberation = kind !== 'turn' || variation > LONG_THOUGHT_THRESHOLD;
  const quickDuration = minimum + (maximum - minimum) * variation;
  const thoughtfulDuration = 2200 + variation * 2800;
  const naturalDuration = Math.min(MAX_THINKING_MS, Math.round(needsDeliberation ? thoughtfulDuration : quickDuration));
  const durationMs = autoPlay ? Math.round(520 + variation * 180) : naturalDuration;
  const label = kind === 'go-stop'
    ? '고·스톱을 고민하는 중…'
    : kind === 'chongtong'
      ? '총통 승부를 고민하는 중…'
      : variation > 0.72 ? '한 수 더 살펴보는 중…' : '낼 패를 고르는 중…';
  return { durationMs, endsAt: now + durationMs, label };
}
