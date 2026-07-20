export const GAME_MODES = [
  {
    id: 'matgo',
    name: '맞고',
    players: '2인',
    description: '지금 즐기고 있는 가족 맞고',
    path: '/matgo',
    status: 'playable'
  },
  {
    id: 'gostop',
    name: '고스톱',
    players: '3인',
    description: '가족 규칙부터 천천히 다듬는 중',
    path: '/gostop',
    status: 'planning'
  }
] as const;

export type GameMode = (typeof GAME_MODES)[number]['id'];
