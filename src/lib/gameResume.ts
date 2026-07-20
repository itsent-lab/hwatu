import type { GameState } from '../engine/types';

export function chooseLatestGame(local: GameState | null, server: GameState | null): GameState | null {
  if (!local) return server;
  if (!server) return local;
  if (local.gameUuid !== server.gameUuid) {
    const localCreatedAt = Date.parse(local.createdAt);
    const serverCreatedAt = Date.parse(server.createdAt);
    if (Number.isFinite(localCreatedAt) && Number.isFinite(serverCreatedAt) && localCreatedAt !== serverCreatedAt) {
      return serverCreatedAt > localCreatedAt ? server : local;
    }
  }
  return server.turnNumber > local.turnNumber ? server : local;
}

export function shouldResumeSavedGame(state: GameState): boolean {
  return state.phase === 'round-ended' || state.startingPlayerConfirmed !== false || state.turnNumber > 0;
}
