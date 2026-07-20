import { describe, expect, it } from 'vitest';
import { createInitialGame } from '../engine/gameState';
import { MAX_TURN_UNDOS, remainingTurnUndos, restoreTurnCheckpoint } from '../lib/useTurnUndo';

describe('판당 무르기', () => {
  it('저장한 턴으로 돌아가면서 사용 횟수는 되돌리지 않는다', () => {
    const checkpoint = createInitialGame(20260720, 'normal', 100, 'human');
    checkpoint.humanUndoCount = 1;
    const current = structuredClone(checkpoint);
    current.turnNumber = 2;
    current.humanUndoCount = 1;
    current.lastAction = '패를 냈습니다.';

    const restored = restoreTurnCheckpoint(checkpoint, current)!;

    expect(restored.turnNumber).toBe(0);
    expect(restored.humanUndoCount).toBe(2);
    expect(remainingTurnUndos(restored)).toBe(1);
    expect(restored.lastAction).toContain('1회 남았습니다');
  });

  it('한 판에서 세 번을 모두 사용하면 더 이상 무를 수 없다', () => {
    const checkpoint = createInitialGame(20260720, 'normal', 100, 'human');
    const current = structuredClone(checkpoint);
    current.humanUndoCount = MAX_TURN_UNDOS;

    expect(remainingTurnUndos(current)).toBe(0);
    expect(restoreTurnCheckpoint(checkpoint, current)).toBeNull();
  });

  it('다른 판의 저장 지점과 이미 끝난 판은 복원하지 않는다', () => {
    const checkpoint = createInitialGame(20260720, 'normal', 100, 'human');
    const otherRound = createInitialGame(20260721, 'normal', 100, 'human');
    expect(restoreTurnCheckpoint(checkpoint, otherRound)).toBeNull();
    checkpoint.phase = 'round-ended';
    expect(restoreTurnCheckpoint(checkpoint, checkpoint)).toBeNull();
  });
});
