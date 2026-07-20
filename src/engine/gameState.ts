import { getCard } from './cards';
import { chooseAiCard } from './ai/strategy';
import type { AiDifficulty } from './ai/types';
import { createMatgoDeck, dealMatgo, shuffleDeck } from './deck';
import { drawThroughBonusPee, isBonusPee, playBonusPeeFromHand } from './rules/bonusPee';
import { canChooseGoStop } from './rules/decisions';
import { calculateCapturedScore } from './rules/scoring';
import { calculateSettlement } from './rules/settlement';
import { capturedMissionCards, createCardMission, missionMultiplierFor } from './rules/missions';
import type { RoundMultiplier } from './rules/nagari';
import { isMatgoPointValue, matgoRulesForPointValue, PMANG_MATGO_RULES, type MatgoPointValue } from './rules/settings';
import { evaluateChongtong, findBombOptions, findShakeOptions, isThreePpeok, stealPeeCards } from './rules/specialRules';
import type { GameState, PlayerId, PpeokPile, TurnResult, TurnSpecialEvent, TurnSpecialKind } from './types';

export { nextRoundMultiplier } from './rules/nagari';

export const GAME_STATE_VERSION = 3;

const otherPlayer = (player: PlayerId): PlayerId => player === 'human' ? 'computer' : 'human';
const keysFor = (player: PlayerId) => player === 'human'
  ? { hand: 'humanHand', captured: 'humanCaptured', go: 'humanGoCount', lastGo: 'humanScoreAtLastGo', ppeok: 'humanPpeokCount', gookjin: 'humanGookjinAsDoubleJunk', bombSkips: 'humanBombSkips', bombCount: 'humanBombCount', shake: 'humanShakeCount', shakenMonths: 'humanShakenMonths', pendingShake: 'humanPendingShakeMonth' } as const
  : { hand: 'computerHand', captured: 'computerCaptured', go: 'computerGoCount', lastGo: 'computerScoreAtLastGo', ppeok: 'computerPpeokCount', gookjin: 'computerGookjinAsDoubleJunk', bombSkips: 'computerBombSkips', bombCount: 'computerBombCount', shake: 'computerShakeCount', shakenMonths: 'computerShakenMonths', pendingShake: 'computerPendingShakeMonth' } as const;

export function createInitialGame(
  seed = Date.now(),
  computerDifficulty: AiDifficulty = 'normal',
  pointValue: MatgoPointValue = 100,
  confirmedStartingPlayer?: PlayerId,
  roundMultiplier: RoundMultiplier = 1
): GameState {
  const shuffled = shuffleDeck(createMatgoDeck(), seed);
  const startingPlayer: PlayerId = confirmedStartingPlayer ?? (Math.abs(Math.trunc(seed)) % 2 === 0 ? 'human' : 'computer');
  const dealt = dealMatgo(shuffled.cards, startingPlayer);
  const initialBonusCount = dealt.humanCaptured.length + dealt.computerCaptured.length;
  const chongtong = evaluateChongtong(dealt.humanHand, dealt.computerHand, dealt.floorCards);
  return {
    stateVersion: GAME_STATE_VERSION,
    gameUuid: crypto.randomUUID(),
    gameMode: 'matgo',
    computerDifficulty,
    pointValue,
    roundMultiplier,
    randomSeed: shuffled.seed,
    turnNumber: 0,
    currentPlayer: startingPlayer,
    startingPlayer,
    startingPlayerConfirmed: Boolean(confirmedStartingPlayer) || chongtong.kind === 'nagari',
    phase: chongtong.kind === 'nagari' ? 'round-ended' : chongtong.kind === 'player-choice' ? 'awaiting-chongtong' : 'playing',
    pendingDecision: chongtong.kind === 'player-choice' ? chongtong.owner : null,
    ...dealt,
    humanCaptured: dealt.humanCaptured, computerCaptured: dealt.computerCaptured,
    humanGoCount: 0, computerGoCount: 0,
    humanScoreAtLastGo: 0, computerScoreAtLastGo: 0,
    humanPpeokCount: 0, computerPpeokCount: 0,
    ppeokPiles: [],
    mission: createCardMission(shuffled.seed),
    humanBombSkips: 0, computerBombSkips: 0,
    humanShakeCount: 0, computerShakeCount: 0,
    humanBombCount: 0, computerBombCount: 0,
    humanUndoCount: 0,
    humanShakenMonths: [], computerShakenMonths: [],
    humanPendingShakeMonth: null, computerPendingShakeMonth: null,
    humanGookjinAsDoubleJunk: false, computerGookjinAsDoubleJunk: false,
    chongtongOwner: chongtong.owner,
    chongtongMonth: chongtong.month,
    canShakeFour: chongtong.canShakeFour,
    canBombAfterChongtong: chongtong.canBombAfterContinue,
    winner: null,
    roundResult: chongtong.kind === 'nagari' ? 'nagari' : null,
    settlement: null,
    lastAction: (chongtong.reason || (confirmedStartingPlayer
      ? `${confirmedStartingPlayer === 'human' ? '내가' : '상대가'} 전 판 승자로 선공합니다.${initialBonusCount ? ` 바닥 보너스패 ${initialBonusCount}장도 가져갑니다.` : ''}`
      : initialBonusCount ? `바닥 보너스패 ${initialBonusCount}장을 선이 가져가고 시작합니다.` : '새 판을 시작했습니다.'))
      + (roundMultiplier > 1 ? ` 나가리 이월로 이번 판 점수는 ${roundMultiplier}배입니다.` : ''),
    createdAt: new Date().toISOString()
  };
}

export function setPointValue(state: GameState, pointValue: MatgoPointValue): GameState {
  if (state.phase === 'round-ended') throw new Error('이미 끝난 판의 점당 금액은 바꿀 수 없습니다.');
  const next = structuredClone(state);
  next.pointValue = pointValue;
  next.lastAction = `점당 ${pointValue.toLocaleString('ko-KR')}냥으로 정했습니다.`;
  return next;
}

export function chooseStartingPlayer(state: GameState, startingPlayer: PlayerId): GameState {
  if (state.turnNumber !== 0 || state.startingPlayerConfirmed || state.phase === 'round-ended') {
    throw new Error('이미 선공과 후공이 정해진 판입니다.');
  }

  const next = structuredClone(state);
  const initialBonusCards = [...next.humanCaptured, ...next.computerCaptured].filter(isBonusPee);
  next.humanCaptured = next.humanCaptured.filter(cardId => !isBonusPee(cardId));
  next.computerCaptured = next.computerCaptured.filter(cardId => !isBonusPee(cardId));
  next.startingPlayer = startingPlayer;
  next.currentPlayer = startingPlayer;
  next.startingPlayerConfirmed = true;
  next[startingPlayer === 'human' ? 'humanCaptured' : 'computerCaptured'].push(...initialBonusCards);
  const bonusMessage = initialBonusCards.length ? ` 바닥 보너스패 ${initialBonusCards.length}장도 선이 가져갑니다.` : '';
  next.lastAction = `${startingPlayer === 'human' ? '내가' : '상대가'} 선공으로 시작합니다.${bonusMessage}`;
  return next;
}

export function getMatchingFloorCards(floorCards: string[], cardId: string): string[] {
  const month = getCard(cardId)?.month;
  return floorCards.filter(floorId => getCard(floorId)?.month === month);
}

export interface DrawFloorChoice {
  drawnCardId: string;
  candidateIds: string[];
}

export function getDrawFloorChoice(state: GameState, cardId: string, playedMatchId?: string): DrawFloorChoice | null {
  if (isBonusPee(cardId)) return null;
  const drawnCardId = state.drawPile.find(drawCardId => !isBonusPee(drawCardId));
  if (!drawnCardId) return null;
  const initialMatches = getMatchingFloorCards(state.floorCards, cardId);
  if (initialMatches.length === 1 && getCard(drawnCardId)?.month === getCard(cardId)?.month) return null;

  let floorAfterPlayed = [...state.floorCards];
  if (initialMatches.length === 0) {
    floorAfterPlayed.push(cardId);
  } else {
    const selected = initialMatches.length === 2
      ? [playedMatchId && initialMatches.includes(playedMatchId) ? playedMatchId : initialMatches[0]]
      : initialMatches;
    const selectedIds = new Set(selected);
    floorAfterPlayed = floorAfterPlayed.filter(floorId => !selectedIds.has(floorId));
  }

  const candidateIds = getMatchingFloorCards(floorAfterPlayed, drawnCardId);
  return candidateIds.length === 2 ? { drawnCardId, candidateIds } : null;
}

export function getFlipOnlyDrawChoice(state: GameState): DrawFloorChoice | null {
  const drawnCardId = state.drawPile.find(drawCardId => !isBonusPee(drawCardId));
  if (!drawnCardId) return null;
  const candidateIds = getMatchingFloorCards(state.floorCards, drawnCardId);
  return candidateIds.length === 2 ? { drawnCardId, candidateIds } : null;
}

function matchingFloorCards(state: GameState, cardId: string): string[] {
  return getMatchingFloorCards(state.floorCards, cardId);
}

function captureOrPlace(state: GameState, cardId: string, capturedKey: 'humanCaptured' | 'computerCaptured', preferredMatchId?: string) {
  const card = getCard(cardId);
  const matches = matchingFloorCards(state, cardId);
  if (matches.length === 0) {
    state.floorCards.push(cardId);
    return { captured: [] as string[], ppeokPile: null as PpeokPile | null, message: `${card?.month ?? '?'}월 패를 놓았습니다.` };
  }
  const preferred = preferredMatchId && matches.includes(preferredMatchId) ? preferredMatchId : matches[0];
  const selected = matches.length === 2 ? [preferred] : matches;
  const knownPpeokPile = matches.length === 3
    ? (state.ppeokPiles ?? []).find(pile => pile.month === card?.month && pile.cardIds.every(id => matches.includes(id)))
    : null;
  const ppeokPile = matches.length === 3
    ? knownPpeokPile ?? { month: card?.month ?? 0, owner: capturedKey === 'humanCaptured' ? 'computer' : 'human', cardIds: [...matches] }
    : null;
  const selectedIds = new Set(selected);
  state.floorCards = state.floorCards.filter(floorId => !selectedIds.has(floorId));
  if (ppeokPile) state.ppeokPiles = (state.ppeokPiles ?? []).filter(pile => pile !== knownPpeokPile);
  state[capturedKey].push(...selected, cardId);
  const selectionNote = matches.length === 2 ? ' 두 장 중 한 장을 골라' : matches.length === 3 ? ' 세 장을 모두' : '';
  return { captured: [...selected, cardId], ppeokPile, message: `${card?.month ?? '?'}월 패${selectionNote} 먹었습니다.` };
}

function stealPee(state: GameState, player: PlayerId, count: number): string[] {
  if (count <= 0) return [];
  const actorKey = player === 'human' ? 'humanCaptured' : 'computerCaptured';
  const opponentKey = player === 'human' ? 'computerCaptured' : 'humanCaptured';
  const result = stealPeeCards(state[opponentKey], count);
  state[opponentKey] = result.remaining;
  state[actorKey].push(...result.stolenCardIds);
  return result.stolenCardIds;
}

function makeSpecialEvent(state: GameState, player: PlayerId, kind: TurnSpecialKind, label: string, stealCount: number): TurnSpecialEvent {
  return { kind, label, stolenPee: stealPee(state, player, stealCount) };
}

function ppeokCaptureEvent(state: GameState, player: PlayerId, pile: PpeokPile | null): TurnSpecialEvent | null {
  if (!pile) return null;
  const isSelfPpeok = pile.owner === player;
  return makeSpecialEvent(state, player, isSelfPpeok ? 'self-ppeok' : 'ppeok-capture', isSelfPpeok ? '자뻑' : '싼 패 먹기', isSelfPpeok ? 2 : 1);
}

function missionOutcome(state: GameState, player: PlayerId, capturedCardIds: string[]) {
  const missionCards = capturedMissionCards(state.mission, capturedCardIds);
  return {
    missionCards,
    missionMultiplier: missionMultiplierFor(state.mission, state.humanCaptured, state.computerCaptured, player)
  };
}

function missionMessage(outcome: ReturnType<typeof missionOutcome>): string {
  return outcome.missionCards.length
    ? ` 미션패 ${outcome.missionCards.length}장을 획득해 미션 배수가 ×${outcome.missionMultiplier}가 되었습니다.`
    : '';
}

function advanceAfterAction(next: GameState, player: PlayerId, actionMessage: string) {
  const keys = keysFor(player);
  next.turnNumber += 1;
  next.currentPlayer = otherPlayer(player);
  next.lastAction = `${player === 'human' ? '내가' : '컴퓨터가'} ${actionMessage}`;

  if (isThreePpeok(next[keys.ppeok])) {
    finishThreePpeok(next, player);
    return;
  }
  const score = scoreFor(next, player);
  const allTurnsFinished = next.humanHand.length === 0
    && next.computerHand.length === 0
    && (next.humanBombSkips ?? 0) === 0
    && (next.computerBombSkips ?? 0) === 0;
  if (allTurnsFinished) {
    if (canChooseGoStop(score.total, next[keys.lastGo])) {
      finishScoredRound(next, player, '마지막 패까지 모두 내서 자동으로 스톱했습니다.');
    } else {
      next.phase = 'round-ended';
      next.pendingDecision = null;
      next.roundResult = 'nagari';
      next.lastAction = '모든 패를 냈지만 7점에 도달하지 못해 나가리입니다.';
    }
    return;
  }
  if (canChooseGoStop(score.total, next[keys.lastGo])) {
    next.phase = 'awaiting-go-stop';
    next.pendingDecision = player;
    next.lastAction += ` 현재 ${score.total}점입니다. 고 또는 스톱을 선택하세요.`;
  }
}

function scoreFor(state: GameState, player: PlayerId) {
  const keys = keysFor(player);
  return calculateCapturedScore(state[keys.captured], { gookjinAsDoubleJunk: state[keys.gookjin] });
}

function finishThreePpeok(state: GameState, player: PlayerId) {
  const winnerScore = scoreFor(state, player);
  const loserScore = scoreFor(state, otherPlayer(player));
  state.phase = 'round-ended';
  state.winner = player;
  state.roundResult = 'win';
  state.settlement = calculateSettlement({
    winnerScore, loserScore, winnerGoCount: 0,
    settings: matgoRulesForPointValue(state.pointValue),
    roundMultiplier: state.roundMultiplier,
    suppressMultipliers: true,
    forcedBaseScore: PMANG_MATGO_RULES.threePpeokBaseScore
  });
  state.lastAction = `${player === 'human' ? '내가' : '컴퓨터가'} 3뻑으로 기본 ${PMANG_MATGO_RULES.threePpeokBaseScore}점 승리했습니다. 고·흔들기·박 배수는 붙지 않습니다.`;
}

function finishScoredRound(state: GameState, player: PlayerId, message: string) {
  const winnerKeys = keysFor(player);
  const loserKeys = keysFor(otherPlayer(player));
  state.settlement = calculateSettlement({
    winnerScore: scoreFor(state, player),
    loserScore: scoreFor(state, otherPlayer(player)),
    winnerGoCount: state[winnerKeys.go],
    winnerShakeCount: state[winnerKeys.shake] ?? 0,
    winnerMissionMultiplier: missionMultiplierFor(state.mission, state.humanCaptured, state.computerCaptured, player),
    loserGoCount: state[loserKeys.go],
    loserScoreAtLastGo: state[loserKeys.lastGo],
    settings: matgoRulesForPointValue(state.pointValue),
    roundMultiplier: state.roundMultiplier
  });
  state.phase = 'round-ended';
  state.pendingDecision = null;
  state.winner = player;
  state.roundResult = 'win';
  state.lastAction = `${player === 'human' ? '내가' : '컴퓨터가'} ${message} 최종 ${state.settlement.finalScore}점입니다.`;
}

export interface PlayTurnOptions {
  playedMatchId?: string;
  drawnMatchId?: string;
}

export function declareShake(state: GameState, player: PlayerId, month: number): GameState {
  if (state.phase !== 'playing' || state.currentPlayer !== player) throw new Error('지금 흔들 수 없는 차례입니다.');
  const keys = keysFor(player);
  if (state[keys.pendingShake]) throw new Error('이미 흔들기를 선언했습니다. 표시된 패 중 한 장을 내세요.');
  const option = findShakeOptions(state[keys.hand], state.floorCards, state[keys.shakenMonths] ?? [])
    .find(candidate => candidate.month === month);
  if (!option) throw new Error('선택한 월에는 흔들 수 있는 세 장이 없습니다.');
  const next = structuredClone(state);
  next[keys.shake] = (next[keys.shake] ?? 0) + 1;
  next[keys.shakenMonths] = [...(next[keys.shakenMonths] ?? []), month];
  next[keys.pendingShake] = month;
  next.lastAction = `${player === 'human' ? '내가' : '컴퓨터가'} ${month}월 세 장을 흔들었습니다. 세 장 중 낼 패를 고르세요.`;
  return next;
}

export function playTurn(state: GameState, player: PlayerId, cardId: string, options: PlayTurnOptions = {}): TurnResult {
  if (state.phase !== 'playing' || state.currentPlayer !== player) throw new Error('지금 낼 수 없는 차례입니다.');
  const keys = keysFor(player);
  const handIndex = state[keys.hand].indexOf(cardId);
  if (handIndex < 0) throw new Error('손에 없는 패입니다.');
  const pendingShakeMonth = state[keys.pendingShake] ?? null;
  if (pendingShakeMonth && getCard(cardId)?.month !== pendingShakeMonth) {
    throw new Error(`${pendingShakeMonth}월 흔들기 패 중 한 장을 내야 합니다.`);
  }

  const next = structuredClone(state);
  const isLastHandCard = next[keys.hand].length === 1 && (next[keys.bombSkips] ?? 0) === 0;
  next[keys.pendingShake] = null;
  if (isBonusPee(cardId)) {
    const bonus = playBonusPeeFromHand(next, player, cardId);
    const captured = [...bonus.bonusCards, ...bonus.stolenPee];
    const mission = missionOutcome(next, player, captured);
    const actor = player === 'human' ? '내가' : '컴퓨터가';
    const stealMessage = bonus.stolenPee.length ? ' 상대 피 1장을 가져왔습니다.' : '';
    next.lastAction = `${actor} 보너스패를 내고 새 패를 받았습니다.${stealMessage}${missionMessage(mission)} 같은 차례를 계속합니다.`;
    return {
      state: next,
      playedCardId: cardId,
      drawnCardId: null,
      captured,
      ppeok: false,
      bonusCards: bonus.bonusCards,
      stolenPee: bonus.stolenPee,
      bonusStolenPee: bonus.stolenPee,
      specialEvents: [],
      ...mission,
      replacementCardId: bonus.replacementCardId,
      continuesTurn: true
    };
  }
  const initialMatches = matchingFloorCards(next, cardId);
  next[keys.hand].splice(handIndex, 1);
  const bonusDraw = drawThroughBonusPee(next, player);
  const drawnCardId = bonusDraw.drawnCardId;
  const isPpeok = initialMatches.length === 1 && drawnCardId !== null && getCard(drawnCardId)?.month === getCard(cardId)?.month;
  let captured: string[] = [];
  const specialEvents: TurnSpecialEvent[] = [];
  let actionMessage = '';

  if (isPpeok && drawnCardId) {
    next.floorCards.push(cardId, drawnCardId);
    next[keys.ppeok] += 1;
    next.ppeokPiles = [...(next.ppeokPiles ?? []), {
      month: getCard(cardId)?.month ?? 0,
      owner: player,
      cardIds: [initialMatches[0], cardId, drawnCardId]
    }];
    specialEvents.push({ kind: 'ppeok', label: '뻑', stolenPee: [] });
    captured = [...bonusDraw.bonusCards, ...bonusDraw.stolenPee];
    actionMessage = `${getCard(cardId)?.month ?? '?'}월 3장이 겹쳐 ${next[keys.ppeok]}번째 뻑입니다.`;
  } else {
    const played = captureOrPlace(next, cardId, keys.captured, options.playedMatchId);
    const drawn = drawnCardId ? captureOrPlace(next, drawnCardId, keys.captured, options.drawnMatchId) : null;
    const playedPpeok = ppeokCaptureEvent(next, player, played.ppeokPile);
    const drawnPpeok = ppeokCaptureEvent(next, player, drawn?.ppeokPile ?? null);
    if (playedPpeok) specialEvents.push(playedPpeok);
    if (drawnPpeok) specialEvents.push(drawnPpeok);

    const sameMonthDraw = drawnCardId !== null && getCard(drawnCardId)?.month === getCard(cardId)?.month;
    if (!isLastHandCard && initialMatches.length === 0 && sameMonthDraw) {
      specialEvents.push(makeSpecialEvent(next, player, 'jjok', '쪽', 1));
    }
    if (!isLastHandCard && initialMatches.length === 2 && sameMonthDraw) {
      specialEvents.push(makeSpecialEvent(next, player, 'ttadak', '따닥', 1));
    }
    if (!isLastHandCard && next.floorCards.length === 0) {
      specialEvents.push(makeSpecialEvent(next, player, 'sweep', '싹쓸이', 1));
    }

    const specialStolenPee = specialEvents.flatMap(event => event.stolenPee);
    captured = [...bonusDraw.bonusCards, ...bonusDraw.stolenPee, ...played.captured, ...(drawn?.captured ?? []), ...specialStolenPee];
    actionMessage = `${played.message}${drawn ? ` 뒤집은 패로 ${drawn.message}` : ''}`;
    if (specialEvents.length) {
      const stolenCount = specialStolenPee.length;
      actionMessage += ` ${specialEvents.map(event => event.label).join('·')}!${stolenCount ? ` 상대 피 ${stolenCount}장을 가져왔습니다.` : ''}`;
    }
  }

  if (bonusDraw.bonusCards.length) {
    const stealMessage = bonusDraw.stolenPee.length ? ` 상대 피 ${bonusDraw.stolenPee.length}장을 가져왔습니다.` : '';
    actionMessage = `뒤집기에서 보너스패 ${bonusDraw.bonusCards.length}장을 얻었습니다.${stealMessage} ${actionMessage}`;
  }

  const mission = missionOutcome(next, player, captured);
  actionMessage += missionMessage(mission);

  advanceAfterAction(next, player, actionMessage);

  return {
    state: next, playedCardId: cardId, drawnCardId, captured, ppeok: isPpeok,
    bonusCards: bonusDraw.bonusCards,
    stolenPee: [...bonusDraw.stolenPee, ...specialEvents.flatMap(event => event.stolenPee)],
    bonusStolenPee: bonusDraw.stolenPee,
    specialEvents,
    ...mission
  };
}

export function playBomb(state: GameState, player: PlayerId, month: number): TurnResult {
  if (state.phase !== 'playing' || state.currentPlayer !== player) throw new Error('지금 폭탄을 사용할 수 없습니다.');
  const keys = keysFor(player);
  const option = findBombOptions(state[keys.hand], state.floorCards, PMANG_MATGO_RULES.allowTwoCardBomb).find(candidate => candidate.month === month);
  if (!option) throw new Error('선택한 월에는 사용할 수 있는 폭탄이 없습니다.');
  const next = structuredClone(state);
  const emptiesHand = next[keys.hand].length === option.handCardIds.length;
  next[keys.shake] = (next[keys.shake] ?? 0) + 1;
  next[keys.bombCount] = (next[keys.bombCount] ?? 0) + 1;
  const handSet = new Set(option.handCardIds);
  const floorSet = new Set(option.floorCardIds);
  next[keys.hand] = next[keys.hand].filter(id => !handSet.has(id));
  next[keys.bombSkips] = (next[keys.bombSkips] ?? 0) + option.handCardIds.length - 1;
  next.floorCards = next.floorCards.filter(id => !floorSet.has(id));
  next[keys.captured].push(...option.handCardIds, ...option.floorCardIds);
  const specialEvents: TurnSpecialEvent[] = [makeSpecialEvent(next, player, 'bomb', option.kind === 'two-card-bomb' ? '두장폭탄' : '폭탄', 1)];
  const bonusDraw = drawThroughBonusPee(next, player);
  const drawnCardId = bonusDraw.drawnCardId;
  const drawn = drawnCardId ? captureOrPlace(next, drawnCardId, keys.captured) : null;
  const drawnPpeok = ppeokCaptureEvent(next, player, drawn?.ppeokPile ?? null);
  if (drawnPpeok) specialEvents.push(drawnPpeok);
  if (!emptiesHand && next.floorCards.length === 0) specialEvents.push(makeSpecialEvent(next, player, 'sweep', '싹쓸이', 1));
  const specialStolenPee = specialEvents.flatMap(event => event.stolenPee);
  const captured = [...option.handCardIds, ...option.floorCardIds, ...bonusDraw.bonusCards, ...bonusDraw.stolenPee, ...(drawn?.captured ?? []), ...specialStolenPee];
  const mission = missionOutcome(next, player, captured);
  const bonusMessage = bonusDraw.bonusCards.length ? ` 보너스패 ${bonusDraw.bonusCards.length}장을 얻었습니다.` : '';
  const stolenMessage = specialStolenPee.length ? ` 상대 피 ${specialStolenPee.length}장을 가져왔습니다.` : '';
  advanceAfterAction(next, player, `${month}월 ${option.kind === 'two-card-bomb' ? '두장폭탄' : '폭탄'}을 사용했습니다.${stolenMessage}${bonusMessage}${drawn ? ` 뒤집은 패로 ${drawn.message}` : ''}${missionMessage(mission)}`);
  return {
    state: next, playedCardId: option.handCardIds[0], drawnCardId, captured, ppeok: false,
    bonusCards: bonusDraw.bonusCards,
    stolenPee: [...bonusDraw.stolenPee, ...specialStolenPee],
    bonusStolenPee: bonusDraw.stolenPee,
    specialEvents,
    ...mission
  };
}

export function playFlipOnlyTurn(state: GameState, player: PlayerId, drawnMatchId?: string): TurnResult {
  if (state.phase !== 'playing' || state.currentPlayer !== player) throw new Error('지금 뒤집을 수 없는 차례입니다.');
  const keys = keysFor(player);
  if ((state[keys.bombSkips] ?? 0) <= 0) throw new Error('폭탄으로 비워 둔 차례가 없습니다.');
  if (state[keys.pendingShake]) throw new Error('흔들기를 선언한 패 중 한 장을 먼저 내야 합니다.');
  const next = structuredClone(state);
  next[keys.bombSkips] = (next[keys.bombSkips] ?? 0) - 1;
  const bonusDraw = drawThroughBonusPee(next, player);
  const drawnCardId = bonusDraw.drawnCardId;
  const drawn = drawnCardId ? captureOrPlace(next, drawnCardId, keys.captured, drawnMatchId) : null;
  const specialEvents: TurnSpecialEvent[] = [];
  const drawnPpeok = ppeokCaptureEvent(next, player, drawn?.ppeokPile ?? null);
  if (drawnPpeok) specialEvents.push(drawnPpeok);
  const specialStolenPee = specialEvents.flatMap(event => event.stolenPee);
  const captured = [...bonusDraw.bonusCards, ...bonusDraw.stolenPee, ...(drawn?.captured ?? []), ...specialStolenPee];
  const mission = missionOutcome(next, player, captured);
  const bonusMessage = bonusDraw.bonusCards.length ? ` 보너스패 ${bonusDraw.bonusCards.length}장을 얻었습니다.` : '';
  const specialMessage = specialEvents.length ? ` ${specialEvents.map(event => event.label).join('·')}!${specialStolenPee.length ? ` 상대 피 ${specialStolenPee.length}장을 가져왔습니다.` : ''}` : '';
  advanceAfterAction(next, player, `폭탄으로 비워 둔 차례에 패를 뒤집었습니다.${bonusMessage}${drawn ? ` ${drawn.message}` : ''}${specialMessage}${missionMessage(mission)}`);
  return {
    state: next, playedCardId: null, drawnCardId, captured, ppeok: false,
    bonusCards: bonusDraw.bonusCards,
    stolenPee: [...bonusDraw.stolenPee, ...specialStolenPee],
    bonusStolenPee: bonusDraw.stolenPee,
    specialEvents,
    ...mission
  };
}

export function chooseGo(state: GameState, player: PlayerId): GameState {
  if (state.phase !== 'awaiting-go-stop' || state.pendingDecision !== player) throw new Error('지금은 고를 선택할 수 없습니다.');
  const next = structuredClone(state);
  const keys = keysFor(player);
  const score = scoreFor(next, player);
  next[keys.go] += 1;
  next[keys.lastGo] = score.total;
  next.phase = 'playing';
  next.pendingDecision = null;
  next.currentPlayer = otherPlayer(player);
  next.lastAction = `${player === 'human' ? '내가' : '컴퓨터가'} ${next[keys.go]}고를 선택했습니다.`;
  return next;
}

export function chooseStop(state: GameState, player: PlayerId): GameState {
  if (state.phase !== 'awaiting-go-stop' || state.pendingDecision !== player) throw new Error('지금은 스톱을 선택할 수 없습니다.');
  const next = structuredClone(state);
  finishScoredRound(next, player, '스톱했습니다.');
  return next;
}

export function chooseChongtong(state: GameState, player: PlayerId, decision: 'continue' | 'stop'): GameState {
  if (state.phase !== 'awaiting-chongtong' || state.pendingDecision !== player || state.chongtongOwner !== player) {
    throw new Error('지금은 총통 진행 여부를 선택할 수 없습니다.');
  }
  const next = structuredClone(state);
  next.pendingDecision = null;
  if (decision === 'continue') {
    next.phase = 'playing';
    next.canShakeFour = true;
    next.canBombAfterChongtong = true;
    const keys = keysFor(player);
    next[keys.shake] = (next[keys.shake] ?? 0) + 1;
    if (next.chongtongMonth) next[keys.shakenMonths] = [...(next[keys.shakenMonths] ?? []), next.chongtongMonth];
    next.lastAction = `${player === 'human' ? '내가' : '컴퓨터가'} 총통을 공개하고 계속합니다. 4장 흔들기와 이후 폭탄이 인정됩니다.`;
    return next;
  }
  next.phase = 'round-ended';
  next.winner = player;
  next.roundResult = 'win';
  next.settlement = calculateSettlement({
    winnerScore: scoreFor(next, player),
    loserScore: scoreFor(next, otherPlayer(player)),
    winnerGoCount: 0,
    settings: matgoRulesForPointValue(next.pointValue),
    roundMultiplier: next.roundMultiplier,
    forcedBaseScore: PMANG_MATGO_RULES.targetScore,
    suppressMultipliers: true
  });
  next.lastAction = `${player === 'human' ? '내가' : '컴퓨터가'} 총통으로 기본 ${PMANG_MATGO_RULES.targetScore}점 승리했습니다.`;
  return next;
}

export function setGookjinChoice(state: GameState, player: PlayerId, asDoubleJunk: boolean): GameState {
  const keys = keysFor(player);
  if (!state[keys.captured].includes('m09-01')) throw new Error('국진 패를 획득하지 않았습니다.');
  const next = structuredClone(state);
  const previousLastAction = next.lastAction;
  next[keys.gookjin] = asDoubleJunk;
  const choiceAction = asDoubleJunk
    ? '국진을 쌍피로 바꿔 피 묶음으로 옮겼습니다.'
    : '국진을 열끗으로 바꿔 열끗 묶음으로 옮겼습니다.';
  next.lastAction = choiceAction;
  const score = scoreFor(next, player);
  const canDecide = canChooseGoStop(score.total, next[keys.lastGo]);
  const allTurnsFinished = next.humanHand.length === 0 && next.computerHand.length === 0
    && (next.humanBombSkips ?? 0) === 0 && (next.computerBombSkips ?? 0) === 0;
  const wasFinalTurnResult = allTurnsFinished && next.phase === 'round-ended'
    && (previousLastAction.includes('마지막 패까지') || next.roundResult === 'nagari');
  if (wasFinalTurnResult) {
    if (canDecide) finishScoredRound(next, player, `${choiceAction} 마지막 패까지 모두 내서 자동으로 스톱했습니다.`);
    else {
      next.pendingDecision = null; next.winner = null; next.roundResult = 'nagari'; next.settlement = null;
      next.lastAction = `${choiceAction} 모든 패를 냈지만 7점에 도달하지 못해 나가리입니다.`;
    }
  } else if (next.phase === 'awaiting-go-stop' && next.pendingDecision === player && !canDecide) {
    next.phase = 'playing'; next.pendingDecision = null;
    next.lastAction += ` 현재 ${score.total}점이라 승부 선택 없이 상대 차례로 넘어갑니다.`;
  } else if (next.phase === 'playing' && canDecide) {
    next.phase = 'awaiting-go-stop';
    next.pendingDecision = player;
    next.currentPlayer = otherPlayer(player);
    next.lastAction += ` 현재 ${score.total}점입니다. 고 또는 스톱을 선택하세요.`;
  }
  return next;
}

export function chooseComputerCard(state: GameState, difficulty: AiDifficulty = state.computerDifficulty ?? 'normal'): string | null {
  if (state.currentPlayer !== 'computer' || state.computerHand.length === 0) return null;
  return chooseAiCard(state, 'computer', difficulty);
}

export function allCardIds(state: GameState): string[] {
  return [...state.humanHand, ...state.computerHand, ...state.floorCards, ...state.drawPile, ...state.humanCaptured, ...state.computerCaptured];
}

export function isValidGameState(state: unknown): state is GameState {
  if (!state || typeof state !== 'object') return false;
  const candidate = state as GameState;
  if (candidate.stateVersion !== 2 && candidate.stateVersion !== GAME_STATE_VERSION) return false;
  if (candidate.pointValue !== undefined && !isMatgoPointValue(candidate.pointValue)) return false;
  if (candidate.roundMultiplier !== undefined && (!Number.isInteger(candidate.roundMultiplier) || candidate.roundMultiplier < 1)) return false;
  const ids = allCardIds(candidate);
  const expectedCardCount = candidate.stateVersion === 2 ? 48 : 50;
  return ids.length === expectedCardCount && new Set(ids).size === expectedCardCount && ids.every(cardId => getCard(cardId));
}
