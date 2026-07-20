import ShakeBellIcon from './ShakeBellIcon';

interface TableScoreBadgeProps {
  owner: 'human' | 'computer';
  score: number;
  goCount: number;
  shakeMultiplierCount: number;
  bombCount: number;
}

export default function TableScoreBadge({
  owner,
  score,
  goCount,
  shakeMultiplierCount,
  bombCount
}: TableScoreBadgeProps) {
  const shakeCount = Math.max(0, shakeMultiplierCount - bombCount);
  const ownerLabel = owner === 'human' ? '내 점수' : '상대';
  const statusLabel = [
    goCount > 0 ? `${goCount}고` : '',
    shakeCount > 0 ? `흔들기 ${shakeCount}회` : '',
    bombCount > 0 ? `폭탄 ${bombCount}회` : ''
  ].filter(Boolean).join(', ');

  return <div
    className={`table-score-badge ${owner === 'human' ? 'human-score' : 'opponent-score'}`}
    aria-label={`${ownerLabel} ${score}점${statusLabel ? `, ${statusLabel}` : ''}`}
  >
    <strong><span>{score}</span><small>점</small></strong>
    <div className="score-status-marks" aria-hidden="true">
      <span className={goCount > 0 ? 'active' : ''}><b>{goCount || ''}</b>고</span>
      <span className={shakeCount > 0 ? 'active' : ''}>
        <ShakeBellIcon /><b>{shakeCount || ''}</b>
      </span>
      <span className={bombCount > 0 ? 'active' : ''}>
        <i className="bomb-status-icon" /><b>{bombCount || ''}</b>
      </span>
    </div>
  </div>;
}
