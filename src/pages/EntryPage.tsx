import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginLayer from '../components/LoginLayer';
import Loading from '../components/Loading';
import PageLayout from '../components/PageLayout';
import { session, setupStatus } from '../lib/api';

export default function EntryPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [loginOpen, setLoginOpen] = useState(true);
  useEffect(() => {
    (async () => {
      if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'guest') {
        setChecking(false); setLoginOpen(true); return;
      }
      const status = await setupStatus();
      if (status.needsBootstrap) return navigate('/bootstrap', { replace: true });
      try {
        await session();
        navigate('/home', { replace: true });
      } catch {
        setChecking(false); setLoginOpen(true);
      }
    })().catch(() => { setChecking(false); setLoginOpen(true); });
  }, [navigate]);
  if (checking) return <Loading />;
  return <PageLayout pageClassName="dashboard-site-page entry-site-page" onLogin={() => setLoginOpen(true)}>
    <section className="welcome-panel dashboard-welcome entry-welcome">
      <div className="welcome-copy">
        <p className="eyebrow">가족 전용 맞고</p>
        <h1>편안하게 한 판 즐겨볼까요?</h1>
        <p>가족마다 게임머니와 진행 중인 판이 따로 저장됩니다. 내 계정으로 로그인해 이어서 즐겨보세요.</p>
        <button type="button" className="primary-button entry-login-button" onClick={() => setLoginOpen(true)}>로그인하고 입장하기</button>
      </div>
      <div className="entry-card-display" aria-hidden="true"><span>花</span><span>農</span><b>가족 맞고</b></div>
    </section>
    {loginOpen && <LoginLayer onClose={() => setLoginOpen(false)} onSuccess={() => navigate('/home', { replace: true })} />}
  </PageLayout>;
}
