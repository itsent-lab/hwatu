import { getCard } from '../engine/cards';
import HwatuCard from './HwatuCard';

export interface FloorCardChoice {
  playedCardId: string;
  candidateIds: string[];
  source: 'hand' | 'draw';
}

interface FloorCardFieldProps {
  cardIds: string[];
  choice: FloorCardChoice | null;
  disabled?: boolean;
  onSelect: (cardId: string) => void;
  onCancel: () => void;
}

export default function FloorCardField({ cardIds, choice, disabled = false, onSelect, onCancel }: FloorCardFieldProps) {
  const playedCard = choice ? getCard(choice.playedCardId) : null;
  return <>
    <div className={`floor-cards${choice ? ' choosing-floor-card' : ''}`}>
      {cardIds.map(cardId => <span className="floor-card-position" key={cardId}>
        <HwatuCard cardId={cardId} />
      </span>)}
      {choice && <div className="floor-choice-pair">
        {choice.candidateIds.map((cardId, index) => <span className={`floor-choice-candidate ${index === 0 ? 'choice-left' : 'choice-right'}`} key={cardId}>
          <HwatuCard cardId={cardId} disabled={disabled} onClick={() => onSelect(cardId)} />
        </span>)}
      </div>}
    </div>
    {choice && <div className={`floor-choice-prompt${choice.source === 'draw' ? ' draw-choice-prompt' : ''}`} role="dialog" aria-live="assertive" aria-label="먹을 바닥패 선택">
      {choice.source === 'draw' && <div className="floor-choice-drawn-preview"><HwatuCard cardId={choice.playedCardId} small /><em>뒤집은 패</em></div>}
      <strong>{choice.source === 'draw' ? `뒤집은 ${playedCard?.month ?? '?'}월 패, 어느 패를 먹을까요?` : `${playedCard?.month ?? '?'}월, 어느 패를 먹을까요?`}</strong>
      <span>파란 화살표가 있는 바닥패를 누르세요</span>
      {choice.source === 'hand' && <button type="button" disabled={disabled} onClick={onCancel}>다른 손패 고르기</button>}
    </div>}
  </>;
}
