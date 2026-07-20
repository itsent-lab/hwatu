import { getCard } from '../../engine/cards';
import { createMatgoDeck, dealGostop, shuffleDeck } from '../../engine/deck';
import type { RoundMultiplier } from '../../engine/rules/nagari';
import { calculateCapturedScore } from '../../engine/rules/scoring';
import type { GameRuleSettings } from '../../engine/rules/settings';
import { stealPeeCards, stealPeeForBonus } from '../../engine/rules/specialRules';
import type { CapturedScore } from '../../engine/rules/types';
import type { TurnSpecialEvent, TurnSpecialKind } from '../../engine/types';
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
  currentPlayer: GostopPlayerId;
  phase: GostopPhase;
  pendingDecision: GostopPlayerId | null;
  players: Record<GostopPlayerId, GostopPlayerState>;
  floorCards: string[];
  drawPile: string[];
  ppeokPiles: GostopPpeokPile[];
  lastSpecialEvents: TurnSpecialEvent[];
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
  threePpeokBaseScore: 0
});

const PLAYER_ORDER: readonly GostopPlayerId[] = ['human', 'computerA', 'computerB'];
const PLAYER_LABELS: Record<GostopPlayerId, string> = { human: '나', computerA: '정순이', computerB: '박영수' };

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

function emptyPlayer(hand: string[]): GostopPlayerState {
  return { hand: sortHand(hand), captured: [], goCount: 0, scoreAtLastGo: 0, gookjinAsDoubleJunk: false };
}

export function createGostopRoom(randomSeed: number, pointValue: GostopPointValue, roundMultiplier: RoundMultiplier = 1): GostopRoomState {
  const shuffled = shuffleDeck(createMatgoDeck(), randomSeed);
  const dealt = dealGostop(shuffled.cards);
  return {
    randomSeed,
    pointValue,
    roundMultiplier,
    turnNumber: 0,
    currentPlayer: 'human',
    phase: 'playing',
    pendingDecision: null,
    players: {
      human: { ...emptyPlayer(dealt.humanHand), captured: [...dealt.initialBonusCards] },
      computerA: emptyPlayer(dealt.computerAHand),
      computerB: emptyPlayer(dealt.computerBHand)
    },
    floorCards: dealt.floorCards,
    drawPile: dealt.drawPile,
    ppeokPiles: [],
    lastSpecialEvents: [],
    winner: null,
    roundResult: null,
    finalScore: 0,
    lastAction: `${roundMultiplier > 1 ? `나가리 이월로 이번 판 점수는 ${roundMultiplier}배입니다. ` : ''}내가 선으로 첫 패를 냅니다.${dealt.initialBonusCards.length ? ` 바닥 보너스패 ${dealt.initialBonusCards.length}장도 가져왔습니다.` : ''}`
  };
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
    ? `${PLAYER_LABELS[player]}가 국진을 쌍피로 바꿔 피 묶음으로 옮겼습니다.`
    : `${PLAYER_LABELS[player]}가 국진을 열끗으로 바꿔 열끗 묶음으로 옮겼습니다.`;
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

function captureOrPlace(state: GostopRoomState, player: GostopPlayerId, cardId: string, preferredMatchId?: string) {
  const matches = getGostopMatchingFloorCards(state.floorCards, cardId);
  if (matches.length === 0) {
    state.floorCards.push(cardId);
    return { captured: [] as string[], ppeokPile: null as GostopPpeokPile | null };
  }
  const preferred = preferredMatchId && matches.includes(preferredMatchId) ? preferredMatchId : matches[0];
  const selected = matches.length === 2 ? [preferred] : matches;
  const ppeokPile = matches.length === 3
    ? state.ppeokPiles.find(pile => pile.month === getCard(cardId)?.month && pile.cardIds.every(id => matches.includes(id))) ?? null
    : null;
  const selectedIds = new Set(selected);
  state.floorCards = state.floorCards.filter(floorId => !selectedIds.has(floorId));
  if (ppeokPile) state.ppeokPiles = state.ppeokPiles.filter(pile => pile !== ppeokPile);
  const captured = [...selected, cardId];
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
  const stolenPee: string[] = [];
  while (state.drawPile.length) {
    const cardId = state.drawPile.shift()!;
    if (!isGostopBonus(cardId)) return { drawnCardId: cardId, bonusCards, stolenPee };
    bonusCards.push(cardId);
    stolenPee.push(...captureGostopBonus(state, player, cardId));
  }
  return { drawnCardId: null, bonusCards, stolenPee };
}

function allHandsEmpty(state: GostopRoomState) {
  return PLAYER_ORDER.every(player => state.players[player].hand.length === 0);
}

function finishRound(state: GostopRoomState, player: GostopPlayerId, message: string) {
  const score = scoreGostopPlayer(state, player).total + state.players[player].goCount;
  state.phase = 'round-ended';
  state.pendingDecision = null;
  state.winner = player;
  state.roundResult = 'win';
  state.finalScore = score * state.roundMultiplier;
  state.lastAction = `${PLAYER_LABELS[player]}가 ${state.finalScore}점으로 ${message}${state.roundMultiplier > 1 ? ` (나가리 이월 ×${state.roundMultiplier})` : ''}`;
}

function advanceAfterTurn(state: GostopRoomState, player: GostopPlayerId) {
  const score = scoreGostopPlayer(state, player).total;
  if (allHandsEmpty(state)) {
    if (score >= GOSTOP_RULES.targetScore) finishRound(state, player, '마지막 패를 내고 스톱했습니다.');
    else {
      state.phase = 'round-ended';
      state.pendingDecision = null;
      state.roundResult = 'nagari';
      state.lastAction = '모든 손패를 냈지만 3점 이상이 없어 나가리입니다.';
    }
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
  const next = structuredClone(state);
  next.ppeokPiles ??= [];
  next.lastSpecialEvents = [];
  next.players[player].hand = next.players[player].hand.filter(handCardId => handCardId !== cardId);
  if (isGostopBonus(cardId)) {
    const stolenPee = captureGostopBonus(next, player, cardId);
    const replacementCardId = next.drawPile.shift() ?? null;
    if (replacementCardId) next.players[player].hand = sortHand([...next.players[player].hand, replacementCardId]);
    next.lastAction = `${PLAYER_LABELS[player]}가 보너스패를 얻고 새 패를 받았습니다.${stolenPee.length ? ` 상대 피 ${stolenPee.length}장을 가져왔습니다.` : ''} 같은 차례를 계속합니다.`;
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
  const isPpeok = initialMatches.length === 1 && drawnCardId !== null && getCard(drawnCardId)?.month === getCard(cardId)?.month;
  const specialEvents: TurnSpecialEvent[] = [];
  let captured = [...bonusDraw.bonusCards, ...bonusDraw.stolenPee];
  if (isPpeok && drawnCardId) {
    next.floorCards.push(cardId, drawnCardId);
    next.ppeokPiles.push({ month: getCard(cardId)?.month ?? 0, owner: player, cardIds: [initialMatches[0], cardId, drawnCardId] });
    specialEvents.push({ kind: 'ppeok', label: '뻑', stolenPee: [] });
  } else {
    const played = captureOrPlace(next, player, cardId, preferredPlayedMatchId);
    const drawn = drawnCardId ? captureOrPlace(next, player, drawnCardId, preferredDrawnMatchId) : null;
    const playedPpeok = ppeokCaptureEvent(next, player, played.ppeokPile);
    const drawnPpeok = ppeokCaptureEvent(next, player, drawn?.ppeokPile ?? null);
    if (playedPpeok) specialEvents.push(playedPpeok);
    if (drawnPpeok) specialEvents.push(drawnPpeok);
    if (next.floorCards.length === 0) specialEvents.push(makeSpecialEvent(next, player, 'sweep', '싹쓸이'));
    captured.push(...played.captured, ...(drawn?.captured ?? []), ...specialEvents.flatMap(event => event.stolenPee));
  }
  next.turnNumber += 1;
  const playedMonth = getCard(cardId)?.month ?? '?';
  const drawnMonth = drawnCardId ? getCard(drawnCardId)?.month ?? '?' : null;
  next.lastAction = isPpeok
    ? `${PLAYER_LABELS[player]}가 ${playedMonth}월 패 세 장을 겹쳐 뻑을 쌌습니다.`
    : `${PLAYER_LABELS[player]}가 ${playedMonth}월 패를 내고${drawnMonth ? ` ${drawnMonth}월 패를 뒤집었습니다.` : ' 더미를 모두 사용했습니다.'}`;
  if (bonusDraw.bonusCards.length) next.lastAction = `뒤집기에서 보너스패 ${bonusDraw.bonusCards.length}장을 얻었습니다.${bonusDraw.stolenPee.length ? ` 상대 피 ${bonusDraw.stolenPee.length}장을 가져왔습니다.` : ''} ${next.lastAction}`;
  if (specialEvents.some(event => event.kind !== 'ppeok')) {
    const stolenCount = specialEvents.flatMap(event => event.stolenPee).length;
    next.lastAction += ` ${specialEvents.filter(event => event.kind !== 'ppeok').map(event => event.label).join('·')}!${stolenCount ? ` 두 상대에게서 피 ${stolenCount}장을 가져왔습니다.` : ''}`;
  }
  if (captured.length) next.lastAction += ` ${captured.length}장을 획득했습니다.`;
  next.lastSpecialEvents = specialEvents;
  advanceAfterTurn(next, player);
  return {
    state: next, playedCardId: cardId, drawnCardId, captured,
    bonusCards: bonusDraw.bonusCards, stolenPee: [...bonusDraw.stolenPee, ...specialEvents.flatMap(event => event.stolenPee)],
    specialEvents,
    replacementCardId: null, continuesTurn: false
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
  next.phase = 'playing';
  next.pendingDecision = null;
  next.currentPlayer = nextPlayer(player);
  next.lastAction = `${PLAYER_LABELS[player]}가 ${next.players[player].goCount}고를 선언했습니다.`;
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
