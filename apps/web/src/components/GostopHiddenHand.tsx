import HwatuCard from './HwatuCard';

export default function GostopHiddenHand({ cardIds }: { cardIds: string[] }) {
  return <div className="gostop-hidden-hand" aria-label={`손패 ${cardIds.length}장`}>
    {cardIds.map(cardId => <div className="gostop-card-back" data-card-id={cardId} key={cardId} aria-hidden="true">
      <i>花</i><div className="gostop-card-flight-face"><HwatuCard cardId={cardId} /></div>
    </div>)}
  </div>;
}
