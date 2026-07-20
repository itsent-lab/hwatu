import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GostopPointRooms from '../components/GostopPointRooms';
import Loading from '../components/Loading';
import PageLayout from '../components/PageLayout';
import type { GostopPointValue } from '../games/gostop/settings';
import { dashboard } from '../lib/api';
import { saveGostopPointValue } from '../lib/gamePreferences';
import { saveProfile } from '../lib/localStore';
import type { UserProfile } from '../lib/types';

export default function GostopLobbyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1') {
      setUser({ id: 0, username: 'preview', displayName: '어머니', role: 'member', virtualBalance: 136000 });
      return;
    }
    dashboard().then(async result => {
      await saveProfile(result.user);
      setUser(result.user);
    }).catch(() => navigate('/login', { replace: true }));
  }, [navigate]);

  if (!user) return <Loading message="고스톱 로비를 불러오고 있습니다" />;
  const money = new Intl.NumberFormat('ko-KR').format(user.virtualBalance);
  const enterRoom = (next: GostopPointValue) => {
    saveGostopPointValue(next);
    navigate('/gostop/play?action=new');
  };

  return <PageLayout user={user} pageClassName="dashboard-site-page gostop-lobby-page">
    <section className="gostop-lobby-panel">
      <header className="gostop-lobby-heading">
        <span>3인 고스톱</span>
        <h1>{user.displayName} 님, 점당 금액을 골라 주세요</h1>
        <div className="gostop-balance"><span>내 게임머니</span><strong>{money}</strong><small>냥</small></div>
      </header>
      <GostopPointRooms disabled={user.virtualBalance <= 0} onEnter={enterRoom} />
      <div className="game-mode-back-row">
        <Link className="secondary-button game-mode-back-button" to="/home">게임 모드 선택으로 돌아가기</Link>
      </div>
    </section>
  </PageLayout>;
}
