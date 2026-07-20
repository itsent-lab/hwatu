import { forwardRef } from 'react';
import { getCard } from '../engine/cards';
import HwatuCard from './HwatuCard';

interface GostopHumanHandProps {
  cardIds: string[];
  floorCardIds: string[];
  disabled: boolean;
  showHints: boolean;
  selectedCardId?: string | null;
  onPlay: (cardId: string, element: HTMLButtonElement) => void;
}

const GostopHumanHand = forwardRef<HTMLDivElement, GostopHumanHandProps>(function GostopHumanHand({
  cardIds,
  floorCardIds,
  disabled,
  showHints,
  selectedCardId = null,
  onPlay
}, ref) {
  const floorMonths = new Set(
    floorCardIds
      .map(cardId => getCard(cardId)?.month)
      .filter((month): month is number => typeof month === 'number')
  );

  return <div ref={ref} className="gostop-human-hand" aria-label={`내 손패 ${cardIds.length}장`}>
    {cardIds.map(cardId => {
      const card = getCard(cardId);
      const bonusHint = Boolean(card?.tags.includes('bonus-pee'));
      const matchHint = Boolean(card?.month && floorMonths.has(card.month));
      const hintClass = showHints && (bonusHint || matchHint)
        ? bonusHint ? ' gostop-bonus-hint' : ' gostop-match-hint'
        : '';

      return <span
        className={`gostop-hand-card-slot${hintClass}${selectedCardId === cardId ? ' selected' : ''}`}
        key={cardId}
        title={hintClass ? bonusHint ? '보너스패: 한 번 더 칩니다' : '바닥패와 맞아 먹을 수 있습니다' : undefined}
      >
        <HwatuCard
          cardId={cardId}
          disabled={disabled}
          onClick={element => onPlay(cardId, element)}
        />
      </span>;
    })}
  </div>;
});

export default GostopHumanHand;
