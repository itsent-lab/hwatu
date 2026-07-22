import { getCard } from '../../engine/cards';
import { createGostopDeck, dealGostop, shuffleDeck } from '../../engine/deck';
import type { RoundMultiplier } from '../../engine/rules/nagari';
import { calculateCapturedScore } from '../../engine/rules/scoring';
import type { GameRuleSettings } from '../../engine/rules/settings';
import { findBombOptions, findShakeOptions, stealPeeCards, stealPeeForBonus, type BombOption, type ShakeOption } from '../../engine/rules/specialRules';
import type { CapturedScore } from '../../engine/rules/types';
import type { TurnSpecialEvent, TurnSpecialKind } from '../../engine/types';
import { COMPUTER_PLAYERS, computerPlayerActionLabel, type GostopComputerPlayers } from '../../lib/computerPlayers';
import {
  addGostopReward, calculateGostopSettlement, emptyGostopPointDeltas, GOSTOP_PLAYERS,
  type GostopPointDeltas, type GostopRoundSettlement
} from './settlement';
import type { GostopPointValue } from './settings';

export type GostopPlayerId = 'human' | 'computerA' | 'computerB';
export type GostopPhase = 'playing' | 'awaiting-go-stop' | 'round-ended';
export type GostopRoundResult = 'win' | 'nagari' | null;

export interface GostopPlayerState {
  hand: string[];
  captured: string[];
  goCount: number;
  scoreAtLastGo: number;
  gookjinAsDoubleJunk: boolean;
  turnCount: number;
  ppeokCount: number;
  openingPpeokCount: number;
  openingPpeokTotal: number;
  sweepCount: number;
  emptyCaptureStreak: number;
  shakeCount: number;
  bombCount: number;
  flipOnlyTurns: number;
  shakenMonths: number[];
  pendingShakeMonth: number | null;
}

export interface GostopPpeokPile {
  month: number;
  owner: GostopPlayerId;
  cardIds: string[];
}

export interface GostopRoomState {
  randomSeed: number;
  pointValue: GostopPointValue;
  roundMultiplier: RoundMultiplier;
  turnNumber: number;
  startingPlayer: GostopPlayerId;
  currentPlayer: GostopPlayerId;
  phase: GostopPhase;
  pendingDecision: GostopPlayerId | null;
  players: Record<GostopPlayerId, GostopPlayerState>;
  computerPlayers: GostopComputerPlayers;
  floorCards: string[];
  drawPile: string[];
  ppeokPiles: GostopPpeokPile[];
  lastSpecialEvents: TurnSpecialEvent[];
  lastGoPlayer: GostopPlayerId | null;
  interimPointDeltas: GostopPointDeltas;
  settlement: GostopRoundSettlement | null;
  winner: GostopPlayerId | null;
  roundResult: GostopRoundResult;
  finalScore: number;
  lastAction: string;
}

export interface GostopTurnResult {
  state: GostopRoomState;
  playedCardId: string;
  drawnCardId: string | null;
  captured: string[];
  bonusCards: string[];
  stolenPee: string[];
  specialEvents: TurnSpecialEvent[];
  replacementCardId: string | null;
  continuesTurn: boolean;
}

export const GOSTOP_RULES: Readonly<GameRuleSettings> = Object.freeze({
  targetScore: 3,
  pointValue: 100,
  bright: { rainThree: 2, three: 3, four: 4, five: 15 },
  setScore: 3,
  godoriScore: 5,
  animalStart: 5,
  ribbonStart: 5,
  junkStart: 10,
  bakMultiplier: 2,
  allowTwoCardBomb: false,
  threePpeokBaseScore: 3
});

export function nextGostopRoundMultiplier(roundResult: GostopRoundResult): RoundMultiplier {
  return roundResult === 'nagari' ? 2 : 1;
}

const PLAYER_ORDER: readonly GostopPlayerId[] = ['human', 'computerA', 'computerB'];
function playerActionLabel(state: GostopRoomState, player: GostopPlayerId): string {
  return player === 'human' ? '나' : computerPlayerActionLabel(player, state.computerPlayers);
}

function isGostopBonus(cardId: string | null | undefined) {
  return Boolean(cardId && getCard(cardId)?.tags.includes('bonus-pee'));
}

function nextPlayer(player: GostopPlayerId): GostopPlayerId {
  return PLAYER_ORDER[(PLAYER_ORDER.indexOf(player) + 1) % PLAYER_ORDER.length];
}

function sortHand(cardIds: string[]) {
  return [...cardIds].sort((left, right) => {
    const monthDifference = (getCard(left)?.month ?? 99) - (getCard(right)?.month ?? 99);
    return monthDifference || left.localeCompare(right);
  });
}

function hasChongtong(cardIds: string[]) {
  const counts = new Map<number, number>();
  for (const cardId of cardIds) {
    const month = getCard(cardId)?.month;
    if (!month) continue;
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return [...counts.values()].some(count => count === 4);
}

function emptyPlayer(hand: string[]): GostopPlayerState {
  return {
    hand: sortHand(hand), captured: [], goCount: 0, scoreAtLastGo: 0, gookjinAsDoubleJunk: false,
    turnCount: 0, ppeokCount: 0, openingPpeokCount: 0, openingPpeokTotal: 0, sweepCount: 0, emptyCaptureStreak: 0,
    shakeCount: 0, bombCount: 0, flipOnlyTurns: 0, shakenMonths: [], pendingShakeMonth: null
  };
}

export function createGostopRoom(
  randomSeed: number,
  pointValue: GostopPointValue,
  roundMultiplier: RoundMultiplier = 1,
  startingPlayer: GostopPlayerId = 'human',
  computerPlayers: GostopComputerPlayers = COMPUTER_PLAYERS
): GostopRoomState {
  const shuffled = shuffleDeck(createGostopDeck(), randomSeed);
  const dealt = dealGostop(shuffled.cards);
  const state: GostopRoomState = {
    randomSeed,
    pointValue,
    roundMultiplier,
    turnNumber: 0,
    startingPlayer,
    currentPlayer: startingPlayer,
    phase: 'playing',
    pendingDecision: null,
    players: {
      human: { ...emptyPlayer(dealt.humanHand), captured: startingPlayer === 'human' ? [...dealt.initialBonusCards] : [] },
      computerA: emptyPlayer(dealt.computerAHand),
      computerB: emptyPlayer(dealt.computerBHand)
    },
    computerPlayers,
    floorCards: dealt.floorCards,
    drawPile: dealt.drawPile,
    ppeokPiles: [],
    lastSpecialEvents: [],
    lastGoPlayer: null,
    interimPointDeltas: emptyGostopPointDeltas(),
    settlement: null,
    winner: null,
    roundResult: null,
    finalScore: 0,
    lastAction: `${roundMultiplier > 1 ? `나가리 이월로 이번 판 점수는 ${roundMultiplier}배입니다. ` : ''}${startingPlayer === 'human' ? '나' : computerPlayerActionLabel(startingPlayer, computerPlayers)}가 선으로 첫 패를 냅니다.${dealt.initialBonusCards.length ? ` 바닥 보너스패 ${dealt.initialBonusCards.length}장도 가져갔습니다.` : ''}`
  };
  if (startingPlayer !== 'human') state.players[startingPlayer].captured.push(...dealt.initialBonusCards);
  const chongtongOrder = [startingPlayer, nextPlayer(startingPlayer), nextPlayer(nextPlayer(startingPlayer))];
  const chongtong = chongtongOrder.find(player => hasChongtong(state.players[player].hand));
  if (chongtong) finishRound(state, chongtong, '총통 5점으로 이겼습니다.', { forcedBaseScore: 5, suppressMultipliers: true });
  return state;
}

export function scoreGostopPlayer(state: GostopRoomState, player: GostopPlayerId): CapturedScore {
  return calculateCapturedScore(state.players[player].captured, {
    settings: GOSTOP_RULES,
    gookjinAsDoubleJunk: state.players[player].gookjinAsDoubleJunk
  });
}

export function setGostopGookjinChoice(state: GostopRoomState, player: GostopPlayerId, asDoubleJunk: boolean): GostopRoomState {
  if (!state.players[player].captured.includes('m09-01')) throw new Error('국진 패를 획득하지 않았습니다.');
  const next = structuredClone(state);
  next.players[player].gookjinAsDoubleJunk = asDoubleJunk;
  const choiceAction = asDoubleJunk
    ? `${playerActionLabel(next, player)}가 국진을 쌍피로 바꿔 피 묶음으로 옮겼습니다.`
    : `${playerActionLabel(next, player)}가 국진을 열끗으로 바꿔 열끗 묶음으로 옮겼습니다.`;
  next.lastAction = choiceAction;
  const score = scoreGostopPlayer(next, player).total;
  const canDecide = score >= GOSTOP_RULES.targetScore && score > next.players[player].scoreAtLastGo;
  if (next.phase === 'awaiting-go-stop' && next.pendingDecision === player && !canDecide) {
    next.phase = 'playing';
    next.pendingDecision = null;
    next.currentPlayer = nextPlayer(player);
    next.lastAction += ` 현재 ${score}점이라 다음 사람 차례로 넘어갑니다.`;
  } else if (next.phase === 'playing' && canDecide) {
    next.phase = 'awaiting-go-stop';
    next.pendingDecision = player;
    next.currentPlayer = player;
    next.lastAction += ` 현재 ${score}점, 고 또는 스톱을 선택합니다.`;
  }
  return next;
}

export function getGostopMatchingFloorCards(floorCards: string[], cardId: string): string[] {
  const month = getCard(cardId)?.month;
  return floorCards.filter(floorId => getCard(floorId)?.month === month);
}

export function getGostopFloorChoice(state: GostopRoomState, player: GostopPlayerId, cardId: string): string[] {
  if (state.phase !== 'playing' || state.currentPlayer !== player || !state.players[player].hand.includes(cardId)) return [];
  const matches = getGostopMatchingFloorCards(state.floorCards, cardId);
  return matches.length === 2 ? matches : [];
}

export interface GostopDrawFloorChoice {
  drawnCardId: string;
  candidates: string[];
}

export function getGostopDrawFloorChoice(
  state: GostopRoomState,
  player: GostopPlayerId,
  cardId: string,
  preferredPlayedMatchId?: string
): GostopDrawFloorChoice | null {
  if (state.phase !== 'playing' || state.currentPlayer !== player || !state.players[player].hand.includes(cardId)) return null;
  if (isGostopBonus(cardId)) return null;
  const next = structuredClone(state);
  next.players[player].hand = next.players[player].hand.filter(handCardId => handCardId !== cardId);
  captureOrPlace(next, player, cardId, preferredPlayedMatchId);
  const drawnCardId = next.drawPile.find(drawCardId => !isGostopBonus(drawCardId));
  if (!drawnCardId) return null;
  const candidates = getGostopMatchingFloorCards(next.floorCards, drawnCardId);
  return candidates.length === 2 ? { drawnCardId, candidates } : null;
}

export function getGostopFlipOnlyDrawChoice(state: GostopRoomState, player: GostopPlayerId): GostopDrawFloorChoice | null {
  if (state.phase !== 'playing' || state.currentPlayer !== player || state.players[player].flipOnlyTurns <= 0) return null;
  const drawnCardId = state.drawPile.find(cardId => !isGostopBonus(cardId));
  if (!drawnCardId) return null;
  const candidates = getGostopMatchingFloorCards(state.floorCards, drawnCardId);
  return candidates.length === 2 ? { drawnCardId, candidates } : null;
}

export function getGostopBombOption(state: GostopRoomState, player: GostopPlayerId, cardId: string): BombOption | null {
  const month = getCard(cardId)?.month;
  if (state.phase !== 'playing' || state.currentPlayer !== player || !month) return null;
  return findBombOptions(state.players[player].hand, state.floorCards, false).find(option => option.month === month) ?? null;
}

export function getGostopShakeOption(state: GostopRoomState, player: GostopPlayerId, cardId: string): ShakeOption | null {
  const month = getCard(cardId)?.month;
  if (state.phase !== 'playing' || state.currentPlayer !== player || !month) return null;
  return findShakeOptions(state.players[player].hand, state.floorCards, state.players[player].shakenMonths)
    .find(option => option.month === month) ?? null;
}

export function declareGostopShake(state: GostopRoomState, player: GostopPlayerId, month: number): GostopRoomState {
  if (state.phase !== 'playing' || state.currentPlayer !== player) throw new Error('지금 흔들 수 없습니다.');
  const option = findShakeOptions(state.players[player].hand, state.floorCards, state.players[player].shakenMonths)
    .find(candidate => candidate.month === month);
  if (!option) throw new Error('흔들 수 있는 패가 없습니다.');
  const next = structuredClone(state);
  next.players[player].shakeCount += 1;
  next.players[player].shakenMonths.push(month);
  next.players[player].pendingShakeMonth = month;
  next.lastAction = `${playerActionLabel(next, player)}가 ${month}월 패 세 장을 흔들었습니다.`;
  return next;
}

function captureOrPlace(state: GostopRoomState, player: GostopPlayerId, cardId: string, preferredMatchId?: string) {
  const matches = getGostopMatchingFloorCards(state.floorCards, cardId);
  if (matches.length === 0) {
    state.floorCards.push(cardId);
    return { captured: [] as string[], ppeokPile: null as GostopPpeokPile | null };
  }
  const preferred = preferredMatchId && matches.includes(preferredMatchId) ? preferredMatchId : matches[0];
  const selected = matches.length === 2 ? [preferred] : matches;
  const ppeokPile = matches.length === 3
    ? state.ppeokPiles.find(pile => pile.month === getCard(cardId)?.month
      && pile.cardIds.filter(id => !isGostopBonus(id)).every(id => matches.includes(id))) ?? null
    : null;
  const selectedWithAttachedBonus = ppeokPile ? [...selected, ...ppeokPile.cardIds.filter(isGostopBonus)] : selected;
  const selectedIds = new Set(selectedWithAttachedBonus);
  state.floorCards = state.floorCards.filter(floorId => !selectedIds.has(floorId));
  if (ppeokPile) state.ppeokPiles = state.ppeokPiles.filter(pile => pile !== ppeokPile);
  const captured = [...selectedWithAttachedBonus, cardId];
  state.players[player].captured.push(...captured);
  return { captured, ppeokPile };
}

function stealPeeFromOpponents(state: GostopRoomState, player: GostopPlayerId, countEach: number) {
  const stolenPee: string[] = [];
  PLAYER_ORDER.filter(opponent => opponent !== player).forEach(opponent => {
    const stolen = stealPeeCards(state.players[opponent].captured, countEach);
    state.players[opponent].captured = stolen.remaining;
    stolenPee.push(...stolen.stolenCardIds);
  });
  state.players[player].captured.push(...stolenPee);
  return stolenPee;
}

function makeSpecialEvent(state: GostopRoomState, player: GostopPlayerId, kind: TurnSpecialKind, label: string): TurnSpecialEvent {
  if (kind === 'sweep') state.players[player].sweepCount = (state.players[player].sweepCount ?? 0) + 1;
  return { kind, label, stolenPee: stealPeeFromOpponents(state, player, 1) };
}

function ppeokCaptureEvent(state: GostopRoomState, player: GostopPlayerId, pile: GostopPpeokPile | null): TurnSpecialEvent | null {
  if (!pile) return null;
  const selfPpeok = pile.owner === player;
  return makeSpecialEvent(state, player, selfPpeok ? 'self-ppeok' : 'ppeok-capture', selfPpeok ? '자뻑' : '싼 패 먹기');
}

function captureGostopBonus(state: GostopRoomState, player: GostopPlayerId, cardId: string) {
  state.players[player].captured.push(cardId);
  const stolenPee: string[] = [];
  PLAYER_ORDER.filter(opponent => opponent !== player).forEach(opponent => {
    const stolen = stealPeeForBonus(state.players[opponent].captured);
    state.players[opponent].captured = stolen.remaining;
    if (stolen.stolenCardId) stolenPee.push(stolen.stolenCardId);
  });
  state.players[player].captured.push(...stolenPee);
  return stolenPee;
}

function drawThroughGostopBonus(state: GostopRoomState, player: GostopPlayerId) {
  const bonusCards: string[] = [];
  while (state.drawPile.length) {
    const cardId = state.drawPile.shift()!;
    if (!isGostopBonus(cardId)) return { drawnCardId: cardId, bonusCards };
    bonusCards.push(cardId);
  }
  return { drawnCardId: null, bonusCards };
}

function allTurnsComplete(state: GostopRoomState) {
  return PLAYER_ORDER.every(player => state.players[player].hand.length === 0 && state.players[player].flipOnlyTurns === 0);
}

function playerSettlementStates(state: GostopRoomState) {
  return Object.fromEntries(GOSTOP_PLAYERS.map(player => {
    const playerState = state.players[player];
    return [player, {
      score: scoreGostopPlayer(state, player),
      goCount: playerState.goCount,
      scoreAtLastGo: playerState.scoreAtLastGo,
      shakeCount: playerState.shakeCount,
      bombCount: playerState.bombCount
    }];
  })) as Parameters<typeof calculateGostopSettlement>[0]['players'];
}

export function previewGostopSettlement(state: GostopRoomState, player: GostopPlayerId): GostopRoundSettlement {
  return calculateGostopSettlement({
    winner: player,
    players: playerSettlementStates(state),
    lastGoPlayer: state.lastGoPlayer,
    roundMultiplier: state.roundMultiplier,
    interimPointDeltas: state.interimPointDeltas
  });
}

function finishRound(
  state: GostopRoomState,
  player: GostopPlayerId,
  message: string,
  options: { forcedBaseScore?: number; suppressMultipliers?: boolean } = {}
) {
  const settlement = calculateGostopSettlement({
    winner: player,
    players: playerSettlementStates(state),
    lastGoPlayer: state.lastGoPlayer,
    roundMultiplier: state.roundMultiplier,
    interimPointDeltas: state.interimPointDeltas,
    ...options
  });
  state.phase = 'round-ended';
  state.pendingDecision = null;
  state.winner = player;
  state.roundResult = 'win';
  state.finalScore = settlement.commonScore;
  state.settlement = settlement;
  state.lastAction = `${playerActionLabel(state, player)}가 ${state.finalScore}점으로 ${message}${state.roundMultiplier > 1 ? ` (나가리 이월 ×${state.roundMultiplier})` : ''}`;
}

function finishNagari(state: GostopRoomState, message: string) {
  state.phase = 'round-ended';
  state.pendingDecision = null;
  state.winner = null;
  state.roundResult = 'nagari';
  state.finalScore = 0;
  state.settlement = null;
  state.lastAction = message;
}

function awardImmediatePoints(state: GostopRoomState, player: GostopPlayerId, points: number) {
  state.interimPointDeltas = addGostopReward(state.interimPointDeltas, player, points);
}

function updatePlayerTurnTracking(state: GostopRoomState, player: GostopPlayerId, capturedCount: number, isPpeok: boolean) {
  const playerState = state.players[player];
  if (isPpeok) {
    playerState.ppeokCount += 1;
    if (playerState.openingPpeokCount === playerState.turnCount) {
      playerState.openingPpeokCount += 1;
      playerState.openingPpeokTotal += 1;
      awardImmediatePoints(state, player, playerState.openingPpeokCount * 3);
    }
  } else if (playerState.openingPpeokCount === playerState.turnCount) {
    playerState.openingPpeokCount = -1;
  }
  playerState.turnCount += 1;
  playerState.emptyCaptureStreak = capturedCount > 0 ? 0 : playerState.emptyCaptureStreak + 1;
}

function advanceAfterTurn(state: GostopRoomState, player: GostopPlayerId) {
  const score = scoreGostopPlayer(state, player).total;
  if (allTurnsComplete(state)) {
    const playerState = state.players[player];
    if (score >= GOSTOP_RULES.targetScore && (playerState.goCount === 0 || score > playerState.scoreAtLastGo)) {
      finishRound(state, player, '마지막 패를 내고 스톱했습니다.');
    } else finishNagari(state, '아무도 새 점수를 내지 못해 나가리입니다.');
    return;
  }
  const playerState = state.players[player];
  if (score >= GOSTOP_RULES.targetScore && score > playerState.scoreAtLastGo) {
    state.phase = 'awaiting-go-stop';
    state.pendingDecision = player;
    state.lastAction += ` 현재 ${score}점, 고 또는 스톱을 선택합니다.`;
    return;
  }
  state.currentPlayer = nextPlayer(player);
}

export function playGostopTurn(
  state: GostopRoomState,
  player: GostopPlayerId,
  cardId: string,
  preferredPlayedMatchId?: string,
  preferredDrawnMatchId?: string
): GostopTurnResult {
  if (state.phase !== 'playing' || state.currentPlayer !== player) throw new Error('현재 턴이 아닙니다.');
  if (!state.players[player].hand.includes(cardId)) throw new Error('손패에 없는 패입니다.');
  if (state.players[player].flipOnlyTurns > 0) throw new Error('폭탄으로 비워 둔 차례에는 더미 패만 뒤집어야 합니다.');
  if (state.players[player].pendingShakeMonth && getCard(cardId)?.month !== state.players[player].pendingShakeMonth) {
    throw new Error('흔들기를 선언한 월의 패를 내야 합니다.');
  }
  const next = structuredClone(state);
  next.ppeokPiles ??= [];
  next.lastSpecialEvents = [];
  next.players[player].hand = next.players[player].hand.filter(handCardId => handCardId !== cardId);
  next.players[player].pendingShakeMonth = null;
  if (isGostopBonus(cardId)) {
    const stolenPee = captureGostopBonus(next, player, cardId);
    const replacementCardId = next.drawPile.shift() ?? null;
    if (replacementCardId) next.players[player].hand = sortHand([...next.players[player].hand, replacementCardId]);
    next.lastAction = `${playerActionLabel(next, player)}가 보너스패를 얻고 새 패를 받았습니다.${stolenPee.length ? ` 상대 피 ${stolenPee.length}장을 가져왔습니다.` : ''} 같은 차례를 계속합니다.`;
    return {
      state: next, playedCardId: cardId, drawnCardId: null,
      captured: [cardId, ...stolenPee], bonusCards: [cardId], stolenPee,
      specialEvents: [],
      replacementCardId, continuesTurn: true
    };
  }
  const initialMatches = getGostopMatchingFloorCards(next.floorCards, cardId);
  const bonusDraw = drawThroughGostopBonus(next, player);
  const drawnCardId = bonusDraw.drawnCardId;
  const sameDrawMonth = drawnCardId !== null && getCard(drawnCardId)?.month === getCard(cardId)?.month;
  const wouldPpeok = initialMatches.length === 1 && sameDrawMonth;
  const finalTurn = allTurnsComplete(next);
  const isPpeok = wouldPpeok && !finalTurn;
  const specialEvents: TurnSpecialEvent[] = [];
  const bonusStolenPee: string[] = [];
  let captured: string[] = [];
  if (isPpeok && drawnCardId) {
    next.floorCards.push(cardId, drawnCardId, ...bonusDraw.bonusCards);
    next.ppeokPiles.push({
      month: getCard(cardId)?.month ?? 0,
      owner: player,
      cardIds: [initialMatches[0], cardId, drawnCardId, ...bonusDraw.bonusCards]
    });
    specialEvents.push({ kind: 'ppeok', label: '뻑', stolenPee: [] });
  } else if (wouldPpeok && drawnCardId) {
    for (const bonusCardId of bonusDraw.bonusCards) bonusStolenPee.push(...captureGostopBonus(next, player, bonusCardId));
    const initialSet = new Set(initialMatches);
    next.floorCards = next.floorCards.filter(floorId => !initialSet.has(floorId));
    const lastCapture = [...initialMatches, cardId, drawnCardId];
    next.players[player].captured.push(...lastCapture);
    captured.push(...bonusDraw.bonusCards, ...bonusStolenPee, ...lastCapture);
  } else {
    for (const bonusCardId of bonusDraw.bonusCards) bonusStolenPee.push(...captureGostopBonus(next, player, bonusCardId));
    const played = captureOrPlace(next, player, cardId, preferredPlayedMatchId);
    const drawn = drawnCardId ? captureOrPlace(next, player, drawnCardId, preferredDrawnMatchId) : null;
    const playedPpeok = ppeokCaptureEvent(next, player, played.ppeokPile);
    const drawnPpeok = ppeokCaptureEvent(next, player, drawn?.ppeokPile ?? null);
    if (playedPpeok) specialEvents.push(playedPpeok);
    if (drawnPpeok) specialEvents.push(drawnPpeok);
    const isJjok = initialMatches.length === 0 && sameDrawMonth;
    const isTtadak = initialMatches.length === 2 && sameDrawMonth;
    if (isJjok && !finalTurn) specialEvents.push(makeSpecialEvent(next, player, 'jjok', '쪽'));
    if (isTtadak) {
      specialEvents.push(makeSpecialEvent(next, player, 'ttadak', '따닥'));
      if (next.players[player].turnCount === 0) awardImmediatePoints(next, player, 3);
    }
    if (next.floorCards.length === 0) specialEvents.push(makeSpecialEvent(next, player, 'sweep', '싹쓸이'));
    captured.push(...bonusDraw.bonusCards, ...bonusStolenPee, ...played.captured, ...(drawn?.captured ?? []), ...specialEvents.flatMap(event => event.stolenPee));
  }
  next.turnNumber += 1;
  updatePlayerTurnTracking(next, player, captured.length, isPpeok);
  const playedMonth = getCard(cardId)?.month ?? '?';
  const drawnMonth = drawnCardId ? getCard(drawnCardId)?.month ?? '?' : null;
  next.lastAction = isPpeok
    ? `${playerActionLabel(next, player)}가 ${playedMonth}월 패 세 장을 겹쳐 뻑을 쌌습니다.`
    : `${playerActionLabel(next, player)}가 ${playedMonth}월 패를 내고${drawnMonth ? ` ${drawnMonth}월 패를 뒤집었습니다.` : ' 더미를 모두 사용했습니다.'}`;
  if (bonusDraw.bonusCards.length) {
    next.lastAction = isPpeok
      ? `뒤집기 보너스패 ${bonusDraw.bonusCards.length}장도 뻑에 붙었습니다. ${next.lastAction}`
      : `뒤집기에서 보너스패 ${bonusDraw.bonusCards.length}장을 얻었습니다.${bonusStolenPee.length ? ` 상대 피 ${bonusStolenPee.length}장을 가져왔습니다.` : ''} ${next.lastAction}`;
  }
  if (specialEvents.some(event => event.kind !== 'ppeok')) {
    const stolenCount = specialEvents.flatMap(event => event.stolenPee).length;
    next.lastAction += ` ${specialEvents.filter(event => event.kind !== 'ppeok').map(event => event.label).join('·')}!${stolenCount ? ` 두 상대에게서 피 ${stolenCount}장을 가져왔습니다.` : ''}`;
  }
  if (captured.length) next.lastAction += ` ${captured.length}장을 획득했습니다.`;
  next.lastSpecialEvents = specialEvents;
  if (next.players[player].ppeokCount >= 3) {
    finishRound(next, player, '세 번째 뻑으로 이겼습니다.', { forcedBaseScore: 3, suppressMultipliers: true });
  } else if (next.players[player].emptyCaptureStreak >= 5) {
    finishRound(next, player, '허당 5회로 이겼습니다.', { forcedBaseScore: 3, suppressMultipliers: true });
  } else advanceAfterTurn(next, player);
  return {
    state: next, playedCardId: cardId, drawnCardId, captured,
    bonusCards: bonusDraw.bonusCards, stolenPee: [...bonusStolenPee, ...specialEvents.flatMap(event => event.stolenPee)],
    specialEvents,
    replacementCardId: null, continuesTurn: false
  };
}

export function playGostopBomb(state: GostopRoomState, player: GostopPlayerId, month: number): GostopTurnResult {
  if (state.phase !== 'playing' || state.currentPlayer !== player) throw new Error('지금 폭탄을 사용할 수 없습니다.');
  const option = findBombOptions(state.players[player].hand, state.floorCards, false).find(candidate => candidate.month === month);
  if (!option) throw new Error('사용할 수 있는 폭탄이 없습니다.');
  const next = structuredClone(state);
  const handSet = new Set(option.handCardIds);
  const floorSet = new Set(option.floorCardIds);
  next.players[player].hand = next.players[player].hand.filter(cardId => !handSet.has(cardId));
  next.players[player].bombCount += 1;
  next.players[player].flipOnlyTurns += 2;
  next.floorCards = next.floorCards.filter(cardId => !floorSet.has(cardId));
  next.players[player].captured.push(...option.handCardIds, ...option.floorCardIds);
  const specialEvents: TurnSpecialEvent[] = [makeSpecialEvent(next, player, 'bomb', '폭탄')];
  const bonusDraw = drawThroughGostopBonus(next, player);
  const bonusStolenPee: string[] = [];
  for (const bonusCardId of bonusDraw.bonusCards) bonusStolenPee.push(...captureGostopBonus(next, player, bonusCardId));
  const drawn = bonusDraw.drawnCardId ? captureOrPlace(next, player, bonusDraw.drawnCardId) : null;
  const drawnPpeok = ppeokCaptureEvent(next, player, drawn?.ppeokPile ?? null);
  if (drawnPpeok) specialEvents.push(drawnPpeok);
  if (next.floorCards.length === 0) specialEvents.push(makeSpecialEvent(next, player, 'sweep', '싹쓸이'));
  const specialStolenPee = specialEvents.flatMap(event => event.stolenPee);
  const captured = [
    ...option.handCardIds, ...option.floorCardIds, ...bonusDraw.bonusCards, ...bonusStolenPee,
    ...(drawn?.captured ?? []), ...specialStolenPee
  ];
  next.turnNumber += 1;
  updatePlayerTurnTracking(next, player, captured.length, false);
  next.lastSpecialEvents = specialEvents;
  next.lastAction = `${playerActionLabel(next, player)}가 ${month}월 폭탄을 사용했습니다. 두 상대에게서 피 ${specialEvents[0].stolenPee.length}장을 가져왔습니다.`;
  advanceAfterTurn(next, player);
  return {
    state: next,
    playedCardId: option.handCardIds[0],
    drawnCardId: bonusDraw.drawnCardId,
    captured,
    bonusCards: bonusDraw.bonusCards,
    stolenPee: [...bonusStolenPee, ...specialStolenPee],
    specialEvents,
    replacementCardId: null,
    continuesTurn: false
  };
}

export function playGostopFlipOnlyTurn(
  state: GostopRoomState,
  player: GostopPlayerId,
  preferredDrawnMatchId?: string
): GostopTurnResult {
  if (state.phase !== 'playing' || state.currentPlayer !== player || state.players[player].flipOnlyTurns <= 0) {
    throw new Error('폭탄으로 비워 둔 뒤집기 차례가 아닙니다.');
  }
  const next = structuredClone(state);
  next.players[player].flipOnlyTurns -= 1;
  const bonusDraw = drawThroughGostopBonus(next, player);
  const bonusStolenPee: string[] = [];
  for (const bonusCardId of bonusDraw.bonusCards) bonusStolenPee.push(...captureGostopBonus(next, player, bonusCardId));
  const drawn = bonusDraw.drawnCardId ? captureOrPlace(next, player, bonusDraw.drawnCardId, preferredDrawnMatchId) : null;
  const specialEvents: TurnSpecialEvent[] = [];
  const drawnPpeok = ppeokCaptureEvent(next, player, drawn?.ppeokPile ?? null);
  if (drawnPpeok) specialEvents.push(drawnPpeok);
  if (next.floorCards.length === 0) specialEvents.push(makeSpecialEvent(next, player, 'sweep', '싹쓸이'));
  const specialStolenPee = specialEvents.flatMap(event => event.stolenPee);
  const captured = [...bonusDraw.bonusCards, ...bonusStolenPee, ...(drawn?.captured ?? []), ...specialStolenPee];
  next.turnNumber += 1;
  updatePlayerTurnTracking(next, player, captured.length, false);
  next.lastSpecialEvents = specialEvents;
  next.lastAction = `${playerActionLabel(next, player)}가 폭탄으로 비워 둔 차례에 더미 패를 뒤집었습니다.${captured.length ? ` ${captured.length}장을 획득했습니다.` : ''}`;
  if (next.players[player].emptyCaptureStreak >= 5) {
    finishRound(next, player, '허당 5회로 이겼습니다.', { forcedBaseScore: 3, suppressMultipliers: true });
  } else advanceAfterTurn(next, player);
  return {
    state: next,
    playedCardId: '',
    drawnCardId: bonusDraw.drawnCardId,
    captured,
    bonusCards: bonusDraw.bonusCards,
    stolenPee: [...bonusStolenPee, ...specialStolenPee],
    specialEvents,
    replacementCardId: null,
    continuesTurn: false
  };
}

export function chooseGostopDecision(state: GostopRoomState, player: GostopPlayerId, decision: 'go' | 'stop'): GostopRoomState {
  if (state.phase !== 'awaiting-go-stop' || state.pendingDecision !== player) throw new Error('고스톱을 선택할 순서가 아닙니다.');
  const next = structuredClone(state);
  if (decision === 'stop') {
    finishRound(next, player, '스톱했습니다.');
    return next;
  }
  const score = scoreGostopPlayer(next, player).total;
  next.players[player].goCount += 1;
  next.players[player].scoreAtLastGo = score;
  next.lastGoPlayer = player;
  next.phase = 'playing';
  next.pendingDecision = null;
  next.currentPlayer = nextPlayer(player);
  next.lastAction = `${playerActionLabel(next, player)}가 ${next.players[player].goCount}고를 선언했습니다.`;
  return next;
}

export function chooseGostopAiCard(state: GostopRoomState, player: Exclude<GostopPlayerId, 'human'>): string | null {
  return chooseGostopAutomaticCard(state, player);
}

export function chooseGostopAiDecision(state: GostopRoomState, player: Exclude<GostopPlayerId, 'human'>): 'go' | 'stop' {
  return chooseGostopAutomaticDecision(state, player);
}

export function chooseGostopAutomaticCard(state: GostopRoomState, player: GostopPlayerId): string | null {
  const hand = state.players[player].hand;
  return [...hand].sort((left, right) => {
    const bonusDifference = Number(isGostopBonus(right)) - Number(isGostopBonus(left));
    if (bonusDifference) return bonusDifference;
    const matchDifference = getGostopMatchingFloorCards(state.floorCards, right).length - getGostopMatchingFloorCards(state.floorCards, left).length;
    if (matchDifference) return matchDifference;
    return (getCard(right)?.month ?? 0) - (getCard(left)?.month ?? 0);
  })[0] ?? null;
}

export function chooseGostopAutomaticDecision(state: GostopRoomState, player: GostopPlayerId): 'go' | 'stop' {
  const score = scoreGostopPlayer(state, player).total;
  const remainingCards = PLAYER_ORDER.reduce((total, current) => total + state.players[current].hand.length, 0);
  return state.players[player].goCount === 0 && score < 6 && remainingCards >= 6 ? 'go' : 'stop';
}
