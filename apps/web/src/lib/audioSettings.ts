export interface AudioSettings {
  muted: boolean;
  volume: number;
  backgroundMusic: boolean;
}

interface AudioSettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = 'nsj-hwatu-audio-v1';

export const DEFAULT_AUDIO_SETTINGS: Readonly<AudioSettings> = Object.freeze({
  muted: false,
  volume: 0.28,
  backgroundMusic: false
});

export function normalizeAudioSettings(value: unknown): AudioSettings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_AUDIO_SETTINGS };
  const candidate = value as Partial<AudioSettings>;
  const volume = typeof candidate.volume === 'number' && Number.isFinite(candidate.volume)
    ? Math.min(1, Math.max(0, candidate.volume))
    : DEFAULT_AUDIO_SETTINGS.volume;
  return {
    muted: typeof candidate.muted === 'boolean' ? candidate.muted : DEFAULT_AUDIO_SETTINGS.muted,
    volume,
    backgroundMusic: typeof candidate.backgroundMusic === 'boolean' ? candidate.backgroundMusic : DEFAULT_AUDIO_SETTINGS.backgroundMusic
  };
}

export function loadAudioSettings(storage: AudioSettingsStorage = window.localStorage): AudioSettings {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    return saved ? normalizeAudioSettings(JSON.parse(saved)) : { ...DEFAULT_AUDIO_SETTINGS };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

export function saveAudioSettings(settings: AudioSettings, storage: AudioSettingsStorage = window.localStorage) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(normalizeAudioSettings(settings))); }
  catch { /* 설정 저장이 막혀도 게임은 계속 진행 */ }
}
