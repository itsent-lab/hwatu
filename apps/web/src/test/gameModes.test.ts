import { describe, expect, it } from 'vitest';
import { GAME_MODES } from '../gameModes';

describe('화투 게임 모드 구분', () => {
  it('맞고는 독립 로비로 입장할 수 있다', () => {
    expect(GAME_MODES.find(mode => mode.id === 'matgo')).toMatchObject({
      players: '2인',
      path: '/matgo',
      status: 'playable'
    });
  });

  it('고스톱은 규칙 확정 전까지 계획 모드로 유지된다', () => {
    expect(GAME_MODES.find(mode => mode.id === 'gostop')).toMatchObject({
      players: '3인',
      path: '/gostop',
      status: 'planning'
    });
  });
});
