import type { CSSProperties } from 'react';
import { getCard } from '../engine/cards';
import HwatuCard from './HwatuCard';

type GroupKey = 'bright' | 'animal' | 'ribbon' | 'junk';

interface CapturedCardRackProps {
  cardIds: string[];
  owner: 'human' | 'opponent';
  gookjinAsDoubleJunk?: boolean;
  onToggleGookjin?: () => void;
}

const GROUPS: ReadonlyArray<{ key: GroupKey; label: string }> = [
  { key: 'bright', label: '광' },
  { key: 'animal', label: '열끗' },
  { key: 'ribbon', label: '띠' },
  { key: 'junk', label: '피' }
];

function groupFor(cardId: string, gookjinAsDoubleJunk: boolean): GroupKey {
  if (cardId === 'm09-01' && gookjinAsDoubleJunk) return 'junk';
  const type = getCard(cardId)?.type;
  return type === 'bright' || type === 'animal' || type === 'ribbon' ? type : 'junk';
}

function displayedCount(key: GroupKey, cardIds: string[], gookjinAsDoubleJunk: boolean): number {
  if (key !== 'junk') return cardIds.length;
  return cardIds.reduce((count, cardId) => {
    if (cardId === 'm09-01' && gookjinAsDoubleJunk) return count + 2;
    const card = getCard(cardId);
    if (card?.tags.includes('triple-junk')) return count + 3;
    return count + (card?.type === 'doubleJunk' ? 2 : 1);
  }, 0);
}

export default function CapturedCardRack({
  cardIds,
  owner,
  gookjinAsDoubleJunk = false,
  onToggleGookjin
}: CapturedCardRackProps) {
  const grouped = GROUPS.map(group => ({
    ...group,
    cards: cardIds.filter(cardId => groupFor(cardId, gookjinAsDoubleJunk) === group.key)
      .sort((left, right) => (getCard(left)?.month ?? 0) - (getCard(right)?.month ?? 0))
  })).filter(group => group.cards.length > 0);

  return <div className={`captured-rack ${owner}-rack${gookjinAsDoubleJunk ? ' gookjin-as-double-junk' : ''}`} aria-label={`${owner === 'human' ? '내' : '상대'} 획득 패`}>
    {grouped.map(group => <section
      className={`captured-card-group captured-${group.key}`}
      key={group.key}
      style={{ flexGrow: Math.max(2, Math.min(group.cards.length, 12)) } as CSSProperties}
      aria-label={`${group.label} ${displayedCount(group.key, group.cards, gookjinAsDoubleJunk)}`}
    >
      <div className="captured-card-fan">
        {group.cards.map((cardId, index) => {
          const position = group.cards.length <= 1 ? 0 : index / (group.cards.length - 1) * 100;
          const style = { left: `${position}%`, transform: `translateX(-${position}%)` };
          if (cardId === 'm09-01' && owner === 'human' && onToggleGookjin) {
            return <button
              type="button"
              className={`captured-card-slot gookjin-card-toggle gookjin-in-${group.key}`}
              key={`${cardId}-${group.key}`}
              style={style}
              aria-label={`국진은 현재 ${gookjinAsDoubleJunk ? '쌍피' : '열끗'}, 눌러서 변경`}
              onClick={onToggleGookjin}
            >
              <HwatuCard cardId={cardId} small />
              <em>{gookjinAsDoubleJunk ? '쌍피' : '열끗'}</em>
            </button>;
          }
          return <span className="captured-card-slot" key={cardId} style={style}><HwatuCard cardId={cardId} small /></span>;
        })}
      </div>
      <b className="captured-group-count">{group.label} {displayedCount(group.key, group.cards, gookjinAsDoubleJunk)}</b>
    </section>)}
  </div>;
}
