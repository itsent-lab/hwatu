import { describe, expect, it } from 'vitest';
import { settleGostopBalances } from '../games/gostop/money';

describe('고스톱 게임머니 정산', () => {
  it('내가 이기면 두 컴퓨터에게서 각각 정산받는다', () => {
    expect(settleGostopBalances({ human: 500_000, computerA: 500_000, computerB: 500_000 }, 'human', 10_000)).toEqual({
      human: 520_000,
      computerA: 490_000,
      computerB: 490_000
    });
  });

  it('컴퓨터가 이기면 나와 다른 컴퓨터에게서 각각 정산받는다', () => {
    expect(settleGostopBalances({ human: 500_000, computerA: 500_000, computerB: 500_000 }, 'computerA', 20_000)).toEqual({
      human: 480_000,
      computerA: 540_000,
      computerB: 480_000
    });
  });

  it('패자의 보유 금액보다 많이 가져가지 않고 0냥이 된 컴퓨터만 자동 리필한다', () => {
    expect(settleGostopBalances({ human: 5_000, computerA: 500_000, computerB: 3_000 }, 'computerA', 20_000)).toEqual({
      human: 0,
      computerA: 508_000,
      computerB: 500_000
    });
  });

  it('컴퓨터에게 1냥이라도 남아 있으면 자동 리필하지 않는다', () => {
    expect(settleGostopBalances({ human: 10_000, computerA: 20_000, computerB: 10_001 }, 'human', 10_000)).toEqual({
      human: 30_000,
      computerA: 10_000,
      computerB: 1
    });
  });
});
