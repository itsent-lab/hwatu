import HwatuCard from './HwatuCard';

interface BombDecisionPanelProps {
  month: number;
  kind: 'two-card-bomb' | 'three-card-bomb';
  handCardIds: string[];
  floorCardIds: string[];
  selectedCardId: string;
  disabled?: boolean;
  onDecision: (decision: 'bomb' | 'plain') => void;
}

export default function BombDecisionPanel({
  month,
  kind,
  handCardIds,
  floorCardIds,
  selectedCardId,
  disabled = false,
  onDecision
}: BombDecisionPanelProps) {
  const label = kind === 'two-card-bomb' ? '두장폭탄' : '폭탄';

  return <div className="shake-choice-overlay bomb-choice-overlay">
    <section className="shake-choice-panel bomb-choice-panel" role="dialog" aria-modal="true" aria-labelledby="bomb-choice-title">
      <p className="shake-choice-kicker">폭탄 기회!</p>
      <h2 id="bomb-choice-title">{month}월 {label}을 쓸까요?</h2>
      <div className="bomb-choice-groups">
        <div><b>내 패</b><div className="shake-choice-cards">
          {handCardIds.map(cardId => <span className={cardId === selectedCardId ? 'selected' : ''} key={cardId}><HwatuCard cardId={cardId} /></span>)}
        </div></div>
        <div><b>바닥패</b><div className="shake-choice-cards">
          {floorCardIds.map(cardId => <span key={cardId}><HwatuCard cardId={cardId} /></span>)}
        </div></div>
      </div>
      <p className="shake-choice-guide">폭탄으로 내면 같은 월 패를 한꺼번에 먹고 이번 판 점수가 <b>2배</b>가 됩니다.</p>
      <div className="shake-choice-buttons">
        <button className="bomb-confirm-button" type="button" disabled={disabled} onClick={() => onDecision('bomb')}>
          <span>한꺼번에 먹기</span><strong>{label}!</strong><small>같은 월 패 모두 획득 · 점수 ×2</small>
        </button>
        <button className="shake-plain-button" type="button" disabled={disabled} onClick={() => onDecision('plain')}>
          <span>그대로 진행</span><strong>그냥 내기</strong><small>선택한 패 한 장만 냅니다</small>
        </button>
      </div>
    </section>
  </div>;
}
