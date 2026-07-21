import type { GostopPlayerId } from './gameState';
import { GOSTOP_PLAYERS, type GostopPointDeltas } from './settlement';

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
  if (next.computerA === 0) next.computerA = DEFAULT_GOSTOP_COMPUTER_BALANCE;
  if (next.computerB === 0) next.computerB = DEFAULT_GOSTOP_COMPUTER_BALANCE;
  return next;
}

export function settleGostopPointDeltas(
  balances: GostopBalances,
  pointDeltas: GostopPointDeltas,
  pointValue: number
): GostopBalances {
  const next = { ...balances };
  const unit = Math.max(0, Math.trunc(pointValue));
  const remainingDebts = new Map(GOSTOP_PLAYERS
    .filter(player => pointDeltas[player] < 0)
    .map(player => [player, Math.max(0, -Math.trunc(pointDeltas[player])) * unit]));
  const remainingCredits = new Map(GOSTOP_PLAYERS
    .filter(player => pointDeltas[player] > 0)
    .map(player => [player, Math.max(0, Math.trunc(pointDeltas[player])) * unit]));

  for (const debtor of GOSTOP_PLAYERS) {
    let debt = remainingDebts.get(debtor) ?? 0;
    if (debt <= 0) continue;
    for (const creditor of GOSTOP_PLAYERS) {
      const credit = remainingCredits.get(creditor) ?? 0;
      if (credit <= 0) continue;
      const payment = Math.min(debt, credit, Math.max(0, next[debtor]), Math.max(0, MAX_GOSTOP_BALANCE - next[creditor]));
      next[debtor] -= payment;
      next[creditor] += payment;
      debt -= payment;
      remainingCredits.set(creditor, credit - payment);
      if (debt <= 0 || next[debtor] <= 0) break;
    }
  }
  if (next.computerA === 0) next.computerA = DEFAULT_GOSTOP_COMPUTER_BALANCE;
  if (next.computerB === 0) next.computerB = DEFAULT_GOSTOP_COMPUTER_BALANCE;
  return next;
}
