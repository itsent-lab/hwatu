import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialGame } from '../engine/gameState';
import { createGostopRoom } from '../games/gostop/gameState';
import { getGostopOpponentSessionId, gostopComputerPlayersForSession, resetGostopOpponentSession, voiceActorDisplayName, VOICE_ACTOR_NAMES } from '../lib/computerPlayers';
import { getMatgoOpponentSessionId, opponentNameForGame, opponentProfileForSession, resetMatgoOpponentSession } from '../lib/opponentNames';

describe('컴퓨터 상대 이름', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('모든 음색에 성별과 역할에 맞는 고유 이름을 부여한다', () => {
    expect(VOICE_ACTOR_NAMES).toEqual({
      player: '사용자',
      opponent: '이정호',
      matgoFemale: '김영숙',
      gostopComputerA: '이서윤',
      gostopComputerB: '박영수',
      gostopComputerC: '최동철',
      gostopComputerD: '한서진'
    });
    expect(voiceActorDisplayName('player', '어머니')).toBe('어머니');
    expect(voiceActorDisplayName('gostopComputerC', '어머니')).toBe('최동철');
  });

  it('같은 판에서는 항상 같은 이름을 사용한다', () => {
    const gameUuid = '44b5331b-f506-4a21-9f04-1666ab76387b';
    expect(opponentNameForGame(gameUuid)).toBe(opponentNameForGame(gameUuid));
    expect(['이서윤', '박영수', '최동철', '김영숙', '이정호', '한서진']).toContain(opponentNameForGame(gameUuid));
  });

  it('맞고 입장마다 이름이 부여된 여섯 상대 음성 중 하나를 선택한다', () => {
    const names = new Set(Array.from({ length: 300 }, (_, index) => opponentNameForGame(`44b5331b-f506-4a21-9f04-${String(index).padStart(12, '0')}`)));
    expect(names).toEqual(new Set(['이서윤', '박영수', '최동철', '김영숙', '이정호', '한서진']));
  });

  it('맞고 입장 세션 동안 이름과 음성을 함께 고정한다', () => {
    const sessionId = 'matgo-session-20260721';
    expect(opponentProfileForSession(sessionId)).toEqual(opponentProfileForSession(sessionId));
  });

  it('새로고침에는 세션을 유지하고 각 대기실 진입 시 초기화한다', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', { sessionStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    } });
    const first = getMatgoOpponentSessionId();
    expect(getMatgoOpponentSessionId()).toBe(first);
    expect(opponentProfileForSession(getMatgoOpponentSessionId())).toEqual(opponentProfileForSession(first));
    resetMatgoOpponentSession();
    expect(getMatgoOpponentSessionId()).not.toBe(first);
    const gostopFirst = getGostopOpponentSessionId();
    expect(getGostopOpponentSessionId()).toBe(gostopFirst);
    expect(gostopComputerPlayersForSession(getGostopOpponentSessionId())).toEqual(gostopComputerPlayersForSession(gostopFirst));
    resetGostopOpponentSession();
    expect(getGostopOpponentSessionId()).not.toBe(gostopFirst);
  });

  it('각 이름은 맞고와 고스톱에서 같은 전용 음성을 사용한다', () => {
    const profiles = Array.from({ length: 300 }, (_, index) => opponentProfileForSession(`session-${index}`));
    expect(profiles.find(profile => profile.name === '이서윤')?.voiceActor).toBe('gostopComputerA');
    expect(profiles.find(profile => profile.name === '박영수')?.voiceActor).toBe('gostopComputerB');
    expect(profiles.find(profile => profile.name === '최동철')?.voiceActor).toBe('gostopComputerC');
    expect(profiles.find(profile => profile.name === '김영숙')?.voiceActor).toBe('matgoFemale');
    expect(profiles.find(profile => profile.name === '이정호')?.voiceActor).toBe('opponent');
    expect(profiles.find(profile => profile.name === '한서진')?.voiceActor).toBe('gostopComputerD');
  });

  it('고스톱 입장마다 여섯 캐릭터 중 두 음성을 무작위 배치하고 중복하지 않는다', () => {
    const selectedNames = new Set<string>();
    const arrangements = new Set(Array.from({ length: 300 }, (_, index) => {
      const players = gostopComputerPlayersForSession(`gostop-session-${index}`);
      expect(players.computerA.voiceActor).not.toBe(players.computerB.voiceActor);
      selectedNames.add(players.computerA.name);
      selectedNames.add(players.computerB.name);
      return `${players.computerA.name}/${players.computerB.name}`;
    }));
    expect(selectedNames).toEqual(new Set(['이서윤', '박영수', '최동철', '김영숙', '이정호', '한서진']));
    expect(arrangements.size).toBe(30);
    const middleAged = Array.from({ length: 300 }, (_, index) => gostopComputerPlayersForSession(`gostop-session-${index}`))
      .find(players => players.computerA.name === '최동철')!;
    expect(createGostopRoom(308, 100, 1, 'computerA', middleAged).lastAction).toContain('최동철이가 선');
  });

  it('AI 판단용 난수값이 달라져도 판 고유번호가 같으면 이름이 유지된다', () => {
    const game = createInitialGame(20260719);
    const beforeMove = opponentNameForGame(game.gameUuid);
    game.randomSeed = 13579;
    const afterMove = opponentNameForGame(game.gameUuid);
    expect(afterMove).toBe(beforeMove);
  });
});
