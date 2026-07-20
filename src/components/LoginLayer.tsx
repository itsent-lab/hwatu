import { type FormEvent, useEffect, useRef, useState } from 'react';
import { login } from '../lib/api';

interface LoginLayerProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginLayer({ onClose, onSuccess }: LoginLayerProps) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const loginAbort = useRef<AbortController | null>(null);

  useEffect(() => () => loginAbort.current?.abort(), []);

  const close = () => {
    loginAbort.current?.abort();
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError(''); setRetryCount(0);
    const form = new FormData(event.currentTarget);
    const controller = new AbortController();
    loginAbort.current = controller;
    try {
      await login(
        { username: form.get('username'), password: form.get('password'), remember: form.get('remember') === 'on' },
        { signal: controller.signal, onRetry: setRetryCount }
      );
      onSuccess();
    }
    catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setRetryCount(0); setError(reason instanceof Error ? reason.message : '로그인하지 못했습니다.'); setBusy(false);
    }
  };

  return <div className="login-layer-backdrop" role="presentation">
    <section className="login-layer-panel" role="dialog" aria-modal="true" aria-labelledby="login-layer-title">
      <button type="button" className="login-layer-close" aria-label="로그인 창 닫기" onClick={close}>×</button>
      <div className="login-layer-heading">
        <h1 id="login-layer-title">로그인</h1>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {retryCount > 0 && !error && <div className="alert alert-waiting" role="status">서버 준비를 기다리고 있습니다. 자동 재시도 {retryCount}회</div>}
      <form className="login-layer-form" onSubmit={submit}>
        <label>아이디<input name="username" required autoFocus autoComplete="username" autoCapitalize="none" /></label>
        <label>비밀번호<input type="password" name="password" required autoComplete="current-password" /></label>
        <label className="check-row"><input type="checkbox" name="remember" defaultChecked /><span>이 기기에서 로그인 유지</span></label>
        <button type="submit" className="primary-button" disabled={busy}>{retryCount > 0 ? '서버 연결 대기 중…' : busy ? '확인 중…' : '로그인하고 입장하기'}</button>
      </form>
    </section>
  </div>;
}
