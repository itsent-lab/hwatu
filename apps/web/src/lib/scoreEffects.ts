import { calculateCapturedScore } from '../engine/rules/scoring';
import type { ScoreLine } from '../engine/rules/types';
import type { GameState, PlayerId } from '../engine/types';

export interface ScoreCelebration {
  score: number;
  label: string;
  points: number;
}

export interface SettlementCelebration {
  text: string;
  detail: string;
}

const namedPriority = ['bright', 'godori', 'hongdan', 'cheongdan', 'chodan'];

function scoreFor(state: GameState, player: PlayerId) {
  return calculateCapturedScore(
    player === 'human' ? state.humanCaptured : state.computerCaptured,
    { gookjinAsDoubleJunk: player === 'human' ? state.humanGookjinAsDoubleJunk : state.computerGookjinAsDoubleJunk }
  );
}

function selectHeadline(lines: ScoreLine[]): ScoreLine | null {
  return [...lines].sort((left, right) => {
    const leftNamed = namedPriority.indexOf(left.code);
    const rightNamed = namedPriority.indexOf(right.code);
    if (leftNamed >= 0 || rightNamed >= 0) {
      if (leftNamed < 0) return 1;
      if (rightNamed < 0) return -1;
      return leftNamed - rightNamed;
    }
    return right.points - left.points;
  })[0] ?? null;
}

export function getScoreHeadline(state: GameState, player: PlayerId): ScoreCelebration | null {
  const score = scoreFor(state, player);
  const line = selectHeadline(score.lines);
  return line ? { score: score.total, label: line.label, points: line.points } : null;
}

export function getScoreCelebration(before: GameState, after: GameState, player: PlayerId): ScoreCelebration | null {
  const previous = scoreFor(before, player);
  const current = scoreFor(after, player);
  if (current.total <= previous.total) return null;

  const previousPoints = new Map(previous.lines.map(line => [line.code, line.points]));
  const changedLines = current.lines.filter(line => previousPoints.get(line.code) !== line.points);
  const line = selectHeadline(changedLines);
  return line ? { score: current.total, label: line.label, points: line.points - (previousPoints.get(line.code) ?? 0) } : null;
}

export function getSettlementCelebration(state: GameState, player: PlayerId): SettlementCelebration {
  const settlement = state.settlement;
  if (!settlement) return { text: '스톱!', detail: '점수를 확정했습니다.' };
  const line = selectHeadline(scoreFor(state, player).lines);
  const scoreText = line ? `${line.label} +${line.points}점 · 기본 ${settlement.baseScore}점` : `기본 ${settlement.baseScore}점`;
  const bakText = settlement.baks.map(bak => `${bak.label} ×${bak.multiplier}`).join(' · ');
  return {
    text: bakText ? `${bakText}!` : '스톱!',
    detail: `${scoreText} → 최종 ${settlement.finalScore}점`
  };
}
