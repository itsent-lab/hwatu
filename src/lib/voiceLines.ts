export type SpecialVoiceKind = 'jjok' | 'ttadak' | 'sweep' | 'ppeok-capture' | 'self-ppeok';

const specialLines: Record<SpecialVoiceKind, readonly [string, string]> = {
  jjok: ['쪽! 잡았다!', '쪽! 약 오르지?'],
  ttadak: ['따닥! 딱 걸렸어!', '따닥! 딱 걸렸지?'],
  sweep: ['싹쓸이! 다 내 거!', '싹쓸이! 하나도 없지?'],
  'ppeok-capture': ['싼 패! 가져간다!', '싼 패! 잘 먹을게!'],
  'self-ppeok': ['자뻑! 좋았어!', '자뻑! 운도 좋지!']
};

export const voiceLines = {
  capture: (opponent: boolean) => opponent ? '딱! 내가 잡았지!' : '딱! 잡았다!',
  bonusPee: (name: string, opponent: boolean) => opponent ? `${name}! 부럽지?` : `${name}다! 좋았어!`,
  peeTransfer: (name: string, stolenByOpponent: boolean) => stolenByOpponent ? `${name} 가져간다!` : `${name} 뺏기! 잡았다!`,
  ppeok: (opponent: boolean, count = 1) => count >= 3 ? '삼연뻑! 판 끝났다!' : count === 2 ? '연속뻑! 한 번 남았다!' : opponent ? '뻑! 잘한다!' : '뻑! 아깝다!',
  bomb: (opponent: boolean) => opponent ? '폭탄이다! 제대로 맞아라!' : '폭탄이다! 받아라!',
  shake: '흔들었다! 두 배 간다!',
  special: (kind: SpecialVoiceKind, opponent: boolean) => specialLines[kind][opponent ? 1 : 0],
  mission: (multiplier: number, opponent: boolean) => opponent ? `미션 ${multiplier}배! 어쩔 수 없지?` : `미션 ${multiplier}배! 크게 간다!`,
  score: (label: string, score: number, opponent: boolean) => opponent ? `${label}! ${score}점! 따라와 봐!` : `${label}! ${score}점이다!`,
  go: (goCount: number) => goCount >= 5 ? `${goCount}고! 축포다! 끝까지 간다!` : goCount >= 3 ? `${goCount}고! 어디까지 가나 보자!` : '고! 더 가자!',
  stop: '스톱! 여기까지!',
  win: (finalScore: number) => `좋았어! ${finalScore}점 승리!`,
  lose: (bakLabels: string[]) => bakLabels.length ? `${bakLabels.join(', ')}! 제대로 걸렸네!` : '내가 이겼지!',
  nagari: '나가리! 다시 붙어!',
  start: '시작! 한 판 붙어 보자!'
} as const;
