import { describe, expect, it } from 'vitest';
import { createInitialGame } from '../engine/gameState';
import { getScoreCelebration, getScoreHeadline, getSettlementCelebration } from '../lib/scoreEffects';

describe('기본 점수 족보 선언', () => {
  it('비광을 포함한 세 번째 광을 먹으면 비삼광과 현재 점수를 선언한다', () => {
    const before = createInitialGame(20260719);
    before.humanCaptured = ['m01-01', 'm03-01'];
    const after = structuredClone(before);
    after.humanCaptured.push('m12-01');

    expect(getScoreCelebration(before, after, 'human')).toEqual({ score: 2, label: '비삼광', points: 2 });
  });

  it('열끗과 피의 추가 점수도 늘어난 순간에만 선언한다', () => {
    const before = createInitialGame(20260720);
    before.humanCaptured = ['m02-01', 'm04-01', 'm05-01', 'm06-01', 'm07-01'];
    const after = structuredClone(before);
    after.humanCaptured.push('m08-02');

    expect(getScoreCelebration(before, after, 'human')).toEqual({ score: 7, label: '고도리', points: 5 });
    expect(getScoreCelebration(after, after, 'human')).toBeNull();
  });

  it('고 선언에는 일반 피보다 대표 족보를 우선해서 보여준다', () => {
    const game = createInitialGame(20260721);
    game.humanCaptured = [
      'm01-01', 'm03-01', 'm08-01',
      'm01-03', 'm01-04', 'm02-03', 'm02-04', 'm03-03', 'm03-04',
      'm04-03', 'm04-04', 'm05-03', 'm05-04', 'm06-03', 'm06-04'
    ];

    expect(getScoreHeadline(game, 'human')?.label).toBe('삼광');
  });

  it('스톱 선언에서 대표 족보와 피박 배수, 최종 점수를 함께 보여준다', () => {
    const game = createInitialGame(20260722);
    game.humanCaptured = ['m02-01', 'm04-01', 'm08-02'];
    game.settlement = {
      baseScore: 5, goBonus: 0, goMultiplier: 1, shakeMultiplier: 1, missionMultiplier: 1,
      baks: [{ code: 'pi-bak', label: '피박', multiplier: 2 }], bakMultiplier: 2,
      finalScore: 10, pointValue: 100, displayAmount: 1000, isRealCurrency: false, isExchangeable: false, steps: []
    };

    expect(getSettlementCelebration(game, 'human')).toEqual({
      text: '피박 ×2!',
      detail: '고도리 +5점 · 기본 5점 → 최종 10점'
    });
  });
});
