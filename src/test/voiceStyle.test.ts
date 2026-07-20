import { describe, expect, it } from 'vitest';
import { VOICE_STYLE_SETTINGS } from '../lib/voiceStyle';

describe('상대 음성 높이와 속도', () => {
  it('상대 목소리는 또렷한 속도와 자연스러운 높이로 힘 있게 들린다', () => {
    expect(VOICE_STYLE_SETTINGS.taunt.rate).toBeGreaterThanOrEqual(0.96);
    expect(VOICE_STYLE_SETTINGS.taunt.rate).toBeLessThanOrEqual(1.05);
    expect(VOICE_STYLE_SETTINGS.taunt.pitch).toBeGreaterThan(VOICE_STYLE_SETTINGS.normal.pitch);
    expect(VOICE_STYLE_SETTINGS.taunt.pitch).toBeLessThanOrEqual(1.2);
    expect(VOICE_STYLE_SETTINGS.taunt.volumeMultiplier).toBeGreaterThanOrEqual(3.5);
    expect(VOICE_STYLE_SETTINGS.taunt.volumeMultiplier).toBeGreaterThan(VOICE_STYLE_SETTINGS.shout.volumeMultiplier);
  });
});
