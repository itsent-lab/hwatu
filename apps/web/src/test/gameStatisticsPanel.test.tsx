import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GameStatisticsPanel from '../components/GameStatisticsPanel';
import type { GameModeStatistics } from '../lib/types';

const stats: GameModeStatistics = {
  gameMode: 'matgo', totalGames: 42, wins: 26, losses: 13, nagari: 3, winRate: 66.7,
  highestScore: 42, longestWinStreak: 7, currentWinStreak: 2,
  totalSettlement: 128_000, biggestWinAmount: 42_000,
  recentResults: ['win', 'win', 'loss', 'nagari', 'win'], specialStatsTrackedGames: 12,
  totalGoCount: 18, highestWinningGoCount: 4, totalSweepCount: 8, maxSweepCount: 2,
  totalBombCount: 5, maxBombCount: 2, totalShakeCount: 7, maxShakeCount: 2,
  totalPpeokCount: 9, maxPpeokCount: 3, openingPpeokCount: 2, threePpeokWins: 1,
  piBakWins: 6, gwangBakWins: 3
};

describe('게임 모드 전적 패널', () => {
  it('기본 전적과 상세 재미 기록을 함께 제공한다', () => {
    const html = renderToStaticMarkup(<GameStatisticsPanel stats={stats} modeLabel="맞고" />);
    expect(html).toContain('66.7');
    expect(html).toContain('42판의 기록');
    expect(html).toContain('현재 2연승 중');
    expect(html).toContain('누적 18회');
    expect(html).toContain('+128,000냥');
    expect(html).toContain('삼뻑 승리');
  });

  it('전적이 없으면 첫 경기 안내를 표시한다', () => {
    const html = renderToStaticMarkup(<GameStatisticsPanel modeLabel="고스톱" />);
    expect(html).toContain('첫 기록을 만들어 보세요');
  });

  it('상단 통계 영역은 제목 없이 핵심 기록만 표시한다', () => {
    const html = renderToStaticMarkup(<GameStatisticsPanel modeLabel="맞고" hero showZeroStats />);
    expect(html).toContain('hero-statistics');
    expect(html).not.toContain('0판의 기록');
    expect(html).not.toContain('내 맞고 전적');
    expect(html).toContain('0.0');
    expect(html).toContain('재미 기록 보기');
    expect(html).not.toContain('첫 기록을 만들어 보세요');
  });
});
