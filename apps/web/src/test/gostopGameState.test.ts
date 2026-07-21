import { describe, expect, it } from 'vitest';
import {
  chooseGostopAutomaticCard, chooseGostopAutomaticDecision, chooseGostopDecision, createGostopRoom, declareGostopShake,
  getGostopBombOption, getGostopFloorChoice, getGostopDrawFloorChoice, getGostopShakeOption, nextGostopRoundMultiplier,
  playGostopBomb, playGostopFlipOnlyTurn, playGostopTurn,
  scoreGostopPlayer, setGostopGookjinChoice
} from '../games/gostop/gameState';

describe('3인 고스톱 기본 진행', () => {
  it('보너스패 3장을 포함한 51장을 세 명의 손패와 바닥패, 더미로 나눈다', () => {
    const room = createGostopRoom(20260720, 1_000);
    expect(room.players.human.hand).toHaveLength(7);
    expect(room.players.computerA.hand).toHaveLength(7);
    expect(room.players.computerB.hand).toHaveLength(7);
    expect(room.floorCards).toHaveLength(6);
    expect(room.drawPile.length + room.players.human.captured.length).toBe(24);
    expect(new Set([
      ...room.players.human.hand, ...room.players.computerA.hand, ...room.players.computerB.hand,
      ...room.floorCards, ...room.drawPile, ...room.players.human.captured
    ])).toHaveLength(51);
    expect([...room.players.human.hand, ...room.players.computerA.hand, ...room.players.computerB.hand, ...room.drawPile, ...room.players.human.captured]
      .filter(cardId => cardId.startsWith('bonus-'))).toHaveLength(3);
  });

  it('로비에서 선택한 점당 금액을 유지한다', () => {
    expect(createGostopRoom(7, 5_000).pointValue).toBe(5_000);
  });

  it('연속 나가리로 이월된 배율을 스톱 점수와 정산 금액에 적용한다', () => {
    const room = createGostopRoom(8, 1_000, 4);
    room.players.human.captured = ['m01-01', 'm03-01', 'm08-01'];
    room.phase = 'awaiting-go-stop';
    room.pendingDecision = 'human';
    const stopped = chooseGostopDecision(room, 'human', 'stop');
    expect(stopped.roundMultiplier).toBe(4);
    expect(stopped.finalScore).toBe(scoreGostopPlayer(stopped, 'human').total * 4);
    expect(stopped.finalScore * stopped.pointValue).toBe(12_000);
  });

  it('같은 월의 바닥패를 먹고 더미에서 한 장을 뒤집는다', () => {
    const room = createGostopRoom(10, 100);
    room.players.human.hand = ['m01-01'];
    room.floorCards = ['m01-02', 'm03-01'];
    room.drawPile = ['m02-01'];
    const result = playGostopTurn(room, 'human', 'm01-01');
    expect(result.state.players.human.captured).toEqual(['m01-02', 'm01-01']);
    expect(result.state.floorCards).toContain('m02-01');
    expect(result.state.currentPlayer).toBe('computerA');
  });

  it('같은 월의 바닥패가 두 장이면 먹을 패를 고른다', () => {
    const room = createGostopRoom(11, 100);
    room.players.human.hand = ['m01-01'];
    room.floorCards = ['m01-02', 'm01-03'];
    expect(getGostopFloorChoice(room, 'human', 'm01-01')).toEqual(['m01-02', 'm01-03']);
    const result = playGostopTurn(room, 'human', 'm01-01', 'm01-03');
    expect(result.state.players.human.captured).toEqual(expect.arrayContaining(['m01-01', 'm01-03']));
    expect(result.state.floorCards).toContain('m01-02');
  });

  it('더미에서 뒤집은 패에 같은 월이 두 장이면 먹을 패를 고른다', () => {
    const room = createGostopRoom(13, 100);
    room.players.human.hand = ['m01-01'];
    room.floorCards = ['m02-02', 'm02-03'];
    room.drawPile = ['m02-01'];
    expect(getGostopDrawFloorChoice(room, 'human', 'm01-01')).toEqual({
      drawnCardId: 'm02-01',
      candidates: ['m02-02', 'm02-03']
    });
    const result = playGostopTurn(room, 'human', 'm01-01', undefined, 'm02-03');
    expect(result.state.players.human.captured).toEqual(expect.arrayContaining(['m02-01', 'm02-03']));
    expect(result.state.floorCards).toContain('m02-02');
  });

  it('손의 보너스패를 내면 두 상대의 피를 가져오고 새 패를 받아 같은 차례를 계속한다', () => {
    const room = createGostopRoom(14, 100);
    room.players.human.hand = ['bonus-pee-1', 'm03-01'];
    room.players.computerA.captured = ['m01-03'];
    room.players.computerB.captured = ['m02-03'];
    room.drawPile = ['m04-01'];
    const result = playGostopTurn(room, 'human', 'bonus-pee-1');
    expect(result.bonusCards).toEqual(['bonus-pee-1']);
    expect(result.stolenPee).toHaveLength(2);
    expect(result.replacementCardId).toBe('m04-01');
    expect(result.continuesTurn).toBe(true);
    expect(result.state.currentPlayer).toBe('human');
    expect(result.state.turnNumber).toBe(0);
    expect(result.state.players.human.hand).toEqual(expect.arrayContaining(['m03-01', 'm04-01']));
    expect(result.state.players.human.captured).toEqual(expect.arrayContaining(['bonus-pee-1', 'm01-03', 'm02-03']));
  });

  it('뒤집기에서 보너스패가 나오면 획득하고 일반 패가 나올 때까지 다시 뒤집는다', () => {
    const room = createGostopRoom(15, 100);
    room.players.human.hand = ['m01-01'];
    room.players.computerA.captured = ['m03-03'];
    room.players.computerB.captured = ['m04-03'];
    room.floorCards = ['m01-02'];
    room.drawPile = ['bonus-double-pee-1', 'm02-01'];
    const result = playGostopTurn(room, 'human', 'm01-01');
    expect(result.bonusCards).toEqual(['bonus-double-pee-1']);
    expect(result.stolenPee).toHaveLength(2);
    expect(result.drawnCardId).toBe('m02-01');
    expect(result.state.players.human.captured).toEqual(expect.arrayContaining(['bonus-double-pee-1', 'm03-03', 'm04-03']));
    expect(result.state.currentPlayer).toBe('computerA');
  });

  it('바닥패를 모두 먹는 싹쓸이는 두 상대에게서 피 한 장씩 가져온다', () => {
    const room = createGostopRoom(151, 100);
    room.players.human.hand = ['m01-01', 'm03-01'];
    room.players.computerA.captured = ['m03-03'];
    room.players.computerB.captured = ['m04-03'];
    room.floorCards = ['m01-02', 'm02-02'];
    room.drawPile = ['m02-01'];

    const result = playGostopTurn(room, 'human', 'm01-01');

    expect(result.state.floorCards).toHaveLength(0);
    expect(result.specialEvents).toEqual([expect.objectContaining({ kind: 'sweep', stolenPee: ['m03-03', 'm04-03'] })]);
    expect(result.state.players.human.captured).toEqual(expect.arrayContaining(['m03-03', 'm04-03']));
    expect(result.state.players.computerA.captured).not.toContain('m03-03');
    expect(result.state.players.computerB.captured).not.toContain('m04-03');
    expect(result.state.lastAction).toContain('싹쓸이');
  });

  it('컴퓨터가 싹쓸이하면 나와 다른 컴퓨터에게서 피 한 장씩 가져온다', () => {
    const room = createGostopRoom(152, 100);
    room.currentPlayer = 'computerA';
    room.players.computerA.hand = ['m01-01', 'm03-01'];
    room.players.human.captured = ['m03-03'];
    room.players.computerB.captured = ['m04-03'];
    room.floorCards = ['m01-02', 'm02-02'];
    room.drawPile = ['m02-01'];

    const result = playGostopTurn(room, 'computerA', 'm01-01');

    expect(result.specialEvents[0]).toMatchObject({ kind: 'sweep', stolenPee: ['m03-03', 'm04-03'] });
    expect(result.state.players.computerA.captured).toEqual(expect.arrayContaining(['m03-03', 'm04-03']));
    expect(result.state.players.human.captured).not.toContain('m03-03');
    expect(result.state.players.computerB.captured).not.toContain('m04-03');
  });

  it('뻑으로 싸인 세 장을 추적하고 나중에 먹으면 두 상대의 피를 가져온다', () => {
    const room = createGostopRoom(153, 100);
    room.players.human.hand = ['m01-01', 'm03-01'];
    room.floorCards = ['m01-02', 'm04-01'];
    room.drawPile = ['m01-03'];

    const ppeok = playGostopTurn(room, 'human', 'm01-01');
    expect(ppeok.specialEvents).toEqual([expect.objectContaining({ kind: 'ppeok' })]);
    expect(ppeok.state.ppeokPiles).toEqual([expect.objectContaining({ month: 1, owner: 'human' })]);

    const captureRoom = structuredClone(ppeok.state);
    captureRoom.currentPlayer = 'computerA';
    captureRoom.players.computerA.hand = ['m01-04', 'm05-01'];
    captureRoom.players.human.captured = ['m05-03'];
    captureRoom.players.computerB.captured = ['m06-03'];
    captureRoom.drawPile = ['m02-01'];
    const captured = playGostopTurn(captureRoom, 'computerA', 'm01-04');

    expect(captured.specialEvents).toEqual([expect.objectContaining({ kind: 'ppeok-capture', stolenPee: ['m05-03', 'm06-03'] })]);
    expect(captured.state.ppeokPiles).toHaveLength(0);
    expect(captured.state.players.computerA.captured).toEqual(expect.arrayContaining(['m05-03', 'm06-03']));
    expect(captured.state.lastAction).toContain('싼 패 먹기');
  });

  it('3점부터 고를 선언하거나 스톱해 판을 끝낸다', () => {
    const room = createGostopRoom(12, 1_000);
    room.players.human.captured = ['m01-01', 'm03-01', 'm08-01'];
    room.players.human.hand = ['m02-01'];
    room.floorCards = [];
    room.drawPile = ['m04-01'];
    const awaiting = playGostopTurn(room, 'human', 'm02-01').state;
    expect(scoreGostopPlayer(awaiting, 'human').total).toBeGreaterThanOrEqual(3);
    expect(awaiting.phase).toBe('awaiting-go-stop');
    const continued = chooseGostopDecision(awaiting, 'human', 'go');
    expect(continued.players.human.goCount).toBe(1);
    expect(continued.currentPlayer).toBe('computerA');

    const stopState = structuredClone(awaiting);
    const stopped = chooseGostopDecision(stopState, 'human', 'stop');
    expect(stopped.phase).toBe('round-ended');
    expect(stopped.winner).toBe('human');
    expect(stopped.finalScore).toBeGreaterThanOrEqual(3);
  });

  it('획득한 국진을 열끗 또는 쌍피로 전환해 점수에 반영한다', () => {
    const room = createGostopRoom(91, 100);
    room.players.human.captured = [
      'm09-01',
      'm01-03', 'm01-04', 'm02-03', 'm02-04',
      'm03-03', 'm03-04', 'm04-03', 'm04-04'
    ];

    expect(scoreGostopPlayer(room, 'human').junkCount).toBe(8);
    const converted = setGostopGookjinChoice(room, 'human', true);
    expect(converted.players.human.gookjinAsDoubleJunk).toBe(true);
    expect(scoreGostopPlayer(converted, 'human').junkCount).toBe(10);
    expect(scoreGostopPlayer(converted, 'human').total).toBe(1);
    expect(converted.lastAction).toContain('국진을 쌍피로');
    expect(setGostopGookjinChoice(converted, 'human', false).players.human.gookjinAsDoubleJunk).toBe(false);
  });

  it('모든 플레이어가 순서대로 패를 내면 판이 정상적으로 종료된다', () => {
    let room = createGostopRoom(20260720, 100);
    let safety = 0;
    while (room.phase !== 'round-ended' && safety < 40) {
      if (room.phase === 'awaiting-go-stop') room = chooseGostopDecision(room, room.pendingDecision!, 'stop');
      else room = playGostopTurn(room, room.currentPlayer, room.players[room.currentPlayer].hand[0]).state;
      safety += 1;
    }
    expect(room.phase).toBe('round-ended');
    expect(safety).toBeLessThanOrEqual(30);
  });

  it('자동치기는 세 명의 패와 고스톱을 선택해 판을 완료한다', () => {
    let room = createGostopRoom(20260721, 2_000);
    let safety = 0;
    while (room.phase !== 'round-ended' && safety < 50) {
      const player = room.pendingDecision ?? room.currentPlayer;
      if (room.phase === 'awaiting-go-stop') room = chooseGostopDecision(room, player, chooseGostopAutomaticDecision(room, player));
      else {
        const cardId = chooseGostopAutomaticCard(room, player)!;
        const playedMatchId = getGostopFloorChoice(room, player, cardId)[0];
        const drawnMatchId = getGostopDrawFloorChoice(room, player, cardId, playedMatchId)?.candidates[0];
        room = playGostopTurn(room, player, cardId, playedMatchId, drawnMatchId).state;
      }
      safety += 1;
    }
    expect(room.phase).toBe('round-ended');
    expect(safety).toBeLessThan(50);
  });

  it('직전 고 이후 점수가 오르지 않은 채 마지막 패가 끝나면 나가리다', () => {
    const room = createGostopRoom(301, 100);
    room.phase = 'playing';
    room.currentPlayer = 'computerB';
    room.players.human.hand = [];
    room.players.computerA.hand = [];
    room.players.computerB.hand = ['m01-03'];
    room.players.computerB.captured = ['m01-01', 'm03-01', 'm08-01'];
    room.players.computerB.goCount = 1;
    room.players.computerB.scoreAtLastGo = 3;
    room.floorCards = ['m02-01'];
    room.drawPile = ['m04-01'];

    const result = playGostopTurn(room, 'computerB', 'm01-03').state;
    expect(result.roundResult).toBe('nagari');
    expect(result.winner).toBeNull();
  });

  it('세 번째 뻑은 3점으로 즉시 승리한다', () => {
    const room = createGostopRoom(302, 100);
    room.phase = 'playing';
    room.players.human.ppeokCount = 2;
    room.players.human.hand = ['m01-01', 'm02-01'];
    room.floorCards = ['m01-02', 'm04-01'];
    room.drawPile = ['m01-03'];

    const result = playGostopTurn(room, 'human', 'm01-01').state;
    expect(result.roundResult).toBe('win');
    expect(result.winner).toBe('human');
    expect(result.finalScore).toBe(3);
  });

  it('연속 다섯 차례 아무 패도 먹지 못하면 허당 3점으로 승리한다', () => {
    const room = createGostopRoom(3021, 100);
    room.phase = 'playing';
    room.players.human.emptyCaptureStreak = 4;
    room.players.human.hand = ['m01-01', 'm02-01'];
    room.floorCards = ['m03-01'];
    room.drawPile = ['m04-01'];

    const result = playGostopTurn(room, 'human', 'm01-01').state;
    expect(result.roundResult).toBe('win');
    expect(result.winner).toBe('human');
    expect(result.finalScore).toBe(3);
  });

  it('쪽과 따닥은 두 상대에게서 피 한 장씩 가져온다', () => {
    const jjok = createGostopRoom(303, 100);
    jjok.phase = 'playing';
    jjok.players.human.hand = ['m01-01', 'm03-01'];
    jjok.players.computerA.captured = ['m03-03'];
    jjok.players.computerB.captured = ['m04-03'];
    jjok.floorCards = ['m02-01'];
    jjok.drawPile = ['m01-02'];
    const jjokResult = playGostopTurn(jjok, 'human', 'm01-01');
    expect(jjokResult.specialEvents).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'jjok' })]));
    expect(jjokResult.stolenPee).toEqual(expect.arrayContaining(['m03-03', 'm04-03']));

    const ttadak = createGostopRoom(304, 100);
    ttadak.phase = 'playing';
    ttadak.players.human.hand = ['m01-01', 'm03-01'];
    ttadak.players.computerA.captured = ['m03-03'];
    ttadak.players.computerB.captured = ['m04-03'];
    ttadak.floorCards = ['m01-02', 'm01-03', 'm02-01'];
    ttadak.drawPile = ['m01-04'];
    const ttadakResult = playGostopTurn(ttadak, 'human', 'm01-01', 'm01-02');
    expect(ttadakResult.specialEvents).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'ttadak' })]));
    expect(ttadakResult.state.interimPointDeltas).toEqual({ human: 6, computerA: -3, computerB: -3 });
  });

  it('뒤집은 보너스패 뒤에 뻑이 나면 보너스패도 뻑에 붙인다', () => {
    const room = createGostopRoom(305, 100);
    room.phase = 'playing';
    room.players.human.hand = ['m01-01', 'm03-01'];
    room.floorCards = ['m01-02', 'm04-01'];
    room.drawPile = ['bonus-pee-2', 'm01-03'];

    const result = playGostopTurn(room, 'human', 'm01-01');
    expect(result.state.ppeokPiles[0].cardIds).toContain('bonus-pee-2');
    expect(result.state.floorCards).toContain('bonus-pee-2');
    expect(result.state.players.human.captured).not.toContain('bonus-pee-2');
  });

  it('흔들기와 폭탄을 기록하고 폭탄 뒤 두 차례를 뒤집기 전용으로 남긴다', () => {
    const shakeRoom = createGostopRoom(306, 100);
    shakeRoom.phase = 'playing';
    shakeRoom.players.human.hand = ['m01-01', 'm01-02', 'm01-03', 'm02-01'];
    shakeRoom.floorCards = ['m03-01'];
    const shaken = declareGostopShake(shakeRoom, 'human', 1);
    expect(shaken.players.human.shakeCount).toBe(1);
    expect(shaken.players.human.pendingShakeMonth).toBe(1);

    const bombRoom = createGostopRoom(307, 100);
    bombRoom.phase = 'playing';
    bombRoom.players.human.hand = ['m01-01', 'm01-02', 'm01-03', 'm02-01'];
    bombRoom.floorCards = ['m01-04', 'm03-01'];
    bombRoom.drawPile = ['m04-01'];
    const bombed = playGostopBomb(bombRoom, 'human', 1).state;
    expect(bombed.players.human.bombCount).toBe(1);
    expect(bombed.players.human.flipOnlyTurns).toBe(2);
    expect(bombed.players.human.captured).toEqual(expect.arrayContaining(['m01-01', 'm01-02', 'm01-03', 'm01-04']));
  });

  it('나가리 다음 판은 연속 횟수와 관계없이 2배이고 직전 승자가 선이다', () => {
    expect(nextGostopRoundMultiplier('nagari')).toBe(2);
    expect(nextGostopRoundMultiplier('win')).toBe(1);
    expect(createGostopRoom(308, 100, 1, 'computerA').currentPlayer).toBe('computerA');
  });

  it('처음 받은 손패의 총통은 5점으로 즉시 승리한다', () => {
    let totalRoom = null as ReturnType<typeof createGostopRoom> | null;
    for (let seed = 1; seed <= 1_000 && !totalRoom; seed += 1) {
      const candidate = createGostopRoom(seed, 100);
      if (candidate.phase === 'round-ended') totalRoom = candidate;
    }
    expect(totalRoom).not.toBeNull();
    expect(totalRoom?.finalScore).toBe(5);
    expect(totalRoom?.settlement?.goMultiplier).toBe(1);
    expect(totalRoom?.settlement?.shakeBombMultiplier).toBe(1);
  });

  it('흔들기·폭탄·뒤집기 전용 차례를 포함한 자동 진행이 멈추지 않는다', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      let room = createGostopRoom(seed, 100);
      let safety = 0;
      while (room.phase !== 'round-ended' && safety < 80) {
        const player = room.pendingDecision ?? room.currentPlayer;
        if (room.phase === 'awaiting-go-stop') {
          room = chooseGostopDecision(room, player, chooseGostopAutomaticDecision(room, player));
        } else if (room.players[player].flipOnlyTurns > 0) {
          room = playGostopFlipOnlyTurn(room, player).state;
        } else {
          const cardId = chooseGostopAutomaticCard(room, player)!;
          const bomb = getGostopBombOption(room, player, cardId);
          if (bomb) room = playGostopBomb(room, player, bomb.month).state;
          else {
            const shake = getGostopShakeOption(room, player, cardId);
            if (shake) room = declareGostopShake(room, player, shake.month);
            room = playGostopTurn(room, player, cardId).state;
          }
        }
        safety += 1;
      }
      expect(room.phase, `seed ${seed}`).toBe('round-ended');
      expect(safety, `seed ${seed}`).toBeLessThan(80);
    }
  });
});
