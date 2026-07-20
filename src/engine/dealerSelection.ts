import { cardsForMonth, getCard } from './cards';
import { normalizeSeed, randomInteger } from './random';
import { shuffleDeck } from './deck';
import type { CardType, PlayerId } from './types';

const TYPE_RANK: Record<CardType, number> = {
  bright: 5,
  animal: 4,
  ribbon: 3,
  doubleJunk: 2,
  junk: 1
};

export function createDealerSelectionCards(initialSeed: number): string[] {
  let seed = normalizeSeed(initialSeed ^ 0x51f15e);
  const onePerMonth = Array.from({ length: 12 }, (_, index) => {
    const candidates = cardsForMonth(index + 1);
    const random = randomInteger(seed, candidates.length);
    seed = random.seed;
    return candidates[random.value].id;
  });
  return shuffleDeck(onePerMonth, seed).cards;
}

export function chooseComputerDealerIndex(cardIds: string[], humanIndex: number, initialSeed: number): number {
  const candidates = cardIds.map((_, index) => index).filter(index => index !== humanIndex);
  const random = randomInteger(initialSeed ^ ((humanIndex + 1) * 0x9e3779), candidates.length);
  return candidates[random.value];
}

export function determineDealerWinner(humanCardId: string, computerCardId: string, daytime: boolean): PlayerId | null {
  const human = getCard(humanCardId);
  const computer = getCard(computerCardId);
  if (!human || !computer) throw new Error('선 정하기 패가 올바르지 않습니다.');
  if (human.month !== computer.month) {
    const humanWins = daytime ? human.month > computer.month : human.month < computer.month;
    return humanWins ? 'human' : 'computer';
  }
  const rankDifference = TYPE_RANK[human.type] - TYPE_RANK[computer.type];
  return rankDifference === 0 ? null : rankDifference > 0 ? 'human' : 'computer';
}
