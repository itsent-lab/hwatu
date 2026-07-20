import { beforeEach, describe, expect, it } from 'vitest';
import {
  enqueuePendingGostopSettlement, loadPendingGostopSettlements, removePendingGostopSettlement
} from '../games/gostop/pendingSettlement';

const memory = new Map<string, string>();

describe('고스톱 미정산 판 보관', () => {
  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => memory.set(key, value),
        removeItem: (key: string) => memory.delete(key)
      }
    });
  });

  it('새로고침 전에 끝난 판을 사용자별로 보관한다', () => {
    enqueuePendingGostopSettlement(7, { gameUuid: crypto.randomUUID(), winner: 'computerA', finalScore: 8, pointValue: 100 });

    expect(loadPendingGostopSettlements(7)).toHaveLength(1);
    expect(loadPendingGostopSettlements(8)).toEqual([]);
  });

  it('같은 판은 중복 저장하지 않는다', () => {
    const request = { gameUuid: crypto.randomUUID(), winner: 'human' as const, finalScore: 5, pointValue: 1_000 };
    enqueuePendingGostopSettlement(7, request);
    enqueuePendingGostopSettlement(7, request);

    expect(loadPendingGostopSettlements(7)).toEqual([request]);
  });

  it('서버 정산이 끝난 판만 보관함에서 제거한다', () => {
    const first = { gameUuid: crypto.randomUUID(), winner: 'human' as const, finalScore: 5, pointValue: 100 };
    const second = { gameUuid: crypto.randomUUID(), winner: 'computerB' as const, finalScore: 7, pointValue: 100 };
    enqueuePendingGostopSettlement(7, first);
    enqueuePendingGostopSettlement(7, second);
    removePendingGostopSettlement(7, first.gameUuid);

    expect(loadPendingGostopSettlements(7)).toEqual([second]);
  });

  it('아이폰에서 기기 저장이 제한되어도 정산 흐름을 중단하지 않는다', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => { throw new Error('저장 공간 접근 제한'); },
        removeItem: () => { throw new Error('저장 공간 접근 제한'); }
      }
    });
    const request = { gameUuid: crypto.randomUUID(), winner: 'computerA' as const, finalScore: 5, pointValue: 100 };

    expect(() => enqueuePendingGostopSettlement(7, request)).not.toThrow();
    expect(() => removePendingGostopSettlement(7, request.gameUuid)).not.toThrow();
  });
});
