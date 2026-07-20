import { beforeEach, describe, expect, it, vi } from 'vitest';

const response = (status: number, body: object) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' }
});

describe('로그인 API 복구', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('만료된 보안 토큰은 새로 발급받아 로그인을 한 번 다시 시도한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(200, { ok: true, data: { csrfToken: 'old-token' } }))
      .mockResolvedValueOnce(response(419, { ok: false, error: { code: 'CSRF_FAILED', message: '만료' } }))
      .mockResolvedValueOnce(response(200, { ok: true, data: { csrfToken: 'new-token' } }))
      .mockResolvedValueOnce(response(200, { ok: true, data: { id: 1, username: '가족' } }));
    vi.stubGlobal('fetch', fetchMock);
    const { login } = await import('../lib/api');

    await expect(login({ username: '가족', password: 'password', remember: true })).resolves.toMatchObject({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[1][1].headers['X-CSRF-TOKEN']).toBe('old-token');
    expect(fetchMock.mock.calls[3][1].headers['X-CSRF-TOKEN']).toBe('new-token');
  });

  it('백엔드가 늦게 준비되어도 성공할 때까지 로그인을 반복한다', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(response(200, { ok: true, data: { csrfToken: 'token' } }))
      .mockResolvedValueOnce(response(200, { ok: true, data: { id: 1, username: '가족' } }));
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
    const { login } = await import('../lib/api');
    const onRetry = vi.fn();

    const result = login({ username: '가족', password: 'password', remember: true }, { onRetry });
    const assertion = expect(result).resolves.toMatchObject({ id: 1 });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(onRetry).toHaveBeenCalledTimes(3);
  });

  it('로그인 대기 중 취소하면 반복을 즉시 중단한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    vi.useFakeTimers();
    const { login } = await import('../lib/api');
    const controller = new AbortController();
    const onRetry = vi.fn((attempt: number) => attempt === 2 && controller.abort());

    const result = login(
      { username: '가족', password: 'password', remember: true },
      { signal: controller.signal, onRetry }
    );
    const assertion = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('백엔드가 준비 중이면 로그인 요청을 자동으로 다시 시도한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(200, { ok: true, data: { csrfToken: 'token' } }))
      .mockResolvedValueOnce(new Response('Bad Gateway', { status: 502, headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(response(200, { ok: true, data: { id: 1, username: '가족' } }));
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
    const { login } = await import('../lib/api');

    const result = login({ username: '가족', password: 'password', remember: true });
    const assertion = expect(result).resolves.toMatchObject({ id: 1 });
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('비밀번호 오류는 자동 재시도하지 않는다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(200, { ok: true, data: { csrfToken: 'token' } }))
      .mockResolvedValueOnce(response(401, { ok: false, error: { code: 'LOGIN_FAILED', message: '아이디 또는 비밀번호가 올바르지 않습니다.' } }));
    vi.stubGlobal('fetch', fetchMock);
    const { login } = await import('../lib/api');

    await expect(login({ username: '가족', password: 'wrong-password', remember: true }))
      .rejects.toThrow('아이디 또는 비밀번호가 올바르지 않습니다.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('프로필 사진은 보안 토큰과 multipart 형식으로 전송한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(200, { ok: true, data: { csrfToken: 'profile-token' } }))
      .mockResolvedValueOnce(response(200, { ok: true, data: { id: 1, username: '가족', profileImageUrl: '/api/profile/image/1/123' } }));
    vi.stubGlobal('fetch', fetchMock);
    const { uploadProfileImage } = await import('../lib/api');
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], 'profile.jpg', { type: 'image/jpeg' });

    await expect(uploadProfileImage(file)).resolves.toMatchObject({ profileImageUrl: '/api/profile/image/1/123' });
    const options = fetchMock.mock.calls[1][1] as RequestInit;
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.headers as Record<string, string>)['X-CSRF-TOKEN']).toBe('profile-token');
    expect((options.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });
});
