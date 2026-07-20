import { useEffect, useMemo, useRef, useState } from 'react';
import { getCard } from '../engine/cards';
import { chooseComputerDealerIndex, createDealerSelectionCards, determineDealerWinner } from '../engine/dealerSelection';
import type { PlayerId } from '../engine/types';
import HwatuCard from './HwatuCard';

interface StartingPlayerChoiceProps {
  seed: number;
  disabled?: boolean;
  daytime?: boolean;
  onSelect: (player: PlayerId) => void;
  onExit?: () => void;
}

export default function StartingPlayerChoice({ seed, disabled = false, daytime = new Date().getHours() >= 6 && new Date().getHours() < 18, onSelect, onExit }: StartingPlayerChoiceProps) {
  const cards = useMemo(() => createDealerSelectionCards(seed), [seed]);
  const [humanIndex, setHumanIndex] = useState<number | null>(null);
  const [computerIndex, setComputerIndex] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const winner = humanIndex === null || computerIndex === null ? null : determineDealerWinner(cards[humanIndex], cards[computerIndex], daytime);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const selectCard = (index: number) => {
    if (disabled || humanIndex !== null) return;
    const opponentIndex = chooseComputerDealerIndex(cards, index, seed);
    const result = determineDealerWinner(cards[index], cards[opponentIndex], daytime);
    setHumanIndex(index);
    setComputerIndex(opponentIndex);
    if (result) timerRef.current = window.setTimeout(() => onSelect(result), 1800);
  };

  const humanMonth = humanIndex === null ? null : getCard(cards[humanIndex])?.month;
  const computerMonth = computerIndex === null ? null : getCard(cards[computerIndex])?.month;
  const resultText = winner === null
    ? `${daytime ? '낮장' : '밤일'} · ${daytime ? '높은 월' : '낮은 월'}이 선입니다`
    : winner === 'human'
      ? `선입니다! 나는 ${humanMonth}월, 상대는 ${computerMonth}월입니다.`
      : `후입니다! 나는 ${humanMonth}월, 상대는 ${computerMonth}월입니다.`;

  return <fieldset className="starting-player-choice">
    <legend aria-live="polite">{resultText}</legend>
    <div className="dealer-pick-cards">
      {cards.map((cardId, index) => {
        const isHuman = humanIndex === index;
        const isComputer = computerIndex === index;
        const revealed = isHuman || isComputer;
        return <button
          type="button"
          className={`dealer-pick-card${revealed ? ' revealed' : ''}${isHuman ? ' selected human-pick' : ''}${isComputer ? ' computer-pick' : ''}${humanIndex !== null && !revealed ? ' unpicked' : ''}`}
          aria-label={revealed ? `${isHuman ? '내가' : '상대가'} 고른 ${getCard(cardId)?.month}월 패` : `${index + 1}번 뒤집힌 선택패`}
          disabled={disabled || humanIndex !== null}
          key={cardId}
          onClick={() => selectCard(index)}
        >
          <span className="dealer-card-inner">
            <span className="dealer-card-back" aria-hidden="true"><b>花</b><small>{index + 1}</small></span>
            <span className="dealer-card-result" aria-hidden="true"><HwatuCard cardId={cardId} /><small>{isHuman ? '내 패' : isComputer ? '상대 패' : ''}</small></span>
          </span>
        </button>;
      })}
    </div>
    {onExit && <button type="button" className="dealer-exit-button" disabled={disabled || humanIndex !== null} onClick={onExit}>나가기</button>}
  </fieldset>;
}
