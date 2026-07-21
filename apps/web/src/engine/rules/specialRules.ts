import { getCard } from '../cards';

export interface BombOption {
  month: number;
  handCardIds: string[];
  floorCardIds: string[];
  kind: 'two-card-bomb' | 'three-card-bomb' | 'four-card-bomb';
}

export interface ShakeOption {
  month: number;
  handCardIds: string[];
}

export interface ChongtongResult {
  kind: 'none' | 'nagari' | 'player-choice';
  owner: 'human' | 'computer' | null;
  month: number | null;
  canShakeFour: boolean;
  canBombAfterContinue: boolean;
  reason: string;
}

function groupByMonth(cardIds: string[]): Map<number, string[]> {
  const grouped = new Map<number, string[]>();
  cardIds.forEach(id => {
    const month = getCard(id)?.month;
    if (!month) return;
    grouped.set(month, [...(grouped.get(month) ?? []), id]);
  });
  return grouped;
}

export function findBombOptions(handCardIds: string[], floorCardIds: string[], allowTwoCardBomb = true): BombOption[] {
  const hand = groupByMonth(handCardIds);
  const floor = groupByMonth(floorCardIds);
  const options: BombOption[] = [];
  hand.forEach((handCards, month) => {
    const floorCards = floor.get(month) ?? [];
    if (handCards.length === 3 && floorCards.length === 1) options.push({ month, handCardIds: handCards, floorCardIds: floorCards, kind: 'three-card-bomb' });
    if (allowTwoCardBomb && handCards.length === 2 && floorCards.length === 2) options.push({ month, handCardIds: handCards, floorCardIds: floorCards, kind: 'two-card-bomb' });
    if (handCards.length === 4 && floorCards.length === 0) options.push({ month, handCardIds: handCards, floorCardIds: [], kind: 'four-card-bomb' });
  });
  return options;
}

export function findShakeOptions(handCardIds: string[], floorCardIds: string[], shakenMonths: number[] = []): ShakeOption[] {
  const hand = groupByMonth(handCardIds);
  const floor = groupByMonth(floorCardIds);
  const alreadyShaken = new Set(shakenMonths);
  const options: ShakeOption[] = [];
  hand.forEach((handCards, month) => {
    if (handCards.length === 3 && (floor.get(month)?.length ?? 0) === 0 && !alreadyShaken.has(month)) {
      options.push({ month, handCardIds: handCards });
    }
  });
  return options;
}

export function evaluateChongtong(humanHand: string[], computerHand: string[], floorCards: string[]): ChongtongResult {
  const floorTotal = [...groupByMonth(floorCards).entries()].find(([, cards]) => cards.length === 4);
  const humanTotal = [...groupByMonth(humanHand).entries()].find(([, cards]) => cards.length === 4);
  const computerTotal = [...groupByMonth(computerHand).entries()].find(([, cards]) => cards.length === 4);
  if (floorTotal) return { kind: 'nagari', owner: null, month: floorTotal[0], canShakeFour: false, canBombAfterContinue: false, reason: '바닥패 총통으로 나가리입니다.' };
  if (humanTotal && computerTotal) return { kind: 'nagari', owner: null, month: null, canShakeFour: false, canBombAfterContinue: false, reason: '양쪽 모두 총통이라 나가리입니다.' };
  const owner = humanTotal ? 'human' : computerTotal ? 'computer' : null;
  const total = humanTotal ?? computerTotal;
  if (owner && total) return { kind: 'player-choice', owner, month: total[0], canShakeFour: true, canBombAfterContinue: true, reason: `${owner === 'human' ? '내' : '상대'} 손패에 ${total[0]}월 총통이 있습니다.` };
  return { kind: 'none', owner: null, month: null, canShakeFour: false, canBombAfterContinue: false, reason: '' };
}

export function stealPeeForBonus(opponentCaptured: string[]): { stolenCardId: string | null; remaining: string[] } {
  const junkValue = (cardId: string) => {
    const card = getCard(cardId);
    if (card?.tags.includes('triple-junk')) return 3;
    if (card?.type === 'doubleJunk') return 2;
    if (card?.type === 'junk') return 1;
    return Number.POSITIVE_INFINITY;
  };
  let index = -1;
  let smallestValue = Number.POSITIVE_INFINITY;
  opponentCaptured.forEach((cardId, candidateIndex) => {
    const value = junkValue(cardId);
    if (value < smallestValue) { index = candidateIndex; smallestValue = value; }
  });
  if (index < 0) return { stolenCardId: null, remaining: [...opponentCaptured] };
  const remaining = [...opponentCaptured];
  const [stolenCardId] = remaining.splice(index, 1);
  return { stolenCardId, remaining };
}

export function stealPeeCards(opponentCaptured: string[], count: number): { stolenCardIds: string[]; remaining: string[] } {
  let remaining = [...opponentCaptured];
  const stolenCardIds: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const stolen = stealPeeForBonus(remaining);
    if (!stolen.stolenCardId) break;
    stolenCardIds.push(stolen.stolenCardId);
    remaining = stolen.remaining;
  }
  return { stolenCardIds, remaining };
}

export function stealPeeByValue(opponentCaptured: string[], targetValue: number): { stolenCardIds: string[]; remaining: string[] } {
  let remaining = [...opponentCaptured];
  const stolenCardIds: string[] = [];
  let stolenValue = 0;
  while (stolenValue < targetValue) {
    const stolen = stealPeeForBonus(remaining);
    if (!stolen.stolenCardId) break;
    const card = getCard(stolen.stolenCardId);
    stolenCardIds.push(stolen.stolenCardId);
    stolenValue += card?.tags.includes('triple-junk') ? 3 : card?.type === 'doubleJunk' ? 2 : 1;
    remaining = stolen.remaining;
  }
  return { stolenCardIds, remaining };
}

export function applyBonusPeeCapture(actorCaptured: string[], opponentCaptured: string[], bonusCardId: string) {
  if (!getCard(bonusCardId)?.tags.includes('bonus-pee')) throw new Error('보너스피가 아닌 패입니다.');
  const stolen = stealPeeForBonus(opponentCaptured);
  return {
    actorCaptured: [...actorCaptured, bonusCardId, ...(stolen.stolenCardId ? [stolen.stolenCardId] : [])],
    opponentCaptured: stolen.remaining,
    stolenCardId: stolen.stolenCardId
  };
}

export function isThreePpeok(ppeokCount: number): boolean {
  return ppeokCount >= 3;
}
