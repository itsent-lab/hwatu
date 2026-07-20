import HwatuCard from './HwatuCard';

interface GookjinDecisionPanelProps {
  currentAsDoubleJunk: boolean;
  disabled?: boolean;
  onDecision: (asDoubleJunk: boolean) => void;
}

export default function GookjinDecisionPanel({ currentAsDoubleJunk, disabled = false, onDecision }: GookjinDecisionPanelProps) {
  return <div className="gookjin-choice-overlay">
    <section className="gookjin-choice-panel" role="dialog" aria-modal="true" aria-label="국진 열끗 또는 쌍피 선택">
      <p>국진 선택</p>
      <h2>어디에 사용할까요?</h2>
      <div className="gookjin-choice-card"><HwatuCard cardId="m09-01" /><b>국진</b></div>
      <p className="gookjin-choice-guide">점수 상황을 보고 <b>열끗</b> 또는 <b>쌍피</b>로 사용할 수 있습니다.</p>
      <div className="gookjin-choice-buttons">
        <button type="button" className={!currentAsDoubleJunk ? 'selected' : ''} disabled={disabled} onClick={() => onDecision(false)}>
          <span>동물패로 계산</span><strong>열끗으로 사용</strong><small>열끗 묶음으로 이동</small>
        </button>
        <button type="button" className={currentAsDoubleJunk ? 'selected' : ''} disabled={disabled} onClick={() => onDecision(true)}>
          <span>피 2장으로 계산</span><strong>쌍피로 사용</strong><small>피 묶음으로 이동</small>
        </button>
      </div>
    </section>
  </div>;
}
