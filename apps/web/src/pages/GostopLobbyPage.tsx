import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GameStatisticsPanel from '../components/GameStatisticsPanel';
import Loading from '../components/Loading';
import PageLayout from '../components/PageLayout';
import PointEntryButtons from '../components/PointEntryButtons';
import { loadGostopBalanceSnapshot, saveGostopBalanceSnapshot } from '../games/gostop/balanceSnapshot';
import { DEFAULT_GOSTOP_COMPUTER_BALANCE } from '../games/gostop/money';
import { loadPendingGostopSettlements, removePendingGostopSettlement } from '../games/gostop/pendingSettlement';
import type { GostopPointValue } from '../games/gostop/settings';
import { dashboard, refillBalance, settleGostopRound } from '../lib/api';
import { resetGostopOpponentSession } from '../lib/computerPlayers';
import { saveGostopPointValue } from '../lib/gamePreferences';
import { saveProfile } from '../lib/localStore';
import type { GameModeStatistics, UserProfile } from '../lib/types';

export default function GostopLobbyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [gameStats, setGameStats] = useState<GameModeStatistics | null>(null);
  const [refilling, setRefilling] = useState(false);
  const [refillError, setRefillError] = useState('');

  useEffect(() => {
    resetGostopOpponentSession();
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1') {
      setUser({ id: 0, username: 'preview', displayName: '어머니', role: 'member', virtualBalance: 136000 });
      return;
    }
    dashboard().then(async result => {
      const pendingSettlements = loadPendingGostopSettlements(result.user.id);
      const balanceSnapshot = loadGostopBalanceSnapshot(result.user.id);
      for (const pending of pendingSettlements) {
        try {
          await settleGostopRound(pending);
          removePendingGostopSettlement(result.user.id, pending.gameUuid);
        }
        catch {
          break;
        }
      }
      if (pendingSettlements.length > 0) result = await dashboard();
      const remainingSettlements = loadPendingGostopSettlements(result.user.id);
      if (remainingSettlements.length > 0 && balanceSnapshot) {
        result = {
          ...result,
          user: {
            ...result.user,
            virtualBalance: balanceSnapshot.human,
            gostopComputerABalance: balanceSnapshot.computerA,
            gostopComputerBBalance: balanceSnapshot.computerB
          }
        };
      }
      else {
        saveGostopBalanceSnapshot(result.user.id, {
          human: result.user.virtualBalance,
          computerA: result.user.gostopComputerABalance ?? DEFAULT_GOSTOP_COMPUTER_BALANCE,
          computerB: result.user.gostopComputerBBalance ?? DEFAULT_GOSTOP_COMPUTER_BALANCE
        });
      }
      await saveProfile(result.user);
      setUser(result.user);
      setGameStats(result.gameStats.gostop);
    }).catch(() => navigate('/login', { replace: true }));
  }, [navigate]);

  if (!user) return <Loading message="고스톱 로비를 불러오고 있습니다" />;
  const money = new Intl.NumberFormat('ko-KR').format(user.virtualBalance);
  const balanceEmpty = user.virtualBalance <= 0;
  const enterRoom = (next: GostopPointValue) => {
    saveGostopPointValue(next);
    navigate('/gostop/play?action=new');
  };
  const refill = async () => {
    if (!balanceEmpty || refilling) return;
    setRefilling(true);
    setRefillError('');
    try {
      const result = await refillBalance();
      const updated = { ...user, virtualBalance: result.balance };
      saveGostopBalanceSnapshot(user.id, {
        human: result.balance,
        computerA: user.gostopComputerABalance ?? DEFAULT_GOSTOP_COMPUTER_BALANCE,
        computerB: user.gostopComputerBBalance ?? DEFAULT_GOSTOP_COMPUTER_BALANCE
      });
      await saveProfile(updated);
      setUser(updated);
    }
    catch (error) {
      setRefillError(error instanceof Error ? error.message : '게임머니를 리필하지 못했습니다.');
    }
    finally { setRefilling(false); }
  };

  return <PageLayout user={user} pageClassName="dashboard-site-page">
    <section className="welcome-panel dashboard-welcome">
      <GameStatisticsPanel stats={gameStats} modeLabel="고스톱" hero showZeroStats />
      <div className={`balance-card dashboard-player-card${balanceEmpty ? ' balance-empty' : ''}`} aria-label={`${user.displayName}님의 게임머니 ${money}냥`}>
        <div className="dashboard-player-money"><span>내 게임머니</span><strong>{money}</strong><small>냥</small></div>
      </div>
      <div className="button-row dashboard-actions">
        {balanceEmpty
          ? <button className="primary-button refill-button" type="button" disabled={refilling} onClick={() => void refill()}>{refilling ? '리필 중…' : '게임머니 500,000냥 리필 받기'}</button>
          : <PointEntryButtons ariaLabel="고스톱 점당 금액을 고르고 입장하세요" onEnter={enterRoom} />}
        <div className="game-mode-back-row">
          <Link className="secondary-button game-mode-back-button" to="/home">게임 모드 선택으로 돌아가기</Link>
        </div>
        {refillError && <p className="form-error refill-error" role="alert">{refillError}</p>}
      </div>
    </section>
  </PageLayout>;
}
