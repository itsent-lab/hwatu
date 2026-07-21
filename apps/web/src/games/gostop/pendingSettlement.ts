import type { GostopSettlementRequest } from '../../lib/types';

const STORAGE_PREFIX = 'hwatu-gostop-pending-settlements';
const MAX_PENDING_SETTLEMENTS = 20;

const storageKey = (userId: number) => `${STORAGE_PREFIX}:${userId}`;

function isSettlement(value: unknown): value is GostopSettlementRequest {
  if (!value || typeof value !== 'object') return false;
  const request = value as Partial<GostopSettlementRequest>;
  const validWinner = request.winner === null || ['human', 'computerA', 'computerB'].includes(request.winner ?? '');
  const validPoints = [request.humanPoints, request.computerAPoints, request.computerBPoints]
    .every(points => points === undefined || Number.isInteger(points));
  const validResult = request.roundResult === undefined
    ? request.winner !== null && (request.finalScore ?? 0) > 0
    : request.roundResult === 'win'
    ? request.winner !== null && (request.finalScore ?? 0) > 0
    : request.roundResult === 'nagari' && request.winner === null && request.finalScore === 0;
  return typeof request.gameUuid === 'string'
    && validWinner
    && validResult
    && Number.isInteger(request.finalScore) && (request.finalScore ?? 0) >= 0
    && validPoints
    && [100, 1_000, 2_000, 5_000, 10_000].includes(request.pointValue ?? 0);
}

export function loadPendingGostopSettlements(userId: number): GostopSettlementRequest[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter(isSettlement).slice(-MAX_PENDING_SETTLEMENTS) : [];
  }
  catch {
    return [];
  }
}

export function enqueuePendingGostopSettlement(userId: number, request: GostopSettlementRequest): void {
  const pending = loadPendingGostopSettlements(userId).filter(item => item.gameUuid !== request.gameUuid);
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...pending, request].slice(-MAX_PENDING_SETTLEMENTS)));
  }
  catch {
    // 기기 저장이 제한되어도 서버 정산 요청은 계속 진행합니다.
  }
}

export function removePendingGostopSettlement(userId: number, gameUuid: string): void {
  const pending = loadPendingGostopSettlements(userId).filter(item => item.gameUuid !== gameUuid);
  try {
    if (pending.length === 0) localStorage.removeItem(storageKey(userId));
    else localStorage.setItem(storageKey(userId), JSON.stringify(pending));
  }
  catch {
    // 다음 접속 때 서버의 중복 방지 키로 안전하게 다시 정산합니다.
  }
}
