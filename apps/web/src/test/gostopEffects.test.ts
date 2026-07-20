import { describe, expect, it } from 'vitest';
import { getGostopTransitionEffect } from '../games/gostop/effects';
import { chooseGostopDecision, createGostopRoom, playGostopTurn } from '../games/gostop/gameState';

describe('고스톱 맞고식 화면 효과', () => {
  it('패를 먹으면 짝 효과를 만든다', () => {
    const before = createGostopRoom(31, 100);
    const after = structuredClone(before);
    after.players.human.captured.push('m01-02', 'm01-03');
    expect(getGostopTransitionEffect(before, after)).toMatchObject({ kind: 'capture', text: '짝!', player: 'human' });
  });

  it('새 족보 점수가 생기면 점수 효과를 우선한다', () => {
    const before = createGostopRoom(32, 100);
    const after = structuredClone(before);
    after.players.human.captured = ['m01-01', 'm03-01', 'm08-01'];
    expect(getGostopTransitionEffect(before, after)).toMatchObject({ kind: 'score', text: '삼광!', player: 'human' });
  });

  it('5고부터 축포용 긴 고 선언 효과를 만든다', () => {
    const before = createGostopRoom(33, 100);
    const after = structuredClone(before);
    after.players.computerA.goCount = 5;
    expect(getGostopTransitionEffect(before, after)).toMatchObject({ kind: 'go', text: '5고!', duration: 1800, player: 'computerA' });
  });

  it('보너스 삼피를 얻으면 쓰리피 카드 폭발 효과를 만든다', () => {
    const before = createGostopRoom(35, 100);
    before.players.human.captured = [];
    const after = structuredClone(before);
    after.players.human.captured.push('bonus-double-pee-1');
    expect(getGostopTransitionEffect(before, after)).toMatchObject({
      kind: 'triple-pee', text: '쓰리피!', player: 'human', peeBurstValue: 3
    });
  });

  it('싹쓸이는 점수 효과보다 먼저 큰 중앙 선언 효과로 표시한다', () => {
    const before = createGostopRoom(351, 100);
    before.players.human.hand = ['m01-01', 'm03-01'];
    before.players.computerA.captured = ['m03-03'];
    before.players.computerB.captured = ['m04-03'];
    before.floorCards = ['m01-02', 'm02-02'];
    before.drawPile = ['m02-01'];
    const after = playGostopTurn(before, 'human', 'm01-01').state;

    expect(getGostopTransitionEffect(before, after)).toMatchObject({
      kind: 'sweep', text: '싹쓸이!', player: 'human'
    });
  });

  it('스톱과 나가리를 각각 판 종료 효과로 구분한다', () => {
    const awaiting = createGostopRoom(34, 100);
    awaiting.players.human.captured = ['m01-01', 'm03-01', 'm08-01'];
    awaiting.phase = 'awaiting-go-stop';
    awaiting.pendingDecision = 'human';
    const stopped = chooseGostopDecision(awaiting, 'human', 'stop');
    expect(getGostopTransitionEffect(awaiting, stopped)).toMatchObject({ kind: 'stop', text: '스톱!', player: 'human' });

    const nagari = structuredClone(awaiting);
    nagari.phase = 'round-ended';
    nagari.pendingDecision = null;
    nagari.roundResult = 'nagari';
    expect(getGostopTransitionEffect(awaiting, nagari)).toMatchObject({ kind: 'settlement', text: '나가리!', player: null });
  });
});
