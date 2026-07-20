import { describe, expect, it } from 'vitest';
import { decideCardActivation } from '../lib/touchCardConfirmation';

describe('터치 손패 확인', () => {
  it('첫 터치는 패를 선택만 하고 같은 패의 두 번째 터치에 낸다', () => {
    expect(decideCardActivation(null, 'm01-01', 'touch', true)).toEqual({ selectedCardId: 'm01-01', play: false });
    expect(decideCardActivation('m01-01', 'm01-01', 'touch', true)).toEqual({ selectedCardId: null, play: true });
  });

  it('다른 패를 터치하면 내지 않고 선택을 옮긴다', () => {
    expect(decideCardActivation('m01-01', 'm02-01', 'touch', true)).toEqual({ selectedCardId: 'm02-01', play: false });
  });

  it('펜 입력도 터치처럼 확인하고 마우스는 한 번에 낸다', () => {
    expect(decideCardActivation(null, 'm01-01', 'pen', true).play).toBe(false);
    expect(decideCardActivation(null, 'm01-01', 'mouse', true)).toEqual({ selectedCardId: null, play: true });
  });

  it('확인 옵션이 꺼져 있으면 터치도 한 번에 낸다', () => {
    expect(decideCardActivation(null, 'm01-01', 'touch', false)).toEqual({ selectedCardId: null, play: true });
  });
});
