import { MATGO_POINT_VALUES, type MatgoPointValue } from '../engine/rules/settings';

interface PointValueSelectorProps {
  value: MatgoPointValue;
  disabled?: boolean;
  onChange: (value: MatgoPointValue) => void;
}

const LABELS: Record<MatgoPointValue, string> = {
  100: '가볍게',
  1_000: '신나게',
  2_000: '짜릿하게',
  5_000: '화끈하게',
  10_000: '큰 승부'
};

export default function PointValueSelector({ value, disabled = false, onChange }: PointValueSelectorProps) {
  return <fieldset className="point-value-selector">
    <legend>점당 게임머니</legend>
    <div>{MATGO_POINT_VALUES.map(pointValue => <button
      type="button"
      data-point-value={pointValue}
      className={pointValue === value ? 'selected' : ''}
      aria-pressed={pointValue === value}
      disabled={disabled}
      key={pointValue}
      onClick={() => onChange(pointValue)}
    >
      <b>점 {pointValue.toLocaleString('ko-KR')}냥</b>
      <span>{LABELS[pointValue]}</span>
    </button>)}</div>
  </fieldset>;
}
