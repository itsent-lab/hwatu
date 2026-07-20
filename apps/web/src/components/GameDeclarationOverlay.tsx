import type { CSSProperties } from 'react';

export type DeclarationKind = 'go' | 'stop' | 'score' | 'settlement' | 'capture' | 'ppeok' | 'ppeok-chain' | 'ppeok-triple' | 'bomb' | 'shake' | 'bonus' | 'double-pee' | 'triple-pee' | 'mission' | 'jjok' | 'ttadak' | 'sweep' | 'ppeok-capture' | 'self-ppeok';

export interface DeclarationEffect {
  id: number;
  kind: DeclarationKind;
  text: string;
  detail?: string;
  peeBurstValue?: 2 | 3;
  peeBurstText?: string;
}

export default function GameDeclarationOverlay({ effect }: { effect: DeclarationEffect }) {
  const peeBurstValue = effect.peeBurstValue
    ?? (effect.kind === 'triple-pee' ? 3 : effect.kind === 'double-pee' ? 2 : null);
  const ppeokChain = effect.kind === 'ppeok-triple' ? 3 : effect.kind === 'ppeok-chain' ? 2 : 0;
  const fiveGo = effect.kind === 'go' && Number.parseInt(effect.text, 10) >= 5;
  return <div className={`game-declaration declaration-${effect.kind}${fiveGo ? ' five-go-celebration' : ''}`} role="status" aria-live="assertive">
    {fiveGo && <div className="five-go-fireworks" aria-hidden="true">{Array.from({ length: 36 }, (_, index) => {
      const burst = Math.floor(index / 12);
      const angle = index % 12 * 30;
      const distance = 18 + index % 4 * 3;
      return <i key={index} style={{ '--firework-x': `${[22, 50, 78][burst]}%`, '--firework-y': `${[42, 24, 42][burst]}%`, '--firework-dx': `${Math.cos(angle * Math.PI / 180) * distance}vw`, '--firework-dy': `${Math.sin(angle * Math.PI / 180) * distance}vh`, '--firework-delay': `${burst * .12 + index % 3 * .025}s`, '--firework-color': ['#fff15a', '#ff4d6d', '#5de7ff', '#ff9f35'][index % 4] } as CSSProperties} />;
    })}</div>}
    {ppeokChain > 0 && <div className="ppeok-impact-rings" aria-hidden="true">{Array.from({ length: ppeokChain }, (_, index) => <i key={index} />)}</div>}
    <div className="declaration-sparks" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
    {peeBurstValue && <div className="pee-burst-cards" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index}><b>{peeBurstValue}</b><small>피</small></i>)}</div>}
    <strong>{effect.text}</strong>
    {effect.peeBurstText && <em className="pee-transfer-banner">{effect.peeBurstText}</em>}
    {effect.detail && <span>{effect.detail}</span>}
  </div>;
}
