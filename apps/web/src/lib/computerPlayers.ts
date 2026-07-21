import { useRef } from 'react';
import type { VoiceActor } from './audio';

export type ComputerPlayerSlot = 'computerA' | 'computerB';
export interface ComputerPlayerProfile {
  name: string;
  actionLabel: string;
  icon: string;
  voiceActor: VoiceActor;
}
export type GostopComputerPlayers = Record<ComputerPlayerSlot, ComputerPlayerProfile>;

const GOSTOP_OPPONENT_SESSION_KEY = 'hwatu.gostop.opponent-session';

export const VOICE_ACTOR_NAMES: Readonly<Record<VoiceActor, string>> = Object.freeze({
  player: '사용자',
  opponent: '이정호',
  matgoFemale: '김영숙',
  gostopComputerA: '이서윤',
  gostopComputerB: '박영수',
  gostopComputerC: '최동철',
  gostopComputerD: '한서진'
});

export function voiceActorDisplayName(voiceActor: VoiceActor, userDisplayName: string): string {
  return voiceActor === 'player' ? userDisplayName : VOICE_ACTOR_NAMES[voiceActor];
}

const COMPUTER_VOICE_PROFILES = Object.freeze([
  Object.freeze({ name: VOICE_ACTOR_NAMES.gostopComputerA, actionLabel: '이서윤이', icon: '🐶', voiceActor: 'gostopComputerA' as VoiceActor }),
  Object.freeze({ name: VOICE_ACTOR_NAMES.gostopComputerB, actionLabel: '박영수', icon: '🐯', voiceActor: 'gostopComputerB' as VoiceActor }),
  Object.freeze({ name: VOICE_ACTOR_NAMES.gostopComputerC, actionLabel: '최동철이', icon: '🐻', voiceActor: 'gostopComputerC' as VoiceActor }),
  Object.freeze({ name: VOICE_ACTOR_NAMES.matgoFemale, actionLabel: '김영숙이', icon: '🐱', voiceActor: 'matgoFemale' as VoiceActor }),
  Object.freeze({ name: VOICE_ACTOR_NAMES.opponent, actionLabel: '이정호', icon: '🦊', voiceActor: 'opponent' as VoiceActor }),
  Object.freeze({ name: VOICE_ACTOR_NAMES.gostopComputerD, actionLabel: '한서진이', icon: '🦋', voiceActor: 'gostopComputerD' as VoiceActor })
]);

export const COMPUTER_PLAYERS = Object.freeze({
  computerA: COMPUTER_VOICE_PROFILES[0],
  computerB: COMPUTER_VOICE_PROFILES[1]
});

export const MATGO_OPPONENTS = COMPUTER_VOICE_PROFILES;

function hashText(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function gostopComputerPlayersForSession(sessionId: string): GostopComputerPlayers {
  const hash = hashText(sessionId);
  const firstIndex = hash % COMPUTER_VOICE_PROFILES.length;
  const secondOffset = 1 + ((hash >>> 8) % (COMPUTER_VOICE_PROFILES.length - 1));
  return {
    computerA: COMPUTER_VOICE_PROFILES[firstIndex],
    computerB: COMPUTER_VOICE_PROFILES[(firstIndex + secondOffset) % COMPUTER_VOICE_PROFILES.length]
  };
}

export function getGostopOpponentSessionId(): string {
  try {
    const stored = window.sessionStorage.getItem(GOSTOP_OPPONENT_SESSION_KEY);
    if (stored) return stored;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(GOSTOP_OPPONENT_SESSION_KEY, created);
    return created;
  }
  catch {
    return crypto.randomUUID();
  }
}

export function resetGostopOpponentSession() {
  try { window.sessionStorage.removeItem(GOSTOP_OPPONENT_SESSION_KEY); }
  catch { /* 저장소를 사용할 수 없으면 현재 화면 생명주기만 사용 */ }
}

export function useGostopComputerPlayers(): GostopComputerPlayers {
  const playersRef = useRef<GostopComputerPlayers | null>(null);
  playersRef.current ??= gostopComputerPlayersForSession(getGostopOpponentSessionId());
  return playersRef.current;
}

export function computerPlayerName(player: ComputerPlayerSlot, players: GostopComputerPlayers = COMPUTER_PLAYERS): string {
  return voiceActorDisplayName(players[player].voiceActor, '');
}

export function computerPlayerActionLabel(player: ComputerPlayerSlot, players: GostopComputerPlayers = COMPUTER_PLAYERS): string {
  return players[player].actionLabel;
}
