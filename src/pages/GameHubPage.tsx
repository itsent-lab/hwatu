import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Loading from '../components/Loading';
import PageLayout from '../components/PageLayout';
import { GAME_MODES } from '../gameModes';
import { dashboard } from '../lib/api';
import { saveProfile } from '../lib/localStore';
import type { UserProfile } from '../lib/types';

interface GameHubData {
  user: UserProfile;
  activeSave: { gameUuid: string; turnNumber: number; updatedAt: string } | null;
}

export default function GameHubPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<GameHubData | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1') {
      setData({
        user: { id: 0, username: 'preview', displayName: '어머니', role: 'member', virtualBalance: 136000 },
        activeSave: { gameUuid: 'preview', turnNumber: 12, updatedAt: new Date().toISOString() }
      });
      return;
    }
    dashboard().then(async result => {
      await saveProfile(result.user);
      setData(result);
    }).catch(() => navigate('/login', { replace: true }));
  }, [navigate]);

  if (!data) return <Loading message="화투 놀이를 불러오고 있습니다" />;

  return <PageLayout user={data.user} pageClassName="dashboard-site-page game-hub-page">
    <section className="game-hub-panel">
      <header className="game-hub-heading">
        <span>가족 화투 놀이</span>
        <h1>{data.user.displayName} 님, 어떤 게임을 할까요?</h1>
      </header>
      <div className="game-mode-grid">
        {GAME_MODES.map(mode => <Link key={mode.id} className={`game-mode-card ${mode.id} ${mode.status}`} to={mode.path}>
              <span className="game-mode-players">{mode.players}</span>
              <strong>{mode.name}</strong>
              <small>{mode.description}</small>
              <b>{mode.id === 'matgo' && data.activeSave ? `저장된 ${data.activeSave.turnNumber}턴 있음` : '입장하기'}</b>
            </Link>)}
      </div>
    </section>
  </PageLayout>;
}
