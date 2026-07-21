import { describe, expect, it } from 'vitest';
import { nextRoundMultiplier } from '../engine/rules/nagari';

describe('나가리 다음 판 배율', () => {
  it('나가리가 연속되면 2배, 4배, 8배로 누적한다', () => {
    const twice = nextRoundMultiplier('nagari', 1);
    const fourTimes = nextRoundMultiplier('nagari', twice);
    const eightTimes = nextRoundMultiplier('nagari', fourTimes);
    expect([twice, fourTimes, eightTimes]).toEqual([2, 4, 8]);
    expect(nextRoundMultiplier('nagari', eightTimes)).toBe(8);
  });

  it('승부가 나면 다음 판은 1배로 초기화한다', () => {
    expect(nextRoundMultiplier('win', 8)).toBe(1);
  });
});
