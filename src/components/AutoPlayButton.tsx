interface AutoPlayButtonProps {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export default function AutoPlayButton({ active, disabled = false, onToggle }: AutoPlayButtonProps) {
  return <button
    type="button"
    className={`auto-play-button${active ? ' active' : ''}`}
    aria-pressed={active}
    disabled={disabled}
    onClick={onToggle}
  >
    <span aria-hidden="true">{active ? 'Ⅱ' : '↻'}</span>
    <b>{active ? '자동 치는 중' : '자동 치기'}</b>
    <small>{active ? '눌러서 멈춤' : '편하게 관전'}</small>
  </button>;
}
