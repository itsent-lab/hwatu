import { getCard } from '../engine/cards';

interface CaptureSummaryProps {
  cardIds: string[];
  compact?: boolean;
  gookjinAsDoubleJunk?: boolean;
}

export default function CaptureSummary({ cardIds, compact = false, gookjinAsDoubleJunk = false }: CaptureSummaryProps) {
  const counts = cardIds.reduce((summary, id) => {
    const card = getCard(id);
    if (card?.tags.includes('gookjin') && gookjinAsDoubleJunk) {
      summary.junk += 2;
      return summary;
    }
    const type = card?.type;
    if (type === 'bright') summary.bright += 1;
    else if (type === 'animal') summary.animal += 1;
    else if (type === 'ribbon') summary.ribbon += 1;
    else if (card?.tags.includes('triple-junk')) summary.junk += 3;
    else if (type === 'doubleJunk') summary.junk += 2;
    else if (type === 'junk') summary.junk += 1;
    return summary;
  }, { bright: 0, animal: 0, ribbon: 0, junk: 0 });
  return <div className={`capture-summary${compact ? ' compact' : ''}`} aria-label={`광 ${counts.bright}, 열끗 ${counts.animal}, 띠 ${counts.ribbon}, 피 ${counts.junk}`}>
    <span><b>광</b>{counts.bright}</span><span><b>열</b>{counts.animal}</span><span><b>띠</b>{counts.ribbon}</span><span><b>피</b>{counts.junk}</span>
  </div>;
}
