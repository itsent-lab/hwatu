import type { CapturedScore } from '../../engine/rules/types';

export type GostopSettlementPlayer = 'human' | 'computerA' | 'computerB';
export type GostopPointDeltas = Record<GostopSettlementPlayer, number>;
export type GostopBakCode = 'pi-bak' | 'gwang-bak';

export interface GostopLoserPayment {
  loser: GostopSettlementPlayer;
  payer: GostopSettlementPlayer;
  points: number;
  baks: GostopBakCode[];
}

export interface GostopRoundSettlement {
  baseScore: number;
  goBonus: number;
  goMultiplier: number;
  shakeBombMultiplier: number;
  meongttaMultiplier: number;
  roundMultiplier: number;
  commonScore: number;
  dokbakPlayer: GostopSettlementPlayer | null;
  loserPayments: GostopLoserPayment[];
  pointDeltas: GostopPointDeltas;
}

export interface GostopSettlementPlayerState {
  score: CapturedScore;
  goCount: number;
  scoreAtLastGo: number;
  shakeCount: number;
  bombCount: number;
}

interface SettlementOptions {
  winner: GostopSettlementPlayer;
  players: Record<GostopSettlementPlayer, GostopSettlementPlayerState>;
  lastGoPlayer: GostopSettlementPlayer | null;
  roundMultiplier: number;
  interimPointDeltas: GostopPointDeltas;
  forcedBaseScore?: number;
  suppressMultipliers?: boolean;
}

export const GOSTOP_PLAYERS: readonly GostopSettlementPlayer[] = ['human', 'computerA', 'computerB'];

export function emptyGostopPointDeltas(): GostopPointDeltas {
  return { human: 0, computerA: 0, computerB: 0 };
}

export function addGostopReward(
  deltas: GostopPointDeltas,
  winner: GostopSettlementPlayer,
  pointsPerOpponent: number
): GostopPointDeltas {
  const next = { ...deltas };
  const points = Math.max(0, Math.trunc(pointsPerOpponent));
  for (const opponent of GOSTOP_PLAYERS) {
    if (opponent === winner) continue;
    next[opponent] -= points;
    next[winner] += points;
  }
  return next;
}

export function calculateGostopGoMultiplier(goCount: number): number {
  return goCount >= 3 ? 2 ** (goCount - 2) : 1;
}

export function calculateGostopSettlement(options: SettlementOptions): GostopRoundSettlement {
  const winnerState = options.players[options.winner];
  const suppress = options.suppressMultipliers ?? false;
  const baseScore = options.forcedBaseScore ?? winnerState.score.total;
  const goBonus = suppress ? 0 : winnerState.goCount;
  const goMultiplier = suppress ? 1 : calculateGostopGoMultiplier(winnerState.goCount);
  const shakeBombMultiplier = suppress ? 1 : 2 ** (winnerState.shakeCount + winnerState.bombCount);
  const meongttaMultiplier = !suppress && winnerState.score.animalCount >= 7 ? 2 : 1;
  const roundMultiplier = Math.max(1, options.roundMultiplier);
  const commonScore = (baseScore + goBonus) * goMultiplier * shakeBombMultiplier * meongttaMultiplier * roundMultiplier;
  const losers = GOSTOP_PLAYERS.filter(player => player !== options.winner);
  const dokbakPlayer = !suppress
    && options.lastGoPlayer !== null
    && options.lastGoPlayer !== options.winner
    && options.players[options.lastGoPlayer].goCount > 0
    && options.players[options.lastGoPlayer].score.total <= options.players[options.lastGoPlayer].scoreAtLastGo
    ? options.lastGoPlayer
    : null;
  const normalPayments = losers.map(loser => {
    const loserScore = options.players[loser].score;
    const baks: GostopBakCode[] = [];
    if (!suppress && winnerState.score.junkCount >= 10 && loserScore.junkCount <= 5) baks.push('pi-bak');
    if (!suppress && winnerState.score.brightCount >= 3 && loserScore.brightCount === 0) baks.push('gwang-bak');
    return { loser, points: commonScore * 2 ** baks.length, baks };
  });
  const loserPayments: GostopLoserPayment[] = normalPayments.map(payment => ({
    ...payment,
    payer: dokbakPlayer ?? payment.loser
  }));
  const pointDeltas = { ...options.interimPointDeltas };
  for (const payment of loserPayments) {
    pointDeltas[payment.payer] -= payment.points;
    pointDeltas[options.winner] += payment.points;
  }
  return {
    baseScore,
    goBonus,
    goMultiplier,
    shakeBombMultiplier,
    meongttaMultiplier,
    roundMultiplier,
    commonScore,
    dokbakPlayer,
    loserPayments,
    pointDeltas
  };
}
