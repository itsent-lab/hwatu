import type { RoundSettlement } from './rules/types';
import type { AiDifficulty } from './ai/types';
import type { MatgoPointValue } from './rules/settings';
import type { RoundMultiplier } from './rules/nagari';

export type CardType = 'bright' | 'animal' | 'ribbon' | 'junk' | 'doubleJunk';
export type PlayerId = 'human' | 'computer';

export interface PpeokPile {
  month: number;
  owner: PlayerId;
  cardIds: string[];
}

export type TurnSpecialKind = 'ppeok' | 'ppeok-capture' | 'self-ppeok' | 'jjok' | 'ttadak' | 'sweep' | 'bomb';

export interface TurnSpecialEvent {
  kind: TurnSpecialKind;
  label: string;
  stolenPee: string[];
}

export interface CardMission {
  kind: 'gakpae';
  cardIds: string[];
}

export interface HwatuCard {
  id: string;
  month: number;
  monthName: string;
  familyName: string;
  type: CardType;
  typeLabel: string;
  name: string;
  imageKey: string;
  tags: readonly string[];
}

export interface GameState {
  stateVersion: number;
  gameUuid: string;
  gameMode: 'matgo';
  computerDifficulty?: AiDifficulty;
  pointValue?: MatgoPointValue;
  roundMultiplier?: RoundMultiplier;
  randomSeed: number;
  turnNumber: number;
  currentPlayer: PlayerId;
  startingPlayer?: PlayerId;
  startingPlayerConfirmed?: boolean;
  phase: 'playing' | 'awaiting-go-stop' | 'awaiting-chongtong' | 'round-ended';
  pendingDecision: PlayerId | null;
  humanHand: string[];
  computerHand: string[];
  floorCards: string[];
  drawPile: string[];
  humanCaptured: string[];
  computerCaptured: string[];
  humanGoCount: number;
  computerGoCount: number;
  humanScoreAtLastGo: number;
  computerScoreAtLastGo: number;
  humanPpeokCount: number;
  computerPpeokCount: number;
  humanOpeningPpeokCount?: number;
  computerOpeningPpeokCount?: number;
  humanSweepCount?: number;
  computerSweepCount?: number;
  ppeokPiles?: PpeokPile[];
  mission?: CardMission;
  humanBombSkips: number;
  computerBombSkips: number;
  humanShakeCount?: number;
  computerShakeCount?: number;
  humanBombCount?: number;
  computerBombCount?: number;
  humanUndoCount?: number;
  humanShakenMonths?: number[];
  computerShakenMonths?: number[];
  humanPendingShakeMonth?: number | null;
  computerPendingShakeMonth?: number | null;
  lastDiscardedCardId?: string | null;
  lastDiscardedBy?: PlayerId | null;
  humanGookjinAsDoubleJunk: boolean;
  computerGookjinAsDoubleJunk: boolean;
  chongtongOwner: PlayerId | null;
  chongtongMonth: number | null;
  canShakeFour: boolean;
  canBombAfterChongtong: boolean;
  winner: PlayerId | null;
  roundResult: 'win' | 'nagari' | null;
  settlement: RoundSettlement | null;
  lastAction: string;
  createdAt: string;
}

export interface TurnResult {
  state: GameState;
  playedCardId: string | null;
  drawnCardId: string | null;
  captured: string[];
  ppeok: boolean;
  bonusCards?: string[];
  stolenPee?: string[];
  bonusStolenPee?: string[];
  specialEvents?: TurnSpecialEvent[];
  missionCards?: string[];
  missionMultiplier?: number;
  replacementCardId?: string | null;
  continuesTurn?: boolean;
}
