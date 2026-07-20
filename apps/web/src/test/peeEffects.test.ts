import { describe, expect, it } from 'vitest';
import { describePeeTransfer, summarizePeeTransfer } from '../lib/peeEffects';

describe('쌍피 이동 안내', () => {
  it('쌍피 한 장을 실제 피 두 장 값으로 안내한다', () => {
    expect(summarizePeeTransfer(['m11-02'])).toEqual({
      cardCount: 1,
      totalValue: 2,
      strongestBurst: 2
    });
    expect(describePeeTransfer(['m11-02'], false)).toBe('상대 쌍피 1장(피 2장 값) 뺏기');
  });

  it('상대가 가져가면 내 패가 뺏긴 방향으로 안내한다', () => {
    expect(describePeeTransfer(['bonus-double-pee-1'], true)).toBe('내 쓰리피 1장(피 3장 값) 뺏김');
  });

  it('일반 피와 쌍피가 함께 이동하면 합산 가치를 표시한다', () => {
    expect(describePeeTransfer(['m01-03', 'm12-04'], false)).toBe('상대 쌍피 포함 · 피 3장 값 뺏기');
  });
});
