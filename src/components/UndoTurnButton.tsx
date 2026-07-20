interface Props {
  remaining: number;
  disabled: boolean;
  onUndo: () => void;
}

export default function UndoTurnButton({ remaining, disabled, onUndo }: Props) {
  const exhausted = remaining <= 0;
  return <button
    type="button"
    className={`turn-undo-button${exhausted ? ' exhausted' : ''}`}
    aria-label={exhausted ? '이번 판 무르기 3회를 모두 사용했습니다' : `마지막 수 무르기, 이번 판 ${remaining}회 남음`}
    disabled={disabled || exhausted}
    onClick={onUndo}
  >
    <small>낙장불입 대신</small>
    <b><span aria-hidden="true">↶</span> 무르기</b>
    <em>{exhausted ? '모두 사용' : `${remaining}회 남음`}</em>
  </button>;
}
