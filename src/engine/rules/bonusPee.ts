import { getCard } from '../cards';
import type { GameState, PlayerId } from '../types';
import { applyBonusPeeCapture } from './specialRules';

interface BonusCaptureResult {
  cardId: string;
  stolenCardId: string | null;
}

export interface BonusDrawResult {
  drawnCardId: string | null;
  bonusCards: string[];
  stolenPee: string[];
}

const captureKeys = (player: PlayerId) => player === 'human'
  ? { actor: 'humanCaptured', opponent: 'computerCaptured' } as const
  : { actor: 'computerCaptured', opponent: 'humanCaptured' } as const;

export const isBonusPee = (cardId: string | null | undefined): boolean =>
  Boolean(cardId && getCard(cardId)?.tags.includes('bonus-pee'));

export function captureBonusPee(state: GameState, player: PlayerId, cardId: string): BonusCaptureResult {
  const keys = captureKeys(player);
  const captured = applyBonusPeeCapture(state[keys.actor], state[keys.opponent], cardId);
  state[keys.actor] = captured.actorCaptured;
  state[keys.opponent] = captured.opponentCaptured;
  return { cardId, stolenCardId: captured.stolenCardId };
}

export function drawThroughBonusPee(state: GameState, player: PlayerId): BonusDrawResult {
  const bonusCards: string[] = [];
  const stolenPee: string[] = [];
  while (state.drawPile.length) {
    const cardId = state.drawPile.shift()!;
    if (!isBonusPee(cardId)) return { drawnCardId: cardId, bonusCards, stolenPee };
    const captured = captureBonusPee(state, player, cardId);
    bonusCards.push(cardId);
    if (captured.stolenCardId) stolenPee.push(captured.stolenCardId);
  }
  return { drawnCardId: null, bonusCards, stolenPee };
}

export function playBonusPeeFromHand(state: GameState, player: PlayerId, cardId: string) {
  const handKey = player === 'human' ? 'humanHand' : 'computerHand';
  const handIndex = state[handKey].indexOf(cardId);
  if (handIndex < 0 || !isBonusPee(cardId)) throw new Error('손에 있는 보너스패가 아닙니다.');
  state[handKey].splice(handIndex, 1);
  const captured = captureBonusPee(state, player, cardId);
  const replacementCardId = state.drawPile.shift() ?? null;
  if (replacementCardId) state[handKey].push(replacementCardId);
  return {
    bonusCards: [cardId],
    stolenPee: captured.stolenCardId ? [captured.stolenCardId] : [],
    replacementCardId
  };
}
