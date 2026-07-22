import type { GameState } from '../engine/types';
import type { FamilyUser, GostopSettlementRequest, GostopSettlementResult, SaveGameResult, ServerGameSave, SessionData, UserProfile } from './types';

interface ApiEnvelope<T> {
  ok: boolean;
  data: T;
  error?: { code: string; message: string };
}

let csrfToken = '';
const LOGIN_RETRY_MAX_DELAY_MS = 5000;

type RequestError = Error & { status?: number; code?: string };

interface LoginRetryOptions {
  signal?: AbortSignal;
  onRetry?: (attempt: number) => void;
}

function isTransientRequestError(error: RequestError): boolean {
  return error.code === 'NETWORK_ERROR' || [500, 502, 503, 504].includes(error.status ?? 0);
}

function loginRetryDelay(attempt: number): number {
  return Math.min(500 * (2 ** Math.min(attempt - 1, 4)), LOGIN_RETRY_MAX_DELAY_MS);
}

function wait(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new DOMException('로그인 재시도를 중단했습니다.', 'AbortError'));
  return new Promise((resolve, reject) => {
    const abort = () => {
      globalThis.clearTimeout(timer);
      reject(new DOMException('로그인 재시도를 중단했습니다.', 'AbortError'));
    };
    const timer = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, delayMs);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...options,
      headers: { Accept: 'application/json', ...(options.headers ?? {}) }
    });
  }
  catch (reason) {
    if (reason instanceof DOMException && reason.name === 'AbortError') throw reason;
    const error = new Error('서버에 연결하지 못했습니다. 잠시 후 다시 눌러 주세요.');
    Object.assign(error, { code: 'NETWORK_ERROR' });
    throw error;
  }
  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.ok) {
    const error = new Error(payload?.error?.message ?? '서버 요청을 처리하지 못했습니다.');
    Object.assign(error, { status: response.status, code: payload?.error?.code });
    throw error;
  }
  return payload.data;
}

export async function ensureCsrf(signal?: AbortSignal): Promise<string> {
  if (csrfToken) return csrfToken;
  const result = await request<{ csrfToken: string }>('/api/auth/csrf', { signal });
  csrfToken = result.csrfToken;
  return csrfToken;
}

async function write<T>(path: string, method: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = await ensureCsrf(signal);
    try {
      return await request<T>(path, {
        method,
        signal,
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    }
    catch (reason) {
      const error = reason as Error & { status?: number; code?: string };
      if (attempt === 0 && (error.status === 419 || error.code === 'CSRF_FAILED')) {
        csrfToken = '';
        continue;
      }
      throw reason;
    }
  }
  throw new Error('요청을 다시 처리하지 못했습니다.');
}

export const setupStatus = () => request<{ needsBootstrap: boolean; bootstrapEnabled: boolean }>('/api/auth/status');
export const bootstrapAdmin = (body: object) => write<UserProfile>('/api/auth/bootstrap', 'POST', body);
export async function login(body: object, options: LoginRetryOptions = {}): Promise<UserProfile> {
  let attempt = 0;
  while (true) {
    try {
      return await write<UserProfile>('/api/auth/login', 'POST', body, options.signal);
    }
    catch (reason) {
      const error = reason as RequestError;
      if (!isTransientRequestError(error)) throw reason;
      attempt += 1;
      options.onRetry?.(attempt);
      await wait(loginRetryDelay(attempt), options.signal);
    }
  }
}
export const logout = () => write<null>('/api/auth/logout', 'POST');

export async function session(): Promise<SessionData> {
  const result = await request<SessionData>('/api/session');
  csrfToken = result.csrfToken;
  return result;
}

export const dashboard = () => request<{
  user: UserProfile;
  activeSave: { gameUuid: string; turnNumber: number; updatedAt: string } | null;
  today: { games: number; wins: number; settlement: number };
  gameStats: import('./types').PlayerGameStatistics;
}>('/api/dashboard');
export const refillBalance = () => write<{ balance: number }>('/api/balance/refill', 'POST');

export async function uploadProfileImage(file: File): Promise<UserProfile> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = await ensureCsrf();
    const form = new FormData();
    form.append('image', file);
    try {
      return await request<UserProfile>('/api/profile/image', {
        method: 'PUT',
        headers: { 'X-CSRF-TOKEN': token },
        body: form
      });
    }
    catch (reason) {
      const error = reason as RequestError;
      if (attempt === 0 && (error.status === 419 || error.code === 'CSRF_FAILED')) {
        csrfToken = '';
        continue;
      }
      throw reason;
    }
  }
  throw new Error('프로필 사진을 저장하지 못했습니다.');
}

export const listUsers = () => request<FamilyUser[]>('/api/users');
export const createUser = (body: object) => write<{ id: number }>('/api/users', 'POST', body);
export const toggleUser = (id: number) => write<null>(`/api/users/${id}/status`, 'PATCH');
export const changeUserPassword = (id: number, password: string) => write<null>(`/api/users/${id}/password`, 'PUT', { password });
export const loadMatgoServerGame = () => request<ServerGameSave | null>('/api/games/matgo');
export async function saveMatgoServerGame(sessionData: SessionData, state: GameState): Promise<SaveGameResult> {
  const result = await write<SaveGameResult & { virtualBalance?: number; balanceAfter?: number }>('/api/games/matgo', 'PUT', {
    gameUuid: state.gameUuid,
    gameMode: state.gameMode,
    stateVersion: state.stateVersion,
    turnNumber: state.turnNumber,
    deviceId: sessionData.deviceId,
    state
  });
  const balance = Number(result.balance ?? result.virtualBalance ?? result.balanceAfter);
  const opponentBalance = Number(result.opponentBalance);
  const opponentBalanceAfterSettlement = Number(result.opponentBalanceAfterSettlement ?? opponentBalance);
  if (!Number.isFinite(balance) || !Number.isFinite(opponentBalance)) throw new Error('서버 게임머니 응답이 올바르지 않습니다.');
  return { ...result, balance, opponentBalance, opponentBalanceAfterSettlement };
}

export async function settleGostopRound(body: GostopSettlementRequest): Promise<GostopSettlementResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await write<GostopSettlementResult>('/api/games/gostop/settle', 'POST', body);
    }
    catch (reason) {
      const error = reason as RequestError;
      if (!isTransientRequestError(error) || attempt === 2) throw reason;
      await wait(loginRetryDelay(attempt + 1));
    }
  }
  throw new Error('고스톱 게임머니를 저장하지 못했습니다.');
}
