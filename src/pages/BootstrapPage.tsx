import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { bootstrapAdmin, setupStatus } from '../lib/api';

export default function BootstrapPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setupStatus().then(status => !status.needsBootstrap && navigate('/login', { replace: true })); }, [navigate]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      await bootstrapAdmin({ username: form.get('username'), displayName: form.get('displayName'), password: form.get('password'), passwordConfirm: form.get('passwordConfirm') });
      navigate('/home', { replace: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : '관리자 계정을 만들지 못했습니다.'); setBusy(false); }
  };
  return <PageLayout><section className="auth-card">
    <p className="eyebrow">가족 전용 첫 설정</p><h1>관리자 계정을 만들어 주세요</h1>
    <p className="auth-description">첫 계정을 만든 다음 공개 가입은 닫히고, 관리자가 가족 계정을 추가합니다.</p>
    {error && <div className="alert alert-error">{error}</div>}
    <form className="stack-form" onSubmit={submit}>
      <label>아이디 (한글 가능, 3자 이상)<input name="username" required minLength={3} maxLength={30} pattern="[가-힣a-z0-9_]+" title="한글, 영문 소문자, 숫자, 밑줄로 3~30자 입력해 주세요." /></label>
      <label>화면에 보일 이름<input name="displayName" required maxLength={20} /></label>
      <label>비밀번호 (4자 이상)<input type="password" name="password" required minLength={4} maxLength={128} /></label>
      <label>비밀번호 확인<input type="password" name="passwordConfirm" required minLength={4} maxLength={128} /></label>
      <button className="primary-button" disabled={busy}>{busy ? '만드는 중…' : '관리자 계정 만들기'}</button>
    </form>
  </section></PageLayout>;
}
