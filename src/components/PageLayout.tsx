import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../lib/api';
import { clearProfile } from '../lib/localStore';
import type { UserProfile } from '../lib/types';

export default function PageLayout({ user, children, pageClassName = '', onLogin }: { user?: UserProfile | null; children: ReactNode; pageClassName?: string; onLogin?: () => void }) {
  const navigate = useNavigate();
  const signOut = async () => {
    await logout().catch(() => undefined);
    await clearProfile().catch(() => undefined);
    navigate('/login', { replace: true });
  };
  return <div className={`site-page${pageClassName ? ` ${pageClassName}` : ''}`}>
    <header className="site-header">
      <Link className="brand" to="/home">가족화투</Link>
      <nav className="site-nav" aria-label="주 메뉴">
        {user && <>
          <span className="user-chip">{user.displayName} 님</span>
          {user.role === 'admin' && <Link to="/family">가족 회원</Link>}
          <button className="link-button" onClick={signOut}>로그아웃</button>
        </>}
        {!user && onLogin && <button type="button" className="link-button guest-login-button" onClick={onLogin}>로그인</button>}
      </nav>
    </header>
    <main className="page-shell">{children}</main>
    <footer className="site-footer">
      <nav className="footer-links" aria-label="서비스 정책 및 라이선스">
        <Link className="credit-link" to="/credits">화투 패 출처 및 라이선스</Link>
        <Link to="/privacy">개인정보 처리방침</Link>
        <Link to="/license">MIT 라이선스</Link>
      </nav>
    </footer>
  </div>;
}
