import { getCard } from '../engine/cards';

export interface PeeTransferSummary {
  cardCount: number;
  totalValue: number;
  strongestBurst: 2 | 3 | null;
}

export function bonusPeeBurst(cardIds: string[]) {
  const values = cardIds.map(cardId => getCard(cardId)?.tags.includes('triple-junk') ? 3 : 2);
  const strongest = values.includes(3) ? 3 : 2;
  return {
    kind: strongest === 3 ? 'triple-pee' as const : 'double-pee' as const,
    strongest: strongest as 2 | 3,
    totalValue: values.reduce((total, value) => total + value, 0)
  };
}

export function peeCardValue(cardId: string): number {
  const card = getCard(cardId);
  if (card?.tags.includes('triple-junk')) return 3;
  if (card?.type === 'doubleJunk') return 2;
  return card?.type === 'junk' ? 1 : 0;
}

export function summarizePeeTransfer(cardIds: string[]): PeeTransferSummary {
  const values = cardIds.map(peeCardValue).filter(value => value > 0);
  const strongest = values.reduce((highest, value) => Math.max(highest, value), 0);
  return {
    cardCount: values.length,
    totalValue: values.reduce((total, value) => total + value, 0),
    strongestBurst: strongest >= 3 ? 3 : strongest >= 2 ? 2 : null
  };
}

export function describePeeTransfer(cardIds: string[], stolenByOpponent: boolean): string {
  const summary = summarizePeeTransfer(cardIds);
  if (!summary.cardCount) return '가져올 피가 없습니다.';
  const owner = stolenByOpponent ? '내' : '상대';
  const action = stolenByOpponent ? '뺏김' : '뺏기';
  if (summary.cardCount === 1 && summary.strongestBurst) {
    const name = summary.strongestBurst === 3 ? '쓰리피' : '쌍피';
    return `${owner} ${name} 1장(피 ${summary.totalValue}장 값) ${action}`;
  }
  if (summary.strongestBurst) {
    const name = summary.strongestBurst === 3 ? '쓰리피' : '쌍피';
    return `${owner} ${name} 포함 · 피 ${summary.totalValue}장 값 ${action}`;
  }
  return `${owner} 피 ${summary.cardCount}장 ${action}`;
}
