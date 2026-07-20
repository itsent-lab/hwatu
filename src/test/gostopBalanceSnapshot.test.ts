import { beforeEach, describe, expect, it } from 'vitest';
import { loadGostopBalanceSnapshot, saveGostopBalanceSnapshot } from '../games/gostop/balanceSnapshot';

const memory = new Map<string, string>();

describe('고스톱 게임머니 기기 보관', () => {
  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => memory.set(key, value)
      }
    });
  });

  it('정산 직후 세 사람의 게임머니를 사용자별로 보관한다', () => {
    saveGostopBalanceSnapshot(7, { human: 470_000, computerA: 482_000, computerB: 548_000 });

    expect(loadGostopBalanceSnapshot(7)).toEqual({ human: 470_000, computerA: 482_000, computerB: 548_000 });
    expect(loadGostopBalanceSnapshot(8)).toBeNull();
  });

  it('음수이거나 올바르지 않은 게임머니는 복원하지 않는다', () => {
    memory.set('hwatu-gostop-balance-snapshot:7', JSON.stringify({ human: 1, computerA: -1, computerB: 2 }));

    expect(loadGostopBalanceSnapshot(7)).toBeNull();
  });
});
