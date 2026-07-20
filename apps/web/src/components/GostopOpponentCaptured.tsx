import CapturedCardRack from './CapturedCardRack';

interface GostopOpponentCapturedProps {
  cardIds: string[];
  name: string;
  gookjinAsDoubleJunk?: boolean;
}

export default function GostopOpponentCaptured({ cardIds, name, gookjinAsDoubleJunk = false }: GostopOpponentCapturedProps) {
  return <div className="gostop-opponent-captured" aria-label={`${name} 획득패 ${cardIds.length}장`}>
    <b>획득패</b>
    {cardIds.length > 0
      ? <CapturedCardRack cardIds={cardIds} owner="opponent" gookjinAsDoubleJunk={gookjinAsDoubleJunk} />
      : <span>아직 없음</span>}
  </div>;
}
