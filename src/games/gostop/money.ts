import type { GostopPlayerId } from './gameState';

export const DEFAULT_GOSTOP_COMPUTER_BALANCE = 500_000;
export const MAX_GOSTOP_BALANCE = 999_999_999_999;

export interface GostopBalances {
  human: number;
  computerA: number;
  computerB: number;
}

export function settleGostopBalances(
  balances: GostopBalances,
  winner: GostopPlayerId,
  amountPerOpponent: number
): GostopBalances {
  const next = { ...balances };
  const requested = Math.max(0, Math.trunc(amountPerOpponent));
  const losers = (Object.keys(next) as GostopPlayerId[]).filter(player => player !== winner);
  for (const loser of losers) {
    const payment = Math.min(requested, Math.max(0, next[loser]), Math.max(0, MAX_GOSTOP_BALANCE - next[winner]));
    next[loser] -= payment;
    next[winner] += payment;
  }
  return next;
}
