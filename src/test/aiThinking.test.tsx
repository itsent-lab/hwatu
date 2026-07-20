import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AiThinkingIndicator from '../components/AiThinkingIndicator';
import { createAiThinkingPlan } from '../engine/ai/thinking';

describe('컴퓨터 상대 고민 시간', () => {
  it('일반 턴은 빠르게 두되 어려운 수는 최대 5초까지 고민한다', () => {
    const plan = createAiThinkingPlan('normal', 20260719, 8, 'turn', false, 10000);
    expect(plan.durationMs).toBeGreaterThanOrEqual(650);
    expect(plan.durationMs).toBeLessThanOrEqual(5000);
    expect(plan.endsAt).toBe(10000 + plan.durationMs);
  });

  it('어려운 수에서는 가끔 4~5초 동안 한 수 더 고민한다', () => {
    const plan = createAiThinkingPlan('normal', 1, 0, 'turn', false, 0);
    expect(plan.durationMs).toBeGreaterThanOrEqual(4000);
    expect(plan.durationMs).toBeLessThanOrEqual(5000);
    expect(plan.label).toContain('한 수 더');
  });

  it('고·스톱은 같은 조건의 일반 턴보다 더 오래 고민한다', () => {
    const turn = createAiThinkingPlan('hard', 7, 4, 'turn', false, 0);
    const decision = createAiThinkingPlan('hard', 7, 4, 'go-stop', false, 0);
    expect(decision.durationMs).toBeGreaterThan(turn.durationMs);
    expect(decision.label).toContain('고·스톱');
  });

  it('자동 치기 중에는 흐름을 위해 고민 시간을 짧게 제한한다', () => {
    const plan = createAiThinkingPlan('expert', 9, 18, 'turn', true, 0);
    expect(plan.durationMs).toBeGreaterThanOrEqual(520);
    expect(plan.durationMs).toBeLessThanOrEqual(700);
  });

  it('초 단위 없이 진행 막대만 상대 안내에 표시한다', () => {
    const html = renderToStaticMarkup(<AiThinkingIndicator plan={{ durationMs: 1300, endsAt: Date.now() + 1300, label: '낼 패를 고르는 중…' }} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('낼 패를 고르는 중');
    expect(html).toContain('--ai-thinking-duration:1300ms');
    expect(html).not.toContain('초');
  });

  it('게임판 중앙에는 어르신이 알아보기 쉬운 큰 고민 안내를 표시한다', () => {
    const html = renderToStaticMarkup(<AiThinkingIndicator placement="board" plan={{ durationMs: 2400, endsAt: Date.now() + 2400, label: '한 수 더 살펴보는 중…' }} />);
    expect(html).toContain('board-ai-thinking');
    expect(html).toContain('상대가 고르는 중');
    expect(html).not.toContain('초 남음');
  });
});
