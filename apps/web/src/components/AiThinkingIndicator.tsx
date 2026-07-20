import type { CSSProperties } from 'react';
import type { AiThinkingPlan } from '../engine/ai/thinking';

interface AiThinkingIndicatorProps {
  plan: AiThinkingPlan;
  placement?: 'panel' | 'board';
}

export default function AiThinkingIndicator({ plan, placement = 'panel' }: AiThinkingIndicatorProps) {
  const style = { '--ai-thinking-duration': `${plan.durationMs}ms` } as CSSProperties;
  return <div className={`ai-thinking-indicator${placement === 'board' ? ' board-ai-thinking' : ''}`} role="status" aria-label={plan.label} style={style}>
    {placement === 'board' && <b className="board-thinking-title">상대가 고르는 중</b>}
    <div><span>{plan.label}</span></div>
    <i aria-hidden="true"><b /></i>
  </div>;
}
