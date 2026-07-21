import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Loading from '../components/Loading';
import PageLayout from '../components/PageLayout';
import PointEntryButtons from '../components/PointEntryButtons';
import { dashboard, refillBalance } from '../lib/api';
import { savePointValue } from '../lib/gamePreferences';
import { saveProfile } from '../lib/localStore';
import { resetMatgoOpponentSession } from '../lib/opponentNames';
import type { UserProfile } from '../lib/types';

interface DashboardData {
  user: UserProfile;
  activeSave: { gameUuid: string; turnNumber: number; updatedAt: string } | null;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [refilling, setRefilling] = useState(false);
  const [refillError, setRefillError] = useState('');

  useEffect(() => {
    resetMatgoOpponentSession();
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1') {
      setData({
        user: { id: 0, username: 'preview', displayName: '어머니', role: 'member', virtualBalance: 136000 },
        activeSave: null
      });
      return;
    }
    dashboard().then(async result => {
      await saveProfile(result.user);
      setData(result);
    }).catch(() => navigate('/login', { replace: true }));
  }, [navigate]);

  if (!data) return <Loading />;
  const balanceEmpty = data.user.virtualBalance <= 0;
  const money = new Intl.NumberFormat('ko-KR').format(data.user.virtualBalance);
  const enterNewGame = (pointValue: Parameters<typeof savePointValue>[0]) => {
    savePointValue(pointValue);
    navigate('/matgo/play?action=new');
  };
  const refill = async () => {
    if (!balanceEmpty || refilling) return;
    setRefilling(true);
    setRefillError('');
    try {
      const result = await refillBalance();
      const user = { ...data.user, virtualBalance: result.balance };
      await saveProfile(user);
      setData(current => current ? { ...current, user } : current);
    }
    catch (error) {
      setRefillError(error instanceof Error ? error.message : '게임머니를 리필하지 못했습니다.');
    }
    finally { setRefilling(false); }
  };
  return <PageLayout user={data.user} pageClassName="dashboard-site-page">
    <section className="welcome-panel dashboard-welcome">
      <div className="welcome-copy">
        <h1>{data.user.displayName} 님, 한 판 즐겨볼까요?</h1>
        {balanceEmpty && <p>게임머니를 모두 사용했습니다. 여기에서 리필한 뒤 새 판을 시작하세요.</p>}
      </div>
      <div className={`balance-card dashboard-player-card${balanceEmpty ? ' balance-empty' : ''}`} aria-label={`${data.user.displayName}님의 게임머니 ${money}냥`}>
        <div className="dashboard-player-money"><span>내 게임머니</span><strong>{money}</strong><small>냥</small></div>
      </div>
      <div className="button-row dashboard-actions">
        {balanceEmpty ? <button className="primary-button refill-button" type="button" disabled={refilling} onClick={() => void refill()}>{refilling ? '리필 중…' : '게임머니 500,000냥 리필 받기'}</button> : <>
          {data.activeSave && <Link className="secondary-button" to="/matgo/play?action=continue">이어하기 · {data.activeSave.turnNumber}턴</Link>}
          <PointEntryButtons onEnter={enterNewGame} />
        </>}
        <div className="game-mode-back-row">
          <Link className="secondary-button game-mode-back-button" to="/home">게임 모드 선택으로 돌아가기</Link>
        </div>
        {refillError && <p className="form-error refill-error" role="alert">{refillError}</p>}
      </div>
    </section>
  </PageLayout>;
}
