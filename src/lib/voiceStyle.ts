export type VoiceStyle = 'normal' | 'shout' | 'low' | 'taunt';

export const VOICE_STYLE_SETTINGS: Record<VoiceStyle, { rate: number; pitch: number; volumeMultiplier: number }> = {
  normal: { rate: 1.06, pitch: 1.04, volumeMultiplier: 2.15 },
  shout: { rate: 1.22, pitch: 0.86, volumeMultiplier: 2.35 },
  low: { rate: 0.94, pitch: 0.76, volumeMultiplier: 2.15 },
  taunt: { rate: 1, pitch: 1.16, volumeMultiplier: 3.6 }
};
