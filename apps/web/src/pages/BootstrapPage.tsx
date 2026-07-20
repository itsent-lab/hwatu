import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { bootstrapAdmin, setupStatus } from '../lib/api';

export default function BootstrapPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bootstrapEnabled, setBootstrapEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    setupStatus().then(status => {
      if (!status.needsBootstrap) navigate('/login', { replace: true });
      else setBootstrapEnabled(status.bootstrapEnabled);
    }).catch(() => setError('서버의 초기 설정 상태를 확인하지 못했습니다.'));
  }, [navigate]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      await bootstrapAdmin({ setupToken: form.get('setupToken'), username: form.get('username'), displayName: form.get('displayName'), password: form.get('password'), passwordConfirm: form.get('passwordConfirm') });
      navigate('/home', { replace: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : '관리자 계정을 만들지 못했습니다.'); setBusy(false); }
  };
  return <PageLayout><section className="auth-card">
    <p className="eyebrow">가족 전용 첫 설정</p><h1>관리자 계정을 만들어 주세요</h1>
    <p className="auth-description">첫 계정은 서버에 설정한 32자 이상의 일회성 초기 설정 토큰이 있어야 만들 수 있습니다.</p>
    {bootstrapEnabled === false && <div className="alert alert-error">서버의 <code>Bootstrap:Token</code>을 먼저 설정해 주세요.</div>}
    {error && <div className="alert alert-error">{error}</div>}
    <form className="stack-form" onSubmit={submit}>
      <label>초기 설정 토큰<input type="password" name="setupToken" required minLength={32} autoComplete="off" disabled={bootstrapEnabled !== true} /></label>
      <label>아이디 (한글 가능, 3자 이상)<input name="username" required minLength={3} maxLength={30} pattern="[가-힣a-z0-9_]+" title="한글, 영문 소문자, 숫자, 밑줄로 3~30자 입력해 주세요." /></label>
      <label>화면에 보일 이름<input name="displayName" required maxLength={20} /></label>
      <label>비밀번호 (15자 이상)<input type="password" name="password" required minLength={15} maxLength={128} /></label>
      <label>비밀번호 확인<input type="password" name="passwordConfirm" required minLength={15} maxLength={128} /></label>
      <button className="primary-button" disabled={busy || bootstrapEnabled !== true}>{busy ? '만드는 중…' : '관리자 계정 만들기'}</button>
    </form>
  </section></PageLayout>;
}
