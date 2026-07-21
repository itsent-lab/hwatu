import { useRef } from 'react';
import type { VoiceActor } from './audio';
import { MATGO_OPPONENTS } from './computerPlayers';
const MATGO_OPPONENT_SESSION_KEY = 'hwatu.matgo.opponent-session';

export interface MatgoOpponentProfile {
  name: string;
  voiceActor: VoiceActor;
}

export function opponentProfileForSession(sessionId: string): MatgoOpponentProfile {
  let hash = 0x811c9dc5;
  for (const character of sessionId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return MATGO_OPPONENTS[(hash >>> 0) % MATGO_OPPONENTS.length];
}

export function opponentNameForGame(gameUuid: string): string {
  return opponentProfileForSession(gameUuid).name;
}

export function getMatgoOpponentSessionId(): string {
  try {
    const stored = window.sessionStorage.getItem(MATGO_OPPONENT_SESSION_KEY);
    if (stored) return stored;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(MATGO_OPPONENT_SESSION_KEY, created);
    return created;
  }
  catch {
    return crypto.randomUUID();
  }
}

export function resetMatgoOpponentSession() {
  try { window.sessionStorage.removeItem(MATGO_OPPONENT_SESSION_KEY); }
  catch { /* 저장소를 사용할 수 없으면 현재 화면 생명주기만 사용 */ }
}

export function useMatgoOpponent(): MatgoOpponentProfile {
  const opponentRef = useRef<MatgoOpponentProfile | null>(null);
  opponentRef.current ??= opponentProfileForSession(getMatgoOpponentSessionId());
  return opponentRef.current;
}
