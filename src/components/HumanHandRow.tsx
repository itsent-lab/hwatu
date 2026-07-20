import { forwardRef, useEffect, useRef, useState } from 'react';
import { getCard } from '../engine/cards';
import { findBombOptions, findShakeOptions } from '../engine/rules/specialRules';
import { decideCardActivation } from '../lib/touchCardConfirmation';
import HwatuCard from './HwatuCard';
import ShakeBellIcon from './ShakeBellIcon';

interface HumanHandRowProps {
  cardIds: string[];
  floorCardIds: string[];
  bombSkips: number;
  shakenMonths?: number[];
  requiredMonth?: number | null;
  showHints: boolean;
  disabled: boolean;
  flipOnlyDisabled?: boolean;
  confirmTouchPlay?: boolean;
  selectedCardId?: string | null;
  onPlay: (cardId: string, element: HTMLButtonElement) => void;
  onFlipOnly?: () => void;
}

const HumanHandRow = forwardRef<HTMLDivElement, HumanHandRowProps>(function HumanHandRow({
  cardIds,
  floorCardIds,
  bombSkips,
  shakenMonths = [],
  requiredMonth = null,
  showHints,
  disabled,
  flipOnlyDisabled = false,
  confirmTouchPlay = false,
  selectedCardId = null,
  onPlay,
  onFlipOnly
}, ref) {
  const [touchSelectedCardId, setTouchSelectedCardId] = useState<string | null>(null);
  const pointerTypeRef = useRef('');
  const floorMonths = new Set(
    floorCardIds
      .map(cardId => getCard(cardId)?.month)
      .filter((month): month is number => typeof month === 'number')
  );
  const bombReadyIds = new Set(
    findBombOptions(cardIds, floorCardIds).flatMap(option => option.handCardIds)
  );
  const shakeReadyIds = new Set(
    findShakeOptions(cardIds, floorCardIds, shakenMonths).flatMap(option => option.handCardIds)
  );

  useEffect(() => {
    if (!confirmTouchPlay || disabled || (touchSelectedCardId && !cardIds.includes(touchSelectedCardId))) setTouchSelectedCardId(null);
  }, [cardIds, confirmTouchPlay, disabled, touchSelectedCardId]);

  useEffect(() => {
    if (!touchSelectedCardId) return;
    const clearOutside = (event: PointerEvent) => {
      const button = event.target instanceof Element ? event.target.closest('button[data-card-id]') : null;
      if (button?.getAttribute('data-card-id') !== touchSelectedCardId) setTouchSelectedCardId(null);
    };
    document.addEventListener('pointerdown', clearOutside);
    return () => document.removeEventListener('pointerdown', clearOutside);
  }, [touchSelectedCardId]);

  const activateCard = (cardId: string, element: HTMLButtonElement) => {
    const decision = decideCardActivation(touchSelectedCardId, cardId, pointerTypeRef.current, confirmTouchPlay);
    pointerTypeRef.current = '';
    setTouchSelectedCardId(decision.selectedCardId);
    if (decision.play) onPlay(cardId, element);
  };

  return <div className="human-hand" ref={ref} aria-label="내 패" onPointerDownCapture={event => { pointerTypeRef.current = event.pointerType; }}>
    {Array.from({ length: 10 }, (_, index) => {
      const cardId = cardIds[index];
      if (cardId) {
        const card = getCard(cardId);
        const bonusHint = Boolean(card?.tags.includes('bonus-pee'));
        const matchHint = Boolean(card?.month && floorMonths.has(card.month));
        const shakeCard = requiredMonth !== null && card?.month === requiredMonth;
        const bombReady = bombReadyIds.has(cardId);
        const shakeReady = shakeReadyIds.has(cardId);
        const hintClass = showHints && (bonusHint || matchHint)
          ? bonusHint ? ' bonus-hint' : ' match-hint'
          : '';

        return <span
          className={`hand-card-slot${hintClass}${shakeCard ? ' pending-shake-card' : ''}${bombReady ? ' bomb-ready-card' : ''}${shakeReady ? ' shake-ready-card' : ''}${selectedCardId === cardId ? ' pending-floor-choice' : ''}${touchSelectedCardId === cardId ? ' touch-play-selected' : ''}`}
          key={cardId}
          title={shakeCard ? `${requiredMonth}월 흔들기: 이 패 중 한 장을 내세요` : shakeReady ? `${card?.month}월 흔들기 가능: 패를 누르세요` : hintClass ? bonusHint ? '보너스패: 한 번 더 칩니다' : '바닥패와 맞아 먹을 수 있습니다' : undefined}
        >
          {bombReady && <span className="bomb-ready-mark" aria-hidden="true">B</span>}
          {shakeReady && <span className="shake-ready-mark" aria-hidden="true"><ShakeBellIcon /></span>}
          <HwatuCard
            cardId={cardId}
            selected={touchSelectedCardId === cardId}
            shortcutLabel={index === 9 ? '0' : String(index + 1)}
            disabled={disabled || (requiredMonth !== null && !shakeCard)}
            onClick={element => activateCard(cardId, element)}
          />
        </span>;
      }

      const bombIndex = index - cardIds.length;
      if (bombIndex >= 0 && bombIndex < bombSkips) {
        const isCurrentBombTurn = bombIndex === 0;
        return <span className="hand-card-slot bomb-skip-slot" key={`bomb-skip-${bombIndex}`}>
          <button
            type="button"
            className="bomb-skip-marker"
            disabled={flipOnlyDisabled || !isCurrentBombTurn || !onFlipOnly}
            aria-label={isCurrentBombTurn ? '보관한 폭탄 패: 눌러서 덱 뒤집기' : '보관한 폭탄 빈 차례'}
            onClick={onFlipOnly}
          ><b className="saved-bomb-icon" aria-hidden="true"><span /></b><small>{isCurrentBombTurn ? '눌러 뒤집기' : '폭탄 보관'}</small></button>
        </span>;
      }

      return <span className="hand-card-slot empty-hand-slot" key={`empty-${index}`} aria-hidden="true" />;
    })}
  </div>;
});

export default HumanHandRow;
