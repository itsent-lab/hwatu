import { describe, expect, it } from 'vitest';
import { createInitialGame, chooseStartingPlayer } from '../engine/gameState';
import { chooseLatestGame, shouldResumeSavedGame } from '../lib/gameResume';

describe('진행 중인 판 이어치기', () => {
  it('선공을 고르기 전인 새 판은 시작 선택 화면을 유지한다', () => {
    expect(shouldResumeSavedGame(createInitialGame(20260719))).toBe(false);
  });

  it('선공을 정한 저장 판은 아직 첫 패를 내지 않았어도 바로 이어진다', () => {
    const game = chooseStartingPlayer(createInitialGame(20260719), 'human');
    expect(game.turnNumber).toBe(0);
    expect(shouldResumeSavedGame(game)).toBe(true);
  });

  it('이전 형식의 진행 중 저장 판도 턴 수를 보고 바로 이어진다', () => {
    const game = createInitialGame(20260719);
    game.turnNumber = 3;
    game.startingPlayerConfirmed = false;
    expect(shouldResumeSavedGame(game)).toBe(true);
  });

  it('서버의 오래된 판보다 기기에서 최근 시작한 판을 이어간다', () => {
    const server = createInitialGame(20260718);
    server.turnNumber = 8;
    server.createdAt = '2026-07-18T10:00:00.000Z';
    const local = createInitialGame(20260719);
    local.createdAt = '2026-07-19T10:00:00.000Z';

    expect(chooseLatestGame(local, server)?.gameUuid).toBe(local.gameUuid);
  });

  it('같은 판이면 더 많이 진행된 저장 상태를 이어간다', () => {
    const local = createInitialGame(20260719);
    const server = structuredClone(local);
    server.turnNumber = 4;

    expect(chooseLatestGame(local, server)?.turnNumber).toBe(4);
  });
});
