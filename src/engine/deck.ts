import { BONUS_PEE_CARDS, getCard, HWATU_CARDS } from './cards';
import { normalizeSeed, randomInteger } from './random';
import type { PlayerId } from './types';

export const createDeck = (): string[] => HWATU_CARDS.map(card => card.id);
export const createMatgoDeck = (): string[] => [...createDeck(), ...BONUS_PEE_CARDS.map(card => card.id)];

export function shuffleDeck(cardIds: string[] = createDeck(), initialSeed = Date.now()): { cards: string[]; seed: number } {
  const cards = [...cardIds];
  let seed = normalizeSeed(initialSeed);
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const random = randomInteger(seed, index + 1);
    seed = random.seed;
    [cards[index], cards[random.value]] = [cards[random.value], cards[index]];
  }
  return { cards, seed };
}

export function dealMatgo(shuffledCards: string[], startingPlayer: PlayerId = 'human') {
  if (shuffledCards.length !== 50) throw new RangeError('New Matgo requires 48 cards and 2 bonus cards');
  const cards = [...shuffledCards];
  const humanHand = cards.splice(0, 10);
  const computerHand = cards.splice(0, 10);
  const initialFloor = cards.splice(0, 8);
  const initialBonusCards = initialFloor.filter(cardId => getCard(cardId)?.tags.includes('bonus-pee'));
  const floorCards = initialFloor.filter(cardId => !getCard(cardId)?.tags.includes('bonus-pee'));
  while (floorCards.length < 8 && cards.length) {
    const replacement = cards.shift()!;
    if (getCard(replacement)?.tags.includes('bonus-pee')) initialBonusCards.push(replacement);
    else floorCards.push(replacement);
  }
  return {
    humanHand, computerHand, floorCards, drawPile: cards,
    humanCaptured: startingPlayer === 'human' ? initialBonusCards : [],
    computerCaptured: startingPlayer === 'computer' ? initialBonusCards : []
  };
}

export function dealGostop(shuffledCards: string[]) {
  if (shuffledCards.length !== 50) throw new RangeError('Gostop requires 48 cards and 2 bonus cards');
  const cards = [...shuffledCards];
  const humanHand = cards.splice(0, 7);
  const computerAHand = cards.splice(0, 7);
  const computerBHand = cards.splice(0, 7);
  const initialFloor = cards.splice(0, 6);
  const initialBonusCards = initialFloor.filter(cardId => getCard(cardId)?.tags.includes('bonus-pee'));
  const floorCards = initialFloor.filter(cardId => !getCard(cardId)?.tags.includes('bonus-pee'));
  while (floorCards.length < 6 && cards.length) {
    const replacement = cards.shift()!;
    if (getCard(replacement)?.tags.includes('bonus-pee')) initialBonusCards.push(replacement);
    else floorCards.push(replacement);
  }
  return {
    humanHand, computerAHand, computerBHand, floorCards, drawPile: cards, initialBonusCards
  };
}
