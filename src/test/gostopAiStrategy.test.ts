import { describe, expect, it } from 'vitest';
import { chooseGostopAiCard, chooseGostopAiDecision } from '../games/gostop/aiStrategy';
import { createGostopRoom } from '../games/gostop/gameState';

describe('고스톱 AI 난이도', () => {
  it('어려움은 단순 월 순서보다 완성되는 점수를 우선한다', () => {
    const room = createGostopRoom(77, 100);
    room.currentPlayer = 'computerA';
    room.players.computerA.hand = ['m01-01', 'm12-03'];
    room.players.computerA.captured = ['m03-01', 'm08-01'];
    room.floorCards = ['m01-03', 'm12-04'];

    expect(chooseGostopAiCard(room, 'computerA', 'normal')).toBe('m12-03');
    expect(chooseGostopAiCard(room, 'computerA', 'hard')).toBe('m01-01');
  });

  it('초고수는 상대가 이미 점수를 냈으면 무리한 고를 피한다', () => {
    const room = createGostopRoom(88, 100);
    room.phase = 'awaiting-go-stop';
    room.pendingDecision = 'computerA';
    room.currentPlayer = 'computerA';
    room.players.computerA.captured = ['m01-01', 'm03-01', 'm08-01'];
    room.players.human.captured = ['m01-02', 'm02-02', 'm03-02'];

    expect(chooseGostopAiDecision(room, 'computerA', 'normal')).toBe('go');
    expect(chooseGostopAiDecision(room, 'computerA', 'expert')).toBe('stop');
  });
});
