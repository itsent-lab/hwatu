import { MATGO_POINT_VALUES, type MatgoPointValue } from '../engine/rules/settings';

interface PointEntryButtonsProps {
  disabled?: boolean;
  ariaLabel?: string;
  onEnter: (pointValue: MatgoPointValue) => void;
}

const ROOM_LABELS: Record<MatgoPointValue, string> = {
  100: '가볍게',
  1_000: '신나게',
  2_000: '짜릿하게',
  5_000: '화끈하게',
  10_000: '큰 승부'
};

export default function PointEntryButtons({
  disabled = false,
  ariaLabel = '점당 금액을 고르고 입장하세요',
  onEnter
}: PointEntryButtonsProps) {
  return <fieldset className="dashboard-point-entry" aria-label={ariaLabel}>
    <div>{MATGO_POINT_VALUES.map(pointValue => <button
      type="button"
      disabled={disabled}
      key={pointValue}
      onClick={() => onEnter(pointValue)}
    >
      <span className="room-kind">일반</span>
      <b className="room-stake">점 {pointValue.toLocaleString('ko-KR')}냥</b>
      <small>{ROOM_LABELS[pointValue]}</small>
      <span className="room-enter">입장</span>
    </button>)}</div>
  </fieldset>;
}
