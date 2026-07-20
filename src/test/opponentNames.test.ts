import { describe, expect, it } from 'vitest';
import { createInitialGame } from '../engine/gameState';
import { opponentNameForGame } from '../lib/opponentNames';

describe('컴퓨터 상대 이름', () => {
  it('같은 판에서는 항상 같은 한국인 이름을 사용한다', () => {
    const gameUuid = '44b5331b-f506-4a21-9f04-1666ab76387b';
    expect(opponentNameForGame(gameUuid)).toBe(opponentNameForGame(gameUuid));
    expect(opponentNameForGame(gameUuid)).toMatch(/^[가-힣]{3}$/);
  });

  it('여러 판에서 다양한 이름을 고른다', () => {
    const names = new Set(Array.from({ length: 30 }, (_, index) => opponentNameForGame(`44b5331b-f506-4a21-9f04-${String(index).padStart(12, '0')}`)));
    expect(names.size).toBeGreaterThan(10);
  });

  it('AI 판단용 난수값이 달라져도 판 고유번호가 같으면 이름이 유지된다', () => {
    const game = createInitialGame(20260719);
    const beforeMove = opponentNameForGame(game.gameUuid);
    game.randomSeed = 13579;
    const afterMove = opponentNameForGame(game.gameUuid);
    expect(afterMove).toBe(beforeMove);
  });
});
