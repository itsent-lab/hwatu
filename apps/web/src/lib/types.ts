import type { GameState } from '../engine/types';

export interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'member';
  virtualBalance: number;
  opponentBalance?: number;
  gostopComputerABalance?: number;
  gostopComputerBBalance?: number;
  profileImageUrl?: string | null;
}

export interface GostopSettlementResult {
  gameUuid: string;
  balance: number;
  computerABalance: number;
  computerBBalance: number;
  settlementAmount: number;
  settlementApplied: boolean;
}

export interface GostopSettlementRequest {
  gameUuid: string;
  roundResult?: 'win' | 'nagari';
  winner: 'human' | 'computerA' | 'computerB' | null;
  finalScore: number;
  pointValue: number;
  humanPoints?: number;
  computerAPoints?: number;
  computerBPoints?: number;
}

export interface SessionData {
  user: UserProfile;
  csrfToken: string;
  deviceId: string;
}

export interface ServerGameSave {
  gameUuid: string;
  gameMode: 'matgo';
  stateVersion: number;
  turnNumber: number;
  state: GameState;
  updatedAt: string;
}

export interface SaveGameResult {
  gameUuid: string;
  turnNumber: number;
  savedAt: string;
  balance: number;
  opponentBalance: number;
  settlementAmount: number;
  settlementApplied: boolean;
  opponentRefilled?: boolean;
  opponentBalanceAfterSettlement?: number;
}

export interface FamilyUser extends UserProfile {
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
