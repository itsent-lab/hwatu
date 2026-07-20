import { describe, expect, it } from 'vitest';
import { chooseAiFloorMatch } from '../engine/ai/evaluator';
import { AI_DIFFICULTIES } from '../engine/ai/settings';
import { chooseAiGoStop, chooseAiGookjinAsDoubleJunk, chooseAiMove } from '../engine/ai/strategy';
import { createMatgoDeck } from '../engine/deck';
import { createInitialGame } from '../engine/gameState';

describe('규칙 기반 AI 수 선택', () => {
  it('두 장 중 먹을 패는 점수 가치가 높은 패를 자동으로 고른다', () => {
    expect(chooseAiFloorMatch(['m01-03', 'm01-01'], [])).toBe('m01-01');
  });

  it('어려움은 평가 점수가 가장 높은 수를 항상 고른다', () => {
    const game = createInitialGame(301, 'hard');
    game.currentPlayer = 'computer';
    const choice = chooseAiMove(game, 'computer', 'hard');
    expect(choice.selectedOptimal).toBe(true);
    expect(choice.move).toEqual(choice.evaluations[0].move);
    expect(choice.evaluations[0]).toEqual(expect.objectContaining({
      immediateValue: expect.any(Number), opponentRisk: expect.any(Number), combinationValue: expect.any(Number)
    }));
  });

  it('초고수는 위험도와 족보 가능성을 다시 계산한 최적수를 항상 고른다', () => {
    const game = createInitialGame(304, 'expert');
    game.currentPlayer = 'computer';
    const choice = chooseAiMove(game, 'computer', 'expert');
    expect(choice.selectedOptimal).toBe(true);
    expect(choice.move).toEqual(choice.evaluations[0].move);
    expect(choice.difficulty).toBe('expert');
  });

  it('쉬움과 보통은 지정된 비율로 최적수를 선택한다', () => {
    const counts = { easy: 0, normal: 0 };
    for (let index = 0; index < 2_000; index += 1) {
      for (const difficulty of ['easy', 'normal'] as const) {
        const game = createInitialGame(1_000 + index, difficulty);
        game.currentPlayer = 'computer';
        if (chooseAiMove(game, 'computer', difficulty).selectedOptimal) counts[difficulty] += 1;
      }
    }
    expect(counts.easy / 2_000).toBeGreaterThan(AI_DIFFICULTIES.easy.optimalMoveProbability - 0.03);
    expect(counts.easy / 2_000).toBeLessThan(AI_DIFFICULTIES.easy.optimalMoveProbability + 0.03);
    expect(counts.normal / 2_000).toBeGreaterThan(AI_DIFFICULTIES.normal.optimalMoveProbability - 0.03);
    expect(counts.normal / 2_000).toBeLessThan(AI_DIFFICULTIES.normal.optimalMoveProbability + 0.03);
  });

  it('폭탄을 일반 패와 함께 비교해 더 가치가 높으면 선택한다', () => {
    const game = createInitialGame(302, 'hard');
    const fixed = ['m01-01', 'm01-02', 'm01-03', 'm01-04'];
    const remaining = createMatgoDeck().filter(id => !fixed.includes(id));
    game.computerHand = [fixed[0], fixed[1], ...remaining.splice(0, 8)];
    game.humanHand = remaining.splice(0, 10);
    game.floorCards = [fixed[2], fixed[3], ...remaining.splice(0, 6)];
    game.drawPile = remaining;
    game.currentPlayer = 'computer'; game.phase = 'playing';
    const choice = chooseAiMove(game, 'computer', 'hard');
    expect(choice.evaluations.some(evaluation => evaluation.move.kind === 'bomb')).toBe(true);
    expect(choice.move).toEqual({ kind: 'bomb', month: 1 });
  });

  it('같은 월 세 장에 맞는 바닥패가 없으면 흔들기를 수 후보에 넣는다', () => {
    const game = createInitialGame(303, 'hard');
    const fixed = ['m04-01', 'm04-02', 'm04-03', 'm04-04'];
    const remaining = createMatgoDeck().filter(id => !fixed.includes(id));
    game.computerHand = [fixed[0], fixed[1], fixed[2], ...remaining.splice(0, 7)];
    game.humanHand = remaining.splice(0, 10);
    game.floorCards = remaining.splice(0, 8);
    game.drawPile = [fixed[3], ...remaining];
    game.currentPlayer = 'computer'; game.phase = 'playing';
    const choice = chooseAiMove(game, 'computer', 'hard');
    expect(choice.evaluations.some(evaluation => evaluation.move.kind === 'shake')).toBe(true);
    expect(choice.move).toEqual({ kind: 'shake', month: 4 });
  });

  it('쉬움은 진행할 패가 있을 때 약 80% 확률로 스톱한다', () => {
    let stops = 0;
    for (let index = 0; index < 2_000; index += 1) {
      const game = createInitialGame(5_000 + index, 'easy');
      if (chooseAiGoStop(game, 'computer', 'easy') === 'stop') stops += 1;
    }
    expect(stops / 2_000).toBeGreaterThan(0.77);
    expect(stops / 2_000).toBeLessThan(0.83);
  });

  it('자동 치기는 국진을 현재 점수가 더 높은 위치로 옮긴다', () => {
    expect(chooseAiGookjinAsDoubleJunk([
      'm09-01', 'm01-04', 'm02-04', 'm03-04', 'm04-04', 'm05-04', 'm06-04', 'm07-04', 'm08-04'
    ])).toBe(true);
    expect(chooseAiGookjinAsDoubleJunk(['m09-01', 'm02-01', 'm04-01', 'm06-01', 'm07-01'])).toBe(false);
  });
});
