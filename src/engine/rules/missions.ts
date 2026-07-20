import { createDeck, shuffleDeck } from '../deck';
import type { CardMission, PlayerId } from '../types';

export interface MissionProgress {
  humanCardIds: string[];
  computerCardIds: string[];
  humanMultiplier: number;
  computerMultiplier: number;
}

export function createCardMission(seed: number): CardMission {
  const shuffled = shuffleDeck(createDeck(), seed ^ 0x5f3759df);
  return { kind: 'gakpae', cardIds: shuffled.cards.slice(0, 3) };
}

export function evaluateCardMission(
  mission: CardMission | null | undefined,
  humanCaptured: string[],
  computerCaptured: string[]
): MissionProgress {
  if (!mission) return { humanCardIds: [], computerCardIds: [], humanMultiplier: 1, computerMultiplier: 1 };
  const humanSet = new Set(humanCaptured);
  const computerSet = new Set(computerCaptured);
  const humanCardIds = mission.cardIds.filter(cardId => humanSet.has(cardId));
  const computerCardIds = mission.cardIds.filter(cardId => computerSet.has(cardId));
  return {
    humanCardIds,
    computerCardIds,
    humanMultiplier: 2 ** humanCardIds.length,
    computerMultiplier: 2 ** computerCardIds.length
  };
}

export function missionMultiplierFor(
  mission: CardMission | null | undefined,
  humanCaptured: string[],
  computerCaptured: string[],
  player: PlayerId
): number {
  const progress = evaluateCardMission(mission, humanCaptured, computerCaptured);
  return player === 'human' ? progress.humanMultiplier : progress.computerMultiplier;
}

export function capturedMissionCards(mission: CardMission | null | undefined, capturedCardIds: string[]): string[] {
  if (!mission) return [];
  const targets = new Set(mission.cardIds);
  return [...new Set(capturedCardIds.filter(cardId => targets.has(cardId)))];
}
