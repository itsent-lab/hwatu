import { describe, expect, it } from 'vitest';
import { voiceLines } from '../lib/voiceLines';

describe('강렬하고 약 오르는 맞고 음성', () => {
  it('상대 특수 패에는 짧은 약 올림 대사를 쓴다', () => {
    expect(voiceLines.special('jjok', true)).toBe('쪽! 약 오르지?');
    expect(voiceLines.bomb(true)).toContain('제대로 맞아라');
    expect(voiceLines.score('피박', 14, true)).toContain('따라와 봐');
  });

  it('사용자 선언은 짧고 힘 있게 마무리한다', () => {
    expect(voiceLines.go(1)).toBe('고! 더 가자!');
    expect(voiceLines.go(5)).toContain('축포');
    expect(voiceLines.stop).toBe('스톱! 여기까지!');
    expect(voiceLines.win(21)).toBe('좋았어! 21점 승리!');
  });
});
