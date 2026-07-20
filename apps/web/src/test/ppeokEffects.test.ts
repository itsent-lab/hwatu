import { describe, expect, it } from 'vitest';
import { getPpeokDeclaration } from '../lib/ppeokEffects';

describe('연속뻑 선언 효과', () => {
  it('첫 뻑은 기존 선언을 유지한다', () => {
    expect(getPpeokDeclaration(1)).toMatchObject({ count: 1, kind: 'ppeok', text: '뻑!' });
  });

  it('두 번째 뻑은 다음 삼연뻑 승리를 미리 알려준다', () => {
    expect(getPpeokDeclaration(2)).toMatchObject({ count: 2, kind: 'ppeok-chain', text: '연속뻑!' });
    expect(getPpeokDeclaration(2).detail).toContain('한 번 더');
  });

  it('세 번째 이상은 삼연뻑과 7점 즉시 승리로 강조한다', () => {
    expect(getPpeokDeclaration(4)).toMatchObject({ count: 3, kind: 'ppeok-triple', text: '삼연뻑!' });
    expect(getPpeokDeclaration(3).detail).toContain('7점 즉시 승리');
  });
});
