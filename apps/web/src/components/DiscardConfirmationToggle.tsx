interface DiscardConfirmationToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export default function DiscardConfirmationToggle({ enabled, onChange }: DiscardConfirmationToggleProps) {
  return <button
    type="button"
    className={`discard-confirmation-toggle${enabled ? ' enabled' : ''}`}
    aria-label={`버림패 확인 ${enabled ? '켜짐, 두 번 터치' : '꺼짐, 한 번 터치'}`}
    aria-pressed={enabled}
    onClick={() => onChange(!enabled)}
  >
    <span aria-hidden="true">{enabled ? '2' : '1'}</span><b>{enabled ? '확인 후 내기' : '바로 내기'}</b><small>{enabled ? '두 번 터치' : '한 번 터치'}</small>
  </button>;
}
