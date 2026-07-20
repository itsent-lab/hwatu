import type { CSSProperties } from 'react';

const TARGETS = ['computer-a', 'computer-b', 'human'] as const;

export default function GostopDealAnimation() {
  return <div className="deal-animation gostop-deal-animation" aria-hidden="true">
    <i className="deal-source-deck"><span>花</span></i>
    <strong>세 사람에게 패를 나누고 있습니다</strong>
    {Array.from({ length: 21 }, (_, index) => {
      const target = TARGETS[index % TARGETS.length];
      const handIndex = Math.floor(index / TARGETS.length);
      return <i
        className={`deal-card-back gostop-deal-to-${target}`}
        key={index}
        style={{ '--gostop-deal-offset': `${(handIndex - 3) * 20}px`, animationDelay: `${index * 48}ms` } as CSSProperties}
      ><span>花</span></i>;
    })}
  </div>;
}
