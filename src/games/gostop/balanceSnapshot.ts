export interface GostopBalanceSnapshot {
  human: number;
  computerA: number;
  computerB: number;
}

const STORAGE_PREFIX = 'hwatu-gostop-balance-snapshot';
const MAX_BALANCE = 999_999_999_999;

const storageKey = (userId: number) => `${STORAGE_PREFIX}:${userId}`;
const isBalance = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_BALANCE;

function isSnapshot(value: unknown): value is GostopBalanceSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<GostopBalanceSnapshot>;
  return isBalance(snapshot.human) && isBalance(snapshot.computerA) && isBalance(snapshot.computerB);
}

export function loadGostopBalanceSnapshot(userId: number): GostopBalanceSnapshot | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) ?? 'null') as unknown;
    return isSnapshot(parsed) ? parsed : null;
  }
  catch {
    return null;
  }
}

export function saveGostopBalanceSnapshot(userId: number, snapshot: GostopBalanceSnapshot): void {
  if (!isSnapshot(snapshot)) return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(snapshot));
  }
  catch {
    // 서버 저장은 계속 진행하고 기기 저장만 생략합니다.
  }
}
