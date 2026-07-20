import type { AudioSettings } from '../lib/audioSettings';

interface Props {
  settings: AudioSettings;
  onChange: (settings: AudioSettings) => void;
  compact?: boolean;
}

export default function AudioControls({ settings, onChange, compact = false }: Props) {
  const percent = Math.round(settings.volume * 100);
  return <section className={`audio-controls${compact ? ' compact' : ''}`} aria-label="게임 소리 설정">
    <button
      type="button"
      className={`audio-control-button${settings.muted ? ' muted' : ''}`}
      aria-pressed={settings.muted}
      onClick={() => onChange({ ...settings, muted: !settings.muted })}
    >
      <span aria-hidden="true">{settings.muted ? '🔇' : '🔊'}</span>
      <b>{settings.muted ? '음소거' : '소리 켜짐'}</b>
    </button>
    <label className="audio-volume">
      <span>음량 <b>{percent}%</b></span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={settings.volume}
        aria-label={`게임 음량 ${percent}%`}
        onChange={event => onChange({ ...settings, volume: Number(event.target.value) })}
      />
    </label>
    <button
      type="button"
      className={`audio-control-button bgm-button${settings.backgroundMusic ? ' active' : ''}`}
      aria-pressed={settings.backgroundMusic}
      onClick={() => onChange({ ...settings, backgroundMusic: !settings.backgroundMusic })}
    >
      <span aria-hidden="true">♫</span>
      <b>배경음 {settings.backgroundMusic ? '켬' : '끔'}</b>
    </button>
  </section>;
}
