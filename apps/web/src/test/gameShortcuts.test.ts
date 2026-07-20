import { describe, expect, it } from 'vitest';
import { handCardIndexFromKey } from '../lib/gameShortcuts';

describe('손패 숫자키 단축키', () => {
  it('상단 숫자키 1~9와 0을 손패 순서로 바꾼다', () => {
    expect(handCardIndexFromKey('Digit1', '1')).toBe(0);
    expect(handCardIndexFromKey('Digit9', '9')).toBe(8);
    expect(handCardIndexFromKey('Digit0', '0')).toBe(9);
  });

  it('숫자 키패드도 같은 순서로 처리한다', () => {
    expect(handCardIndexFromKey('Numpad3', '3')).toBe(2);
    expect(handCardIndexFromKey('Numpad0', '0')).toBe(9);
  });

  it('숫자가 아닌 키는 손패를 선택하지 않는다', () => {
    expect(handCardIndexFromKey('KeyQ', 'q')).toBeNull();
    expect(handCardIndexFromKey('Enter', 'Enter')).toBeNull();
  });
});
