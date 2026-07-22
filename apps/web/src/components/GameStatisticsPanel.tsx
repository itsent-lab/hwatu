import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GameModeStatistics } from '../lib/types';

interface GameStatisticsPanelProps {
  stats?: GameModeStatistics | null;
  modeLabel: string;
  hero?: boolean;
  showZeroStats?: boolean;
}

const formatNumber = (value: number) => new Intl.NumberFormat('ko-KR').format(value);
const formatMoney = (value: number) => `${value > 0 ? '+' : ''}${formatNumber(value)}냥`;
const resultLabels = { win: '승', loss: '패', draw: '무', nagari: '나' } as const;
const EMPTY_STATS: GameModeStatistics = {
  gameMode: 'matgo', totalGames: 0, wins: 0, losses: 0, nagari: 0, winRate: 0,
  highestScore: 0, longestWinStreak: 0, currentWinStreak: 0,
  totalSettlement: 0, biggestWinAmount: 0, recentResults: [], specialStatsTrackedGames: 0,
  totalGoCount: 0, highestWinningGoCount: 0, totalSweepCount: 0, maxSweepCount: 0,
  totalBombCount: 0, maxBombCount: 0, totalShakeCount: 0, maxShakeCount: 0,
  totalPpeokCount: 0, maxPpeokCount: 0, openingPpeokCount: 0, threePpeokWins: 0,
  piBakWins: 0, gwangBakWins: 0
};

function RecordRow({ label, total, maximum, maximumLabel = '한 판 최고' }: {
  label: string;
  total: number;
  maximum: number;
  maximumLabel?: string;
}) {
  return <li><span>{label}</span><b>누적 {formatNumber(total)}회</b><small>{maximumLabel} {formatNumber(maximum)}회</small></li>;
}

function RecentResults({ stats }: { stats: GameModeStatistics }) {
  return <div className="statistics-recent">
    <span>최근 경기</span>
    {stats.recentResults.length > 0
      ? <div>{stats.recentResults.map((result, index) =>
          <i className={result} key={`${result}-${index}`}>{resultLabels[result]}</i>)}</div>
      : <small>아직 완료한 판이 없습니다.</small>}
    {stats.nagari > 0 && <small>나가리 {stats.nagari}판 · 승률 계산 제외</small>}
  </div>;
}

function StatisticsDetailBody({ stats }: { stats: GameModeStatistics }) {
  return <div className="statistics-detail-body">
    <div className="statistics-money">
      <div><span>누적 정산</span><b className={stats.totalSettlement >= 0 ? 'positive' : 'negative'}>{formatMoney(stats.totalSettlement)}</b></div>
      <div><span>최고 한 판 수익</span><b>{formatMoney(stats.biggestWinAmount)}</b></div>
    </div>
    <ul>
      <RecordRow label="고 선언" total={stats.totalGoCount} maximum={stats.highestWinningGoCount} maximumLabel="최고 승리" />
      <RecordRow label="싹쓸이" total={stats.totalSweepCount} maximum={stats.maxSweepCount} />
      <RecordRow label="폭탄" total={stats.totalBombCount} maximum={stats.maxBombCount} />
      <RecordRow label="흔들기" total={stats.totalShakeCount} maximum={stats.maxShakeCount} />
      <RecordRow label="뻑" total={stats.totalPpeokCount} maximum={stats.maxPpeokCount} />
    </ul>
    <div className="statistics-special-wins">
      <span>첫 뻑 <b>{stats.openingPpeokCount}회</b></span>
      <span>삼뻑 승리 <b>{stats.threePpeokWins}회</b></span>
      <span>광박 승리 <b>{stats.gwangBakWins}판</b></span>
      <span>피박 승리 <b>{stats.piBakWins}판</b></span>
    </div>
    <p>{stats.specialStatsTrackedGames > 0
      ? `특수 기록은 통계 기능 적용 이후 완료한 ${formatNumber(stats.specialStatsTrackedGames)}판 기준입니다.`
      : '특수 기록은 다음 완료 판부터 누적됩니다.'}</p>
  </div>;
}

export default function GameStatisticsPanel({ stats, modeLabel, hero = false, showZeroStats = false }: GameStatisticsPanelProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  useEffect(() => {
    if (!detailOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [detailOpen]);
  if ((!stats || stats.totalGames === 0) && !showZeroStats) {
    return <section className="game-statistics empty" aria-label={`${modeLabel} 내 전적`}>
      <div><span>내 {modeLabel} 전적</span><strong>첫 기록을 만들어 보세요</strong></div>
      <p>한 판을 마치면 승률과 최고 점수, 재미 기록이 여기에 쌓입니다.</p>
    </section>;
  }
  const displayed = stats ?? EMPTY_STATS;

  return <section className={`game-statistics${hero ? ' hero-statistics' : ''}`} aria-label={`${modeLabel} 내 전적`}>
    <div className="statistics-heading">
      {!hero && <div><span>내 {modeLabel} 전적</span><strong>{formatNumber(displayed.totalGames)}판의 기록</strong></div>}
      <div className="statistics-heading-actions">
        {displayed.currentWinStreak > 0 && <em>현재 {displayed.currentWinStreak}연승 중</em>}
        {hero && <button type="button" onClick={() => setDetailOpen(true)}>재미 기록 보기</button>}
      </div>
    </div>
    <div className="statistics-overview">
      <div><span>승률</span><strong>{displayed.winRate.toFixed(1)}<small>%</small></strong></div>
      <div><span>승 · 패</span><strong>{displayed.wins}<small>승</small> {displayed.losses}<small>패</small></strong></div>
      <div><span>최고 점수</span><strong>{formatNumber(displayed.highestScore)}<small>점</small></strong></div>
      <div><span>최다 연승</span><strong>{displayed.longestWinStreak}<small>연승</small></strong></div>
    </div>
    {!hero && <><RecentResults stats={displayed} /><details className="statistics-details">
      <summary>재미 기록 자세히 보기</summary><StatisticsDetailBody stats={displayed} />
    </details></>}
    {hero && detailOpen && createPortal(<div className="statistics-dialog-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) setDetailOpen(false);
    }}>
      <section className="statistics-dialog" role="dialog" aria-modal="true" aria-label={`${modeLabel} 재미 기록`}>
        <header><div><span>내 {modeLabel} 전적</span><h2>재미 기록</h2></div><button type="button" aria-label="재미 기록 닫기" onClick={() => setDetailOpen(false)}>×</button></header>
        <RecentResults stats={displayed} />
        <StatisticsDetailBody stats={displayed} />
      </section>
    </div>, document.body)}
  </section>;
}
