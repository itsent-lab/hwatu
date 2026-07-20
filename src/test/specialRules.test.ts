import { describe, expect, it } from 'vitest';
import { applyBonusPeeCapture, evaluateChongtong, findBombOptions, findShakeOptions, isThreePpeok, stealPeeCards, stealPeeForBonus } from '../engine/rules/specialRules';

describe('뉴맞고 특수 규칙', () => {
  it('손패 2장과 바닥 2장으로 두장폭탄을 허용한다', () => {
    const options = findBombOptions(['m01-01', 'm01-02'], ['m01-03', 'm01-04']);
    expect(options[0]?.kind).toBe('two-card-bomb');
  });

  it('손패 3장과 바닥 1장으로 일반 폭탄을 허용한다', () => {
    const options = findBombOptions(['m02-01', 'm02-02', 'm02-03'], ['m02-04']);
    expect(options[0]?.kind).toBe('three-card-bomb');
  });

  it('손패 같은 월 3장에 맞는 바닥패가 없으면 흔들기를 허용한다', () => {
    const options = findShakeOptions(['m03-01', 'm03-02', 'm03-03'], ['m01-01']);
    expect(options).toEqual([{ month: 3, handCardIds: ['m03-01', 'm03-02', 'm03-03'] }]);
    expect(findShakeOptions(['m03-01', 'm03-02', 'm03-03'], ['m03-04'])).toHaveLength(0);
    expect(findShakeOptions(['m03-01', 'm03-02', 'm03-03'], [], [3])).toHaveLength(0);
  });

  it('바닥 총통과 양쪽 총통은 나가리다', () => {
    expect(evaluateChongtong([], [], ['m03-01', 'm03-02', 'm03-03', 'm03-04']).kind).toBe('nagari');
    expect(evaluateChongtong(['m01-01', 'm01-02', 'm01-03', 'm01-04'], ['m02-01', 'm02-02', 'm02-03', 'm02-04'], []).kind).toBe('nagari');
  });

  it('한쪽 총통은 4장 흔들기 후 폭탄 진행이 가능하다', () => {
    const result = evaluateChongtong(['m01-01', 'm01-02', 'm01-03', 'm01-04'], [], []);
    expect(result.kind).toBe('player-choice');
    expect(result.canShakeFour).toBe(true);
    expect(result.canBombAfterContinue).toBe(true);
  });

  it('보너스피 획득 시 상대의 일반 피를 우선 한 장 가져온다', () => {
    const result = stealPeeForBonus(['m11-02', 'm01-03', 'm02-03']);
    expect(result.stolenCardId).toBe('m01-03');
    expect(result.remaining).toEqual(['m11-02', 'm02-03']);
  });

  it('보너스피와 빼앗은 피를 획득 패에 함께 넣는다', () => {
    const result = applyBonusPeeCapture([], ['m01-03'], 'bonus-pee-1');
    expect(result.actorCaptured).toEqual(['bonus-pee-1', 'm01-03']);
    expect(result.opponentCaptured).toEqual([]);
  });

  it('상대 피를 뺏을 때 삼피보다 더 작은 일반 피를 먼저 가져온다', () => {
    const result = stealPeeForBonus(['bonus-double-pee-1', 'm11-02', 'm03-03']);
    expect(result.stolenCardId).toBe('m03-03');
  });

  it('일반 피가 없으면 쌍피 한 장을 통째로 가져온다', () => {
    const result = stealPeeForBonus(['m11-02']);
    expect(result.stolenCardId).toBe('m11-02');
    expect(result.remaining).toEqual([]);
  });

  it('자뻑처럼 피 두 장을 뺏을 때도 낮은 가치의 피부터 순서대로 가져온다', () => {
    const result = stealPeeCards(['bonus-double-pee-1', 'm01-03', 'm02-03'], 2);
    expect(result.stolenCardIds).toEqual(['m01-03', 'm02-03']);
    expect(result.remaining).toEqual(['bonus-double-pee-1']);
  });

  it('세 번째 뻑을 판정한다', () => {
    expect(isThreePpeok(2)).toBe(false);
    expect(isThreePpeok(3)).toBe(true);
  });
});
