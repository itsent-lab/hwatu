export type PpeokDeclarationKind = 'ppeok' | 'ppeok-chain' | 'ppeok-triple';

export interface PpeokDeclaration {
  count: 1 | 2 | 3;
  kind: PpeokDeclarationKind;
  text: string;
  detail: string;
  duration: number;
}

export function getPpeokDeclaration(count: number): PpeokDeclaration {
  if (count >= 3) return { count: 3, kind: 'ppeok-triple', text: '삼연뻑!', detail: '세 번째 뻑 · 기본 7점 즉시 승리', duration: 1750 };
  if (count === 2) return { count: 2, kind: 'ppeok-chain', text: '연속뻑!', detail: '두 번째 뻑 · 한 번 더면 기본 7점 승리', duration: 1350 };
  return { count: 1, kind: 'ppeok', text: '뻑!', detail: '첫 번째 뻑 · 바닥에 세 장 남김', duration: 950 };
}
