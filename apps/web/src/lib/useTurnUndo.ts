import { useCallback, useRef } from 'react';
import type { GameState } from '../engine/types';

export const MAX_TURN_UNDOS = 3;

export function remainingTurnUndos(state: GameState) {
  return Math.max(0, MAX_TURN_UNDOS - (state.humanUndoCount ?? 0));
}

export function restoreTurnCheckpoint(checkpoint: GameState, current: GameState): GameState | null {
  if (checkpoint.gameUuid !== current.gameUuid || current.phase === 'round-ended' || remainingTurnUndos(current) <= 0) return null;
  const restored = structuredClone(checkpoint);
  restored.humanUndoCount = (current.humanUndoCount ?? 0) + 1;
  restored.lastAction = `마지막 수를 물렀습니다. 이번 판 ${remainingTurnUndos(restored)}회 남았습니다.`;
  return restored;
}

export function useTurnUndo() {
  const checkpointRef = useRef<GameState | null>(null);

  const capture = useCallback((state: GameState) => {
    if (state.phase === 'round-ended' || remainingTurnUndos(state) <= 0) return;
    const checkpoint = checkpointRef.current;
    if (checkpoint?.gameUuid === state.gameUuid && checkpoint.turnNumber === state.turnNumber) return;
    checkpointRef.current = structuredClone(state);
  }, []);

  const clear = useCallback(() => { checkpointRef.current = null; }, []);
  const canUndo = useCallback((state: GameState) => {
    const checkpoint = checkpointRef.current;
    return Boolean(checkpoint && checkpoint.gameUuid === state.gameUuid && state.phase !== 'round-ended' && remainingTurnUndos(state) > 0);
  }, []);
  const restore = useCallback((state: GameState) => {
    const checkpoint = checkpointRef.current;
    if (!checkpoint) return null;
    const restored = restoreTurnCheckpoint(checkpoint, state);
    if (restored) checkpointRef.current = null;
    return restored;
  }, []);

  return { capture, clear, canUndo, restore };
}
