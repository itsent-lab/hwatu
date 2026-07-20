import HwatuCard from './HwatuCard';

interface ShakeDecisionPanelProps {
  month: number;
  cardIds: string[];
  selectedCardId: string;
  disabled?: boolean;
  onDecision: (decision: 'shake' | 'plain') => void;
}

export default function ShakeDecisionPanel({
  month,
  cardIds,
  selectedCardId,
  disabled = false,
  onDecision
}: ShakeDecisionPanelProps) {
  return <div className="shake-choice-overlay">
    <section className="shake-choice-panel" role="dialog" aria-modal="true" aria-labelledby="shake-choice-title">
      <p className="shake-choice-kicker">흔들기 기회!</p>
      <h2 id="shake-choice-title">{month}월 세 장을 흔들까요?</h2>
      <div className="shake-choice-cards" aria-label={`${month}월 패 세 장`}>
        {cardIds.map(cardId => <span className={cardId === selectedCardId ? 'selected' : ''} key={cardId}>
          <HwatuCard cardId={cardId} />
        </span>)}
      </div>
      <p className="shake-choice-guide">흔들면 세 장을 공개하고 이번 판 점수가 <b>2배</b>가 됩니다.</p>
      <div className="shake-choice-buttons">
        <button className="shake-confirm-button" type="button" disabled={disabled} onClick={() => onDecision('shake')}>
          <span>배수 올리기</span><strong>흔들기!</strong><small>세 장 공개 · 점수 ×2</small>
        </button>
        <button className="shake-plain-button" type="button" disabled={disabled} onClick={() => onDecision('plain')}>
          <span>그대로 진행</span><strong>그냥 내기</strong><small>선택한 패만 냅니다</small>
        </button>
      </div>
    </section>
  </div>;
}
