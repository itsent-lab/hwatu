import { describe, expect, it } from 'vitest';
import { createCardMission, evaluateCardMission, missionMultiplierFor } from '../engine/rules/missions';

describe('뉴맞고 각패 미션', () => {
  it('매 판 일반 화투패 세 장을 중복 없이 결정한다', () => {
    const first = createCardMission(20260719);
    const repeated = createCardMission(20260719);
    expect(first).toEqual(repeated);
    expect(first.cardIds).toHaveLength(3);
    expect(new Set(first.cardIds)).toHaveLength(3);
    expect(first.cardIds.every(cardId => !cardId.startsWith('bonus-'))).toBe(true);
  });

  it('미션패를 한 장씩 획득할 때마다 2배·4배·8배로 증가한다', () => {
    const mission = { kind: 'gakpae' as const, cardIds: ['m01-01', 'm02-01', 'm03-01'] };
    expect(evaluateCardMission(mission, [], []).humanMultiplier).toBe(1);
    expect(evaluateCardMission(mission, ['m01-01'], []).humanMultiplier).toBe(2);
    expect(evaluateCardMission(mission, ['m01-01', 'm02-01'], []).humanMultiplier).toBe(4);
    expect(missionMultiplierFor(mission, mission.cardIds, [], 'human')).toBe(8);
  });

  it('양쪽이 획득한 미션패는 각자의 배율로 따로 계산한다', () => {
    const mission = { kind: 'gakpae' as const, cardIds: ['m01-01', 'm02-01', 'm03-01'] };
    const progress = evaluateCardMission(mission, ['m01-01', 'm02-01'], ['m03-01']);
    expect(progress.humanMultiplier).toBe(4);
    expect(progress.computerMultiplier).toBe(2);
  });
});
