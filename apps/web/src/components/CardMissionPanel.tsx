import { evaluateCardMission } from '../engine/rules/missions';
import type { CardMission } from '../engine/types';
import HwatuCard from './HwatuCard';

interface CardMissionPanelProps {
  mission: CardMission;
  humanCaptured: string[];
  computerCaptured: string[];
  placement?: 'board' | 'side';
}

export default function CardMissionPanel({ mission, humanCaptured, computerCaptured, placement = 'board' }: CardMissionPanelProps) {
  const progress = evaluateCardMission(mission, humanCaptured, computerCaptured);
  const humanSet = new Set(progress.humanCardIds);
  const computerSet = new Set(progress.computerCardIds);
  const clearMultiplier = Math.max(progress.humanMultiplier, progress.computerMultiplier);
  const clearOwner = clearMultiplier > 1
    ? progress.humanMultiplier >= progress.computerMultiplier ? 'human' : 'computer'
    : null;
  return <section className={`card-mission-panel ${placement}-mission-panel`} aria-label="각패 미션">
    <header><b><span>Mission</span><small>미션패</small></b><strong>한 장마다 ×2</strong></header>
    <div className="mission-card-list">
      {mission.cardIds.map(cardId => {
        const owner = humanSet.has(cardId) ? 'human' : computerSet.has(cardId) ? 'computer' : null;
        return <span className={`mission-card${owner ? ` captured-by-${owner}` : ''}`} key={cardId}>
          <HwatuCard cardId={cardId} small />
          <em>{owner === 'human' ? '내 획득' : owner === 'computer' ? '상대 획득' : '×2'}</em>
        </span>;
      })}
    </div>
    {clearOwner && <div className={`mission-clear-badge ${clearOwner}`} role="status"><b>CLEAR</b><span>×{clearMultiplier}</span></div>}
    <footer><span>나 ×{progress.humanMultiplier}</span><b>최대 ×8</b><span>상대 ×{progress.computerMultiplier}</span></footer>
  </section>;
}
