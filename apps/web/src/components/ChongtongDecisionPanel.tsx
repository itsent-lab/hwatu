import { getCard } from '../engine/cards';
import HwatuCard from './HwatuCard';

interface ChongtongDecisionPanelProps {
  cardIds: string[];
  month: number | null;
  disabled?: boolean;
  onDecision: (decision: 'continue' | 'stop') => void;
}

export default function ChongtongDecisionPanel({ cardIds, month, disabled = false, onDecision }: ChongtongDecisionPanelProps) {
  const chongtongCards = cardIds.filter(cardId => getCard(cardId)?.month === month).slice(0, 4);
  return <section className="go-stop-panel chongtong-panel" role="dialog" aria-labelledby="chongtong-title">
    <p className="chongtong-kicker">특수패 발견</p>
    <h2 id="chongtong-title">총통!</h2>
    <div className="chongtong-cards" aria-label={`${month}월 총통 네 장`}>
      {chongtongCards.map(cardId => <HwatuCard cardId={cardId} key={cardId} />)}
    </div>
    <p className="chongtong-guide">바로 7점으로 끝내거나, 네 장을 흔들고 계속 칠 수 있습니다.</p>
    <button className="go-button" type="button" disabled={disabled} onClick={() => onDecision('continue')}>
      <strong>계속!</strong><small>4장 흔들기 후 폭탄</small>
    </button>
    <button className="stop-button" type="button" disabled={disabled} onClick={() => onDecision('stop')}>
      <strong>스톱!</strong><small>7점 승리</small>
    </button>
  </section>;
}
