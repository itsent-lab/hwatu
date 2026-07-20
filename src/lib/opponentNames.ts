const OPPONENT_NAMES = [
  '김영숙', '이정희', '박순자', '최경자', '정미자', '강영희',
  '조옥순', '윤정자', '장명숙', '임순희', '한정숙', '오경희',
  '서미숙', '신영자', '권순옥', '황정희', '안영숙', '송미자',
  '김영수', '이정호', '박성호', '최상철', '정영일', '강태수',
  '조경수', '윤재호', '장성민', '임동수', '한기철', '오상호',
  '서정식', '신광수', '권영호', '황병철', '안재수', '송정남'
] as const;

export function opponentNameForGame(gameUuid: string): string {
  let hash = 0x811c9dc5;
  for (const character of gameUuid) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return OPPONENT_NAMES[(hash >>> 0) % OPPONENT_NAMES.length];
}
