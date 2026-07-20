import type { CSSProperties } from 'react';

export default function DealAnimation() {
  return <div className="deal-animation" aria-hidden="true">
    <i className="deal-source-deck"><span>花</span></i>
    <strong>패를 나누고 있습니다</strong>
    {Array.from({ length: 20 }, (_, index) => {
      const handIndex = Math.floor(index / 2);
      const target = index % 2 === 0 ? 'computer' : 'human';
      return <i
      className={`deal-card-back deal-to-${target}`}
      key={index}
      style={{
        '--deal-offset': `${(handIndex - 4.5) * (target === 'human' ? 54 : 23)}px`,
        '--deal-rotate': `${(handIndex - 4.5) * (target === 'human' ? 2.8 : 1.2)}deg`,
        animationDelay: `${index * 43}ms`
      } as CSSProperties}
    ><span>花</span></i>;
    })}
  </div>;
}
