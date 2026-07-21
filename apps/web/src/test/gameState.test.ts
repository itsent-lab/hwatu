import { beforeAll, describe, expect, it } from 'vitest';
import { createMatgoDeck } from '../engine/deck';
import { allCardIds, chooseChongtong, chooseComputerCard, chooseGo, chooseStartingPlayer, chooseStop, createInitialGame, declareShake, getDrawFloorChoice, getFlipOnlyDrawChoice, getMatchingFloorCards, isValidGameState, playBomb, playFlipOnlyTurn, playTurn, setGookjinChoice, setPointValue } from '../engine/gameState';

function createForcedPpeokGame() {
  const game = createInitialGame(101);
  const fixed = ['m01-01', 'm01-02', 'm01-03'];
  const remaining = createMatgoDeck().filter(id => !fixed.includes(id));
  game.humanHand = [fixed[0], ...remaining.splice(0, 9)];
  game.computerHand = remaining.splice(0, 10);
  game.floorCards = [fixed[1], ...remaining.splice(0, 7)];
  game.drawPile = [fixed[2], ...remaining];
  game.humanCaptured = [];
  game.computerCaptured = [];
  game.phase = 'playing';
  game.currentPlayer = 'human';
  game.roundResult = null;
  return game;
}

interface ArrangedGameOptions {
  humanHand: string[];
  computerHand?: string[];
  floorCards: string[];
  drawFirst: string[];
  humanCaptured?: string[];
  computerCaptured?: string[];
  humanHandSize?: number;
  computerHandSize?: number;
  floorSize?: number;
}

function createArrangedGame(options: ArrangedGameOptions) {
  const fixed = [
    ...options.humanHand,
    ...(options.computerHand ?? []),
    ...options.floorCards,
    ...options.drawFirst,
    ...(options.humanCaptured ?? []),
    ...(options.computerCaptured ?? [])
  ];
  const remaining = createMatgoDeck().filter(id => !fixed.includes(id));
  const game = createInitialGame(707);
  game.humanHand = [...options.humanHand, ...remaining.splice(0, (options.humanHandSize ?? 10) - options.humanHand.length)];
  game.computerHand = [...(options.computerHand ?? []), ...remaining.splice(0, (options.computerHandSize ?? 10) - (options.computerHand?.length ?? 0))];
  game.floorCards = [...options.floorCards, ...remaining.splice(0, (options.floorSize ?? 8) - options.floorCards.length)];
  game.drawPile = [...options.drawFirst, ...remaining];
  game.humanCaptured = [...(options.humanCaptured ?? [])];
  game.computerCaptured = [...(options.computerCaptured ?? [])];
  game.ppeokPiles = [];
  game.phase = 'playing';
  game.currentPlayer = 'human';
  game.turnNumber = 0;
  game.roundResult = null;
  return game;
}

beforeAll(() => {
  if (!globalThis.crypto?.randomUUID) {
    Object.defineProperty(globalThis, 'crypto', { value: { randomUUID: () => '00000000-0000-4000-8000-000000000000' } });
  }
});

describe('기본 맞고 진행 상태', () => {
  it('새 판은 보너스패를 포함해 중복 없는 50장으로 시작한다', () => {
    const game = createInitialGame(42);
    expect(isValidGameState(game)).toBe(true);
    expect(new Set(allCardIds(game))).toHaveLength(50);
  });

  it('사람과 컴퓨터가 한 번씩 내도 카드 보존 조건을 지킨다', () => {
    const game = createInitialGame(78);
    const afterHuman = playTurn(game, 'human', game.humanHand[0]).state;
    const computerCard = chooseComputerCard(afterHuman);
    expect(computerCard).not.toBeNull();
    const afterComputer = playTurn(afterHuman, 'computer', computerCard!).state;
    expect(afterComputer.turnNumber).toBe(2);
    expect(afterComputer.currentPlayer).toBe('human');
    expect(isValidGameState(afterComputer)).toBe(true);
  });

  it('자기 차례가 아니거나 손에 없는 패는 거부한다', () => {
    const game = createInitialGame(90);
    expect(() => playTurn(game, 'computer', game.computerHand[0])).toThrow();
    expect(() => playTurn(game, 'human', 'not-a-card')).toThrow();
  });

  it('판마다 선을 공정하게 정하고 선 표시를 게임 상태에 보존한다', () => {
    expect(createInitialGame(100).startingPlayer).toBe('human');
    expect(createInitialGame(101).startingPlayer).toBe('computer');
  });

  it('점당 금액은 진행 중에도 바꾸고 다음 판은 승자가 선을 이어간다', () => {
    const firstGame = createInitialGame(100);
    const selectedStake = setPointValue(firstGame, 5_000);
    const selectedDealer = chooseStartingPlayer(selectedStake, 'human');
    expect(selectedDealer.pointValue).toBe(5_000);
    expect(setPointValue(selectedDealer, 100).pointValue).toBe(100);

    const endedGame = structuredClone(selectedDealer);
    endedGame.phase = 'round-ended';
    expect(() => setPointValue(endedGame, 1_000)).toThrow('이미 끝난 판');

    const nextGame = createInitialGame(101, 'normal', 5_000, 'human');
    expect(nextGame.startingPlayer).toBe('human');
    expect(nextGame.startingPlayerConfirmed).toBe(true);
    expect(nextGame.lastAction).toContain('전 판 승자로 선공');
  });

  it('첫 패를 내기 전에 선공과 후공을 직접 정하고 바닥 보너스패를 선에게 준다', () => {
    const game = Array.from({ length: 500 }, (_, seed) => createInitialGame(seed + 1))
      .find(candidate => candidate.humanCaptured.length + candidate.computerCaptured.length > 0)!;
    const initialBonusCount = game.humanCaptured.length + game.computerCaptured.length;
    expect(game.startingPlayerConfirmed).toBe(false);

    const selected = chooseStartingPlayer(game, 'computer');
    expect(selected.startingPlayer).toBe('computer');
    expect(selected.currentPlayer).toBe('computer');
    expect(selected.startingPlayerConfirmed).toBe(true);
    expect(selected.humanCaptured).toHaveLength(0);
    expect(selected.computerCaptured).toHaveLength(initialBonusCount);
    expect(() => chooseStartingPlayer(selected, 'human')).toThrow('이미 선공과 후공이 정해진 판');
    expect(isValidGameState(selected)).toBe(true);
  });

  it('손의 보너스패를 내면 상대 피를 뺏고 새 패를 받아 같은 차례를 계속한다', () => {
    const game = createInitialGame(92);
    const fixed = ['bonus-pee-1', 'm01-03', 'm02-01'];
    const remaining = createMatgoDeck().filter(id => !fixed.includes(id));
    game.humanHand = [fixed[0], ...remaining.splice(0, 9)];
    game.computerHand = remaining.splice(0, 10);
    game.floorCards = remaining.splice(0, 8);
    game.drawPile = [fixed[2], ...remaining];
    game.humanCaptured = [];
    game.computerCaptured = [fixed[1]];
    game.phase = 'playing'; game.currentPlayer = 'human'; game.turnNumber = 0;

    const result = playTurn(game, 'human', fixed[0]);
    expect(result.continuesTurn).toBe(true);
    expect(result.replacementCardId).toBe(fixed[2]);
    expect(result.state.currentPlayer).toBe('human');
    expect(result.state.turnNumber).toBe(0);
    expect(result.state.humanHand).toHaveLength(10);
    expect(result.state.humanCaptured).toEqual(expect.arrayContaining([fixed[0], fixed[1]]));
    expect(result.state.computerCaptured).not.toContain(fixed[1]);
    expect(isValidGameState(result.state)).toBe(true);
  });

  it('뒤집기에서 보너스패가 나오면 획득하고 일반 패가 나올 때까지 다시 뒤집는다', () => {
    const game = createInitialGame(93);
    const fixed = ['m01-01', 'm01-02', 'bonus-double-pee-1', 'm12-02', 'm02-03'];
    const remaining = createMatgoDeck().filter(id => !fixed.includes(id));
    game.humanHand = [fixed[0], ...remaining.splice(0, 9)];
    game.computerHand = remaining.splice(0, 10);
    game.floorCards = [fixed[1], ...remaining.splice(0, 7)];
    game.drawPile = [fixed[2], fixed[3], ...remaining];
    game.humanCaptured = [];
    game.computerCaptured = [fixed[4]];
    game.phase = 'playing'; game.currentPlayer = 'human'; game.turnNumber = 0;

    const result = playTurn(game, 'human', fixed[0]);
    expect(result.bonusCards).toEqual([fixed[2]]);
    expect(result.stolenPee).toEqual([fixed[4]]);
    expect(result.drawnCardId).toBe(fixed[3]);
    expect(result.state.humanCaptured).toEqual(expect.arrayContaining([fixed[2], fixed[4]]));
    expect(result.state.computerCaptured).toEqual([]);
    expect(result.state.turnNumber).toBe(1);
    expect(isValidGameState(result.state)).toBe(true);
  });

  it('낸 패와 뒤집은 패가 같은 월로 겹치면 뻑으로 바닥에 세 장을 남긴다', () => {
    const game = createForcedPpeokGame();
    const result = playTurn(game, 'human', 'm01-01');
    expect(result.ppeok).toBe(true);
    expect(result.state.floorCards.filter(id => id.startsWith('m01-'))).toHaveLength(3);
    expect(result.state.humanPpeokCount).toBe(1);
    expect(result.state.ppeokPiles).toEqual([expect.objectContaining({ month: 1, owner: 'human' })]);
  });

  it('상대가 만든 뻑을 먹으면 상대 피 한 장을 가져온다', () => {
    const game = createArrangedGame({
      humanHand: ['m01-01'], computerHand: ['m01-04'], floorCards: ['m01-02'], drawFirst: ['m01-03', 'm12-04'],
      humanCaptured: ['m02-03']
    });
    const ppeok = playTurn(game, 'human', 'm01-01').state;
    const result = playTurn(ppeok, 'computer', 'm01-04');
    expect(result.specialEvents).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'ppeok-capture', stolenPee: ['m02-03'] })]));
    expect(result.state.computerCaptured).toContain('m02-03');
    expect(result.state.humanCaptured).not.toContain('m02-03');
    expect(result.state.ppeokPiles).toHaveLength(0);
  });

  it('마지막 손패로 상대가 만든 뻑을 먹으면 상대 피를 가져오지 않는다', () => {
    const game = createArrangedGame({
      humanHand: ['m01-04'], humanHandSize: 1,
      floorCards: ['m01-01', 'm01-02', 'm01-03'], floorSize: 3,
      drawFirst: ['m12-04'], computerCaptured: ['m02-03']
    });
    const result = playTurn(game, 'human', 'm01-04');
    expect(result.specialEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'ppeok-capture', stolenPee: [] })
    ]));
    expect(result.state.computerCaptured).toEqual(['m02-03']);
  });

  it('자기가 만든 뻑을 다시 먹는 자뻑은 상대 피 두 장을 가져온다', () => {
    const game = createArrangedGame({
      humanHand: ['m01-01', 'm01-04'], floorCards: ['m01-02'], drawFirst: ['m01-03', 'm12-04'],
      computerCaptured: ['m02-03', 'm03-03']
    });
    const ppeok = playTurn(game, 'human', 'm01-01').state;
    ppeok.currentPlayer = 'human';
    const result = playTurn(ppeok, 'human', 'm01-04');
    expect(result.specialEvents).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'self-ppeok', stolenPee: ['m02-03', 'm03-03'] })]));
    expect(result.state.computerCaptured).toHaveLength(0);
  });

  it('빈 패를 냈다가 뒤집은 같은 월 패로 먹는 쪽은 상대 피 한 장을 가져온다', () => {
    const game = createArrangedGame({
      humanHand: ['m01-01'], floorCards: [], floorSize: 8, drawFirst: ['m01-02'],
      humanCaptured: ['m01-03', 'm01-04'], computerCaptured: ['m02-03']
    });
    const result = playTurn(game, 'human', 'm01-01');
    expect(result.specialEvents).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'jjok', stolenPee: ['m02-03'] })]));
    expect(result.state.computerCaptured).toHaveLength(0);
  });

  it('따닥과 싹쓸이가 한 번에 겹치면 각각 상대 피 한 장씩 가져온다', () => {
    const game = createArrangedGame({
      humanHand: ['m01-01'], floorCards: ['m01-02', 'm01-03'], floorSize: 2, drawFirst: ['m01-04'],
      computerCaptured: ['m02-03', 'm03-03']
    });
    const result = playTurn(game, 'human', 'm01-01');
    expect(result.specialEvents?.map(event => event.kind)).toEqual(['ttadak', 'sweep']);
    expect(result.stolenPee).toEqual(['m02-03', 'm03-03']);
    expect(result.state.floorCards).toHaveLength(0);
  });

  it('마지막 손패에서는 쪽·따닥·싹쓸이 피 뺏기 보너스를 적용하지 않는다', () => {
    const game = createArrangedGame({
      humanHand: ['m01-01'], humanHandSize: 1, floorCards: ['m01-02', 'm01-03'], floorSize: 2,
      drawFirst: ['m01-04'], computerCaptured: ['m02-03', 'm03-03']
    });
    const result = playTurn(game, 'human', 'm01-01');
    expect(result.specialEvents).toEqual([]);
    expect(result.state.computerCaptured).toEqual(['m02-03', 'm03-03']);
  });

  it('양쪽 마지막 패까지 모두 낸 뒤 승리 점수가 되면 고·스톱을 묻지 않고 자동으로 끝낸다', () => {
    const game = createArrangedGame({
      humanHand: ['m02-03'], humanHandSize: 1,
      computerHand: [], computerHandSize: 0,
      floorCards: ['m02-04'], floorSize: 1,
      drawFirst: ['m04-03'],
      humanCaptured: ['m01-01', 'm03-01', 'm08-01', 'm11-01', 'm12-01']
    });
    const result = playTurn(game, 'human', 'm02-03').state;
    expect(result.phase).toBe('round-ended');
    expect(result.pendingDecision).toBeNull();
    expect(result.winner).toBe('human');
    expect(result.roundResult).toBe('win');
    expect(result.settlement?.finalScore).toBeGreaterThanOrEqual(7);
    expect(result.lastAction).toContain('자동으로 스톱');
  });

  it('양쪽 마지막 패까지 모두 냈지만 7점 미만이면 바로 나가리로 끝낸다', () => {
    const game = createArrangedGame({
      humanHand: ['m02-03'], humanHandSize: 1,
      computerHand: [], computerHandSize: 0,
      floorCards: ['m02-04'], floorSize: 1,
      drawFirst: ['m04-03']
    });
    const result = playTurn(game, 'human', 'm02-03').state;
    expect(result.phase).toBe('round-ended');
    expect(result.pendingDecision).toBeNull();
    expect(result.winner).toBeNull();
    expect(result.roundResult).toBe('nagari');
    expect(result.lastAction).toContain('모든 패를 냈지만');
  });

  it('3뻑은 박과 고 배수 없이 기본 7점으로 끝난다', () => {
    const game = createForcedPpeokGame();
    game.humanPpeokCount = 2;
    const result = playTurn(game, 'human', 'm01-01').state;
    expect(result.phase).toBe('round-ended');
    expect(result.winner).toBe('human');
    expect(result.settlement?.finalScore).toBe(7);
    expect(result.settlement?.bakMultiplier).toBe(1);
    expect(result.settlement?.goMultiplier).toBe(1);
  });

  it('7점 이상이면 고를 선택하고 다음 추가 득점 때 다시 선택할 수 있다', () => {
    const game = createInitialGame(55);
    game.humanCaptured = ['m01-01', 'm03-01', 'm08-01', 'm11-01', 'm12-01'];
    game.phase = 'awaiting-go-stop';
    game.pendingDecision = 'human';
    const afterGo = chooseGo(game, 'human');
    expect(afterGo.humanGoCount).toBe(1);
    expect(afterGo.humanScoreAtLastGo).toBe(15);
    expect(afterGo.phase).toBe('playing');
  });

  it('스톱하면 단계별 최종 정산을 저장한다', () => {
    const game = createInitialGame(56);
    game.humanCaptured = ['m01-01', 'm03-01', 'm08-01', 'm11-01', 'm12-01'];
    game.computerCaptured = ['m02-01', 'm01-03', 'm01-04', 'm02-03', 'm02-04', 'm03-03', 'm03-04', 'm04-03'];
    game.phase = 'awaiting-go-stop';
    game.pendingDecision = 'human';
    game.pointValue = 10_000;
    game.mission = { kind: 'gakpae', cardIds: ['m01-01', 'm03-01', 'm08-01'] };
    const stopped = chooseStop(game, 'human');
    expect(stopped.phase).toBe('round-ended');
    expect(stopped.settlement?.steps).toHaveLength(6);
    expect(stopped.settlement?.isRealCurrency).toBe(false);
    expect(stopped.settlement?.pointValue).toBe(10_000);
    expect(stopped.settlement?.missionMultiplier).toBe(8);
  });

  it('획득한 국진을 열끗 또는 쌍피로 바꿀 수 있다', () => {
    const game = createInitialGame(57);
    game.humanCaptured = ['m09-01'];
    const doubleJunk = setGookjinChoice(game, 'human', true);
    expect(doubleJunk.humanGookjinAsDoubleJunk).toBe(true);
    expect(doubleJunk.lastAction).toContain('피 묶음으로 옮겼습니다');
    expect(setGookjinChoice(doubleJunk, 'human', false).lastAction).toContain('열끗 묶음으로 옮겼습니다');
  });

  it('국진 선택으로 점수가 부족해지면 고·스톱 선택을 취소하고 다음 차례로 진행한다', () => {
    const game = createInitialGame(29);
    game.humanCaptured = ['m09-01'];
    game.phase = 'awaiting-go-stop';
    game.pendingDecision = 'human';
    game.currentPlayer = 'computer';
    game.humanScoreAtLastGo = 6;
    const next = setGookjinChoice(game, 'human', true);
    expect(next.phase).toBe('playing');
    expect(next.pendingDecision).toBeNull();
    expect(next.currentPlayer).toBe('computer');
  });

  it('마지막 패에서 국진을 쌍피로 선택해 7점이 되면 최종 정산을 다시 계산한다', () => {
    const game = createInitialGame(31);
    game.humanHand = [];
    game.computerHand = [];
    game.drawPile = [];
    game.humanCaptured = [
      'm01-01', 'm03-01', 'm08-01',
      'm01-02', 'm02-02', 'm03-02',
      'm01-03', 'm01-04', 'm02-03', 'm02-04', 'm03-03', 'm03-04', 'm04-03', 'm04-04',
      'm09-01'
    ];
    game.phase = 'round-ended';
    game.roundResult = 'nagari';
    game.lastAction = '모든 패를 냈지만 7점에 도달하지 못해 나가리입니다.';
    const next = setGookjinChoice(game, 'human', true);
    expect(next.winner).toBe('human');
    expect(next.roundResult).toBe('win');
    expect(next.settlement?.finalScore).toBeGreaterThanOrEqual(7);
  });

  it('바닥에 같은 월 패가 두 장이면 지정한 패를 선택해 먹는다', () => {
    const game = createInitialGame(58);
    const fixed = ['m01-01', 'm01-02', 'm01-03', 'm02-01'];
    const remaining = createMatgoDeck().filter(id => !fixed.includes(id));
    game.humanHand = [fixed[0], ...remaining.splice(0, 9)];
    game.computerHand = remaining.splice(0, 10);
    game.floorCards = [fixed[1], fixed[2], ...remaining.splice(0, 6)];
    game.drawPile = [fixed[3], ...remaining];
    game.phase = 'playing'; game.currentPlayer = 'human'; game.humanCaptured = []; game.computerCaptured = [];
    expect(getMatchingFloorCards(game.floorCards, fixed[0])).toEqual([fixed[1], fixed[2]]);
    const result = playTurn(game, 'human', fixed[0], { playedMatchId: fixed[2] }).state;
    expect(result.humanCaptured).toContain(fixed[2]);
    expect(result.floorCards).toContain(fixed[1]);
  });

  it('뒤집은 패와 같은 월의 바닥패가 두 장이어도 먹을 패를 지정한다', () => {
    const game = createInitialGame(581);
    const fixed = ['m01-01', 'm02-01', 'm02-02', 'bonus-double-pee-1', 'm02-03'];
    const remaining = createMatgoDeck().filter(id => !fixed.includes(id));
    game.humanHand = [fixed[0], ...remaining.splice(0, 9)];
    game.computerHand = remaining.splice(0, 10);
    game.floorCards = [fixed[1], fixed[2], ...remaining.splice(0, 6)];
    game.drawPile = [fixed[3], fixed[4], ...remaining];
    game.phase = 'playing'; game.currentPlayer = 'human'; game.humanCaptured = []; game.computerCaptured = [];

    expect(getDrawFloorChoice(game, fixed[0])).toEqual({ drawnCardId: fixed[4], candidateIds: [fixed[1], fixed[2]] });
    const result = playTurn(game, 'human', fixed[0], { drawnMatchId: fixed[2] }).state;
    expect(result.humanCaptured).toContain(fixed[2]);
    expect(result.floorCards).toContain(fixed[1]);
    expect(result.humanCaptured).toContain(fixed[3]);
    expect(isValidGameState(result)).toBe(true);
  });

  it('두장폭탄으로 손패 두 장과 바닥 두 장을 한 번에 먹는다', () => {
    const game = createInitialGame(59);
    const fixed = ['m01-01', 'm01-02', 'm01-03', 'm01-04', 'm02-03'];
    const remaining = createMatgoDeck().filter(id => !fixed.includes(id));
    game.humanHand = [fixed[0], fixed[1], ...remaining.splice(0, 8)];
    game.computerHand = remaining.splice(0, 10);
    game.floorCards = [fixed[2], fixed[3], ...remaining.splice(0, 6)];
    game.drawPile = remaining;
    game.phase = 'playing'; game.currentPlayer = 'human'; game.humanCaptured = []; game.computerCaptured = [fixed[4]];
    const bombResult = playBomb(game, 'human', 1);
    const result = bombResult.state;
    expect(result.humanCaptured).toEqual(expect.arrayContaining(fixed));
    expect(result.humanHand).not.toEqual(expect.arrayContaining(fixed.slice(0, 2)));
    expect(result.humanBombSkips).toBe(1);
    expect(result.humanShakeCount).toBe(1);
    expect(result.humanBombCount).toBe(1);
    expect(bombResult.specialEvents).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'bomb', stolenPee: [fixed[4]] })]));
    result.currentPlayer = 'human';
    const flipped = playFlipOnlyTurn(result, 'human');
    expect(flipped.playedCardId).toBeNull();
    expect(flipped.state.humanBombSkips).toBe(0);
  });

  it('상대가 직전 차례에 버린 패를 폭탄으로 먹으면 핵폭탄으로 피 두 장을 가져온다', () => {
    const game = createArrangedGame({
      humanHand: ['m01-01', 'm01-02', 'm01-03'],
      floorCards: ['m01-04'],
      drawFirst: ['m12-04'],
      computerCaptured: ['m02-03', 'm03-03']
    });
    game.lastDiscardedCardId = 'm01-04';
    game.lastDiscardedBy = 'computer';
    const result = playBomb(game, 'human', 1);
    expect(result.specialEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'bomb', label: '핵폭탄', stolenPee: ['m02-03', 'm03-03'] })
    ]));
  });

  it('같은 월 4장을 한꺼번에 내면 흔들기와 폭탄을 합쳐 4배와 빈 차례 3회를 저장한다', () => {
    const game = createArrangedGame({
      humanHand: ['m01-01', 'm01-02', 'm01-03', 'm01-04'],
      floorCards: [],
      drawFirst: ['m12-04'],
      computerCaptured: ['m02-03']
    });
    const result = playBomb(game, 'human', 1);
    expect(result.state.humanShakeCount).toBe(2);
    expect(result.state.humanBombCount).toBe(1);
    expect(result.state.humanBombSkips).toBe(3);
    expect(result.specialEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'bomb', label: '4장 흔들기·폭탄' })
    ]));
  });

  it('폭탄 빈 차례에 뒤집은 패와 맞는 바닥패가 두 장이면 선택한 패를 먹는다', () => {
    const game = createInitialGame(60);
    const fixed = ['m02-01', 'm02-02', 'm02-03'];
    const remaining = createMatgoDeck().filter(id => !fixed.includes(id));
    game.humanHand = remaining.splice(0, 8);
    game.computerHand = remaining.splice(0, 10);
    game.floorCards = [fixed[0], fixed[1], ...remaining.splice(0, 6)];
    game.drawPile = [fixed[2], ...remaining];
    game.humanCaptured = [];
    game.computerCaptured = [];
    game.humanBombSkips = 1;
    game.phase = 'playing';
    game.currentPlayer = 'human';

    const savedForLater = playTurn(game, 'human', game.humanHand[0]).state;
    expect(savedForLater.humanBombSkips).toBe(1);
    expect(getFlipOnlyDrawChoice(game)).toEqual({ drawnCardId: fixed[2], candidateIds: [fixed[0], fixed[1]] });
    const flipped = playFlipOnlyTurn(game, 'human', fixed[1]);
    expect(flipped.state.humanCaptured).toEqual(expect.arrayContaining([fixed[1], fixed[2]]));
    expect(flipped.state.floorCards).toContain(fixed[0]);
    expect(flipped.state.humanBombSkips).toBe(0);
  });

  it('같은 월 세 장은 흔든 뒤 그 세 장 중 한 장을 내고 배수를 보존한다', () => {
    const game = createInitialGame(61);
    const fixed = ['m02-01', 'm02-02', 'm02-03', 'm02-04'];
    const remaining = createMatgoDeck().filter(id => !fixed.includes(id));
    game.humanHand = [fixed[0], fixed[1], fixed[2], ...remaining.splice(0, 7)];
    game.computerHand = remaining.splice(0, 10);
    game.floorCards = remaining.splice(0, 8);
    game.drawPile = [fixed[3], ...remaining];
    game.humanCaptured = []; game.computerCaptured = [];
    game.phase = 'playing'; game.currentPlayer = 'human'; game.turnNumber = 0;

    const shaken = declareShake(game, 'human', 2);
    expect(shaken.humanShakeCount).toBe(1);
    expect(shaken.humanPendingShakeMonth).toBe(2);
    expect(shaken.lastAction).toContain('2월 세 장을 흔들었습니다');
    expect(() => declareShake(shaken, 'human', 2)).toThrow('이미 흔들기');
    expect(() => playTurn(shaken, 'human', shaken.humanHand[3])).toThrow('2월 흔들기 패');

    const played = playTurn(shaken, 'human', fixed[0]).state;
    expect(played.humanPendingShakeMonth).toBeNull();
    expect(played.humanShakeCount).toBe(1);
    expect(isValidGameState(played)).toBe(true);
  });

  it('한쪽 총통은 계속 진행하거나 기본 7점으로 끝낼 수 있다', () => {
    const game = createInitialGame(60);
    game.phase = 'awaiting-chongtong'; game.pendingDecision = 'human'; game.chongtongOwner = 'human'; game.chongtongMonth = 1;
    const continued = chooseChongtong(game, 'human', 'continue');
    const stopped = chooseChongtong(game, 'human', 'stop');
    expect(continued.phase).toBe('playing');
    expect(continued.canBombAfterChongtong).toBe(true);
    expect(stopped.settlement?.finalScore).toBe(7);
    expect(stopped.settlement?.bakMultiplier).toBe(1);
  });
});
