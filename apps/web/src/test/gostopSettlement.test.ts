import { describe, expect, it } from 'vitest';
import type { CapturedScore } from '../engine/rules/types';
import {
  addGostopReward,
  calculateGostopSettlement,
  emptyGostopPointDeltas,
  type GostopSettlementPlayer,
  type GostopSettlementPlayerState
} from '../games/gostop/settlement';

function score(overrides: Partial<CapturedScore> = {}): CapturedScore {
  return {
    total: 3,
    brightCount: 0,
    animalCount: 0,
    ribbonCount: 0,
    junkCount: 0,
    hasRainBright: false,
    gookjinAsDoubleJunk: false,
    lines: [],
    ...overrides
  };
}

function playerState(overrides: Partial<GostopSettlementPlayerState> = {}): GostopSettlementPlayerState {
  return {
    score: score(),
    goCount: 0,
    scoreAtLastGo: 0,
    shakeCount: 0,
    bombCount: 0,
    ...overrides
  };
}

function players(overrides: Partial<Record<GostopSettlementPlayer, GostopSettlementPlayerState>> = {}) {
  return {
    human: playerState(),
    computerA: playerState(),
    computerB: playerState(),
    ...overrides
  };
}

describe('한게임식 3인 고스톱 정산', () => {
  it('3고·흔들기·폭탄·멍따·나가리 배수를 순서대로 적용한다', () => {
    const result = calculateGostopSettlement({
      winner: 'human',
      players: players({ human: playerState({
        score: score({ total: 4, animalCount: 7 }),
        goCount: 3,
        shakeCount: 1,
        bombCount: 1
      }) }),
      lastGoPlayer: 'human',
      roundMultiplier: 2,
      interimPointDeltas: emptyGostopPointDeltas()
    });

    expect(result.goMultiplier).toBe(2);
    expect(result.shakeBombMultiplier).toBe(4);
    expect(result.meongttaMultiplier).toBe(2);
    expect(result.commonScore).toBe((4 + 3) * 2 * 4 * 2 * 2);
  });

  it('피박과 광박을 패자마다 따로 계산한다', () => {
    const result = calculateGostopSettlement({
      winner: 'human',
      players: players({
        human: playerState({ score: score({ total: 5, brightCount: 3, junkCount: 10 }) }),
        computerA: playerState({ score: score({ brightCount: 0, junkCount: 5 }) }),
        computerB: playerState({ score: score({ brightCount: 1, junkCount: 6 }) })
      }),
      lastGoPlayer: null,
      roundMultiplier: 1,
      interimPointDeltas: emptyGostopPointDeltas()
    });

    expect(result.loserPayments).toEqual([
      { loser: 'computerA', payer: 'computerA', points: 20, baks: ['pi-bak', 'gwang-bak'] },
      { loser: 'computerB', payer: 'computerB', points: 5, baks: [] }
    ]);
    expect(result.pointDeltas).toEqual({ human: 25, computerA: -20, computerB: -5 });
  });

  it('독박 플레이어가 두 패자의 몫을 모두 부담한다', () => {
    const result = calculateGostopSettlement({
      winner: 'human',
      players: players({ computerA: playerState({ goCount: 1, scoreAtLastGo: 3, score: score({ total: 3 }) }) }),
      lastGoPlayer: 'computerA',
      roundMultiplier: 1,
      interimPointDeltas: emptyGostopPointDeltas()
    });

    expect(result.dokbakPlayer).toBe('computerA');
    expect(result.pointDeltas).toEqual({ human: 6, computerA: -6, computerB: 0 });
  });

  it('첫뻑 같은 즉시 보상을 최종 정산에 합산한다', () => {
    const interim = addGostopReward(emptyGostopPointDeltas(), 'computerB', 3);
    const result = calculateGostopSettlement({
      winner: 'human',
      players: players(),
      lastGoPlayer: null,
      roundMultiplier: 1,
      interimPointDeltas: interim
    });

    expect(interim).toEqual({ human: -3, computerA: -3, computerB: 6 });
    expect(result.pointDeltas).toEqual({ human: 3, computerA: -6, computerB: 3 });
  });
});
