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

export interface MatchStatistics {
  version: 1;
  goCount: number;
  sweepCount: number;
  bombCount: number;
  shakeCount: number;
  ppeokCount: number;
  openingPpeokCount: number;
  threePpeokWin: boolean;
  piBakWin: boolean;
  gwangBakWin: boolean;
}

export interface GameModeStatistics {
  gameMode: 'matgo' | 'gostop';
  totalGames: number;
  wins: number;
  losses: number;
  nagari: number;
  winRate: number;
  highestScore: number;
  longestWinStreak: number;
  currentWinStreak: number;
  totalSettlement: number;
  biggestWinAmount: number;
  recentResults: Array<'win' | 'loss' | 'draw' | 'nagari'>;
  specialStatsTrackedGames: number;
  totalGoCount: number;
  highestWinningGoCount: number;
  totalSweepCount: number;
  maxSweepCount: number;
  totalBombCount: number;
  maxBombCount: number;
  totalShakeCount: number;
  maxShakeCount: number;
  totalPpeokCount: number;
  maxPpeokCount: number;
  openingPpeokCount: number;
  threePpeokWins: number;
  piBakWins: number;
  gwangBakWins: number;
}

export interface PlayerGameStatistics {
  matgo: GameModeStatistics;
  gostop: GameModeStatistics;
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
  statistics?: MatchStatistics;
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
