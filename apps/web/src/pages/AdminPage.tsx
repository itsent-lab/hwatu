import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loading from '../components/Loading';
import PageLayout from '../components/PageLayout';
import { changeUserPassword, createUser, listUsers, session, toggleUser } from '../lib/api';
import type { FamilyUser, UserProfile } from '../lib/types';

export default function AdminPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<FamilyUser[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => setUsers(await listUsers()), []);
  useEffect(() => {
    session().then(async result => {
      if (result.user.role !== 'admin') return navigate('/home', { replace: true });
      setMe(result.user);
      await refresh();
    }).catch(() => navigate('/login', { replace: true }));
  }, [navigate, refresh]);

  const addMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await createUser({ username: values.get('username'), displayName: values.get('displayName'), password: values.get('password') });
      form.reset(); setNotice('가족 계정을 만들었습니다.'); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '계정을 만들지 못했습니다.'); }
    finally { setBusy(false); }
  };

  const changeStatus = async (user: FamilyUser) => {
    if (!confirm(`${user.displayName} 계정을 ${user.isActive ? '중지' : '사용'} 상태로 바꿀까요?`)) return;
    setError('');
    try { await toggleUser(user.id); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '상태를 바꾸지 못했습니다.'); }
  };

  const resetPassword = async (user: FamilyUser) => {
    const password = prompt(`${user.displayName} 님의 새 비밀번호를 입력하세요. (15자 이상)`);
    if (!password) return;
    setError(''); setNotice('');
    try { await changeUserPassword(user.id, password); setNotice(`${user.displayName} 님의 비밀번호를 변경했습니다.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '비밀번호를 바꾸지 못했습니다.'); }
  };

  if (!me) return <Loading />;
  return <PageLayout user={me}>
    <div className="page-heading"><div><p className="eyebrow">관리자 전용</p><h1>가족 회원 관리</h1></div><p>계정별 저장 판과 게임머니는 독립적으로 관리됩니다.</p></div>
    {error && <div className="alert alert-error">{error}</div>}
    {notice && <div className="alert alert-success">{notice}</div>}
    <section className="admin-grid">
      <article className="panel-card">
        <h2>가족 계정 추가</h2>
        <form className="stack-form" onSubmit={addMember}>
          <label>아이디 (한글 가능, 3자 이상)<input name="username" required minLength={3} maxLength={30} pattern="[가-힣a-z0-9_]+" title="한글, 영문 소문자, 숫자, 밑줄로 3~30자 입력해 주세요." autoCapitalize="none" /></label>
          <label>화면에 보일 이름<input name="displayName" required maxLength={20} /></label>
          <label>첫 비밀번호 (15자 이상)<input name="password" type="password" required minLength={15} maxLength={128} /></label>
          <button className="primary-button" disabled={busy}>{busy ? '추가 중…' : '가족 계정 추가'}</button>
        </form>
      </article>
      <section className="panel-card member-panel">
        <h2>등록된 가족 <span className="count-badge">{users.length}</span></h2>
        <div className="member-list">
          {users.map(user => <article className={`member-row${user.isActive ? '' : ' inactive'}`} key={user.id}>
            <div className="member-avatar">{user.displayName.slice(0, 1)}</div>
            <div className="member-info"><strong>{user.displayName}</strong><span>@{user.username} · {user.role === 'admin' ? '관리자' : '가족'}</span><small>최근 로그인 {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ko-KR') : '없음'}</small></div>
            <span className={`status-badge ${user.isActive ? 'on' : 'off'}`}>{user.isActive ? '사용 중' : '중지'}</span>
            <div className="member-actions">
              <button className="text-button" onClick={() => resetPassword(user)}>비밀번호</button>
              <button className="text-button danger" disabled={user.id === me.id} onClick={() => changeStatus(user)}>{user.isActive ? '중지' : '사용'}</button>
            </div>
          </article>)}
        </div>
      </section>
    </section>
  </PageLayout>;
}
