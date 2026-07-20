import { MATGO_POINT_VALUES, type MatgoPointValue } from '../engine/rules/settings';

interface StakeQuickSelectorProps {
  value: MatgoPointValue;
  disabled?: boolean;
  onChange: (value: MatgoPointValue) => void;
  onClose: () => void;
}

export default function StakeQuickSelector({ value, disabled = false, onChange, onClose }: StakeQuickSelectorProps) {
  return <section className="stake-quick-selector" role="dialog" aria-label="점당 게임머니 변경">
    <header><strong>점당 금액 변경</strong><button type="button" aria-label="닫기" onClick={onClose}>×</button></header>
    <div>{MATGO_POINT_VALUES.map(pointValue => <button
      type="button"
      data-point-value={pointValue}
      className={pointValue === value ? 'selected' : ''}
      aria-pressed={pointValue === value}
      disabled={disabled}
      key={pointValue}
      onClick={() => onChange(pointValue)}
    >점 {pointValue.toLocaleString('ko-KR')}냥</button>)}</div>
    <p>선택한 금액이 이번 판 정산에 바로 적용됩니다.</p>
  </section>;
}
