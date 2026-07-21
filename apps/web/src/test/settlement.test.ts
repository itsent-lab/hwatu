import { describe, expect, it } from 'vitest';
import { calculateCapturedScore } from '../engine/rules/scoring';
import { calculateGoMultiplier, calculateSettlement } from '../engine/rules/settlement';
import { matgoRulesForPointValue } from '../engine/rules/settings';

const score = (ids: string[]) => calculateCapturedScore(ids);

describe('고와 박 정산', () => {
  it('1고·2고는 점수를 더하고 3고부터 두 배씩 증가한다', () => {
    expect(calculateGoMultiplier(1)).toBe(1);
    expect(calculateGoMultiplier(2)).toBe(1);
    expect(calculateGoMultiplier(3)).toBe(2);
    expect(calculateGoMultiplier(4)).toBe(4);
    expect(calculateSettlement({ winnerScore: score(['m01-01', 'm03-01', 'm08-01', 'm11-01']), loserScore: score(['m02-01', 'm12-01']), winnerGoCount: 3 }).steps[2].value).toBe(14);
  });

  it('피박·광박·멍박은 각각 두 배이며 중첩된다', () => {
    const junk = ['m01-03', 'm01-04', 'm02-03', 'm02-04', 'm03-03', 'm03-04', 'm04-03', 'm04-04', 'm05-03', 'm05-04'];
    const animals = ['m02-01', 'm04-01', 'm05-01', 'm06-01', 'm07-01', 'm08-02', 'm09-01'];
    const winner = score([...junk, ...animals, 'm01-01', 'm03-01', 'm08-01']);
    const loser = score(['m06-03', 'm06-04']);
    const result = calculateSettlement({ winnerScore: winner, loserScore: loser, winnerGoCount: 0 });
    expect(result.baks.map(bak => bak.code)).toEqual(['pi-bak', 'gwang-bak', 'meong-bak']);
    expect(result.bakMultiplier).toBe(8);
  });

  it('패자의 피가 0장이면 피박이 아니고 승자의 열끗이 7장 미만이면 멍박이 아니다', () => {
    const junk = ['m01-03', 'm01-04', 'm02-03', 'm02-04', 'm03-03', 'm03-04', 'm04-03', 'm04-04', 'm05-03', 'm05-04'];
    const result = calculateSettlement({ winnerScore: score(junk), loserScore: score([]), winnerGoCount: 0 });
    expect(result.baks).toEqual([]);
  });

  it('패자가 획득한 패가 없으면 점수는 유지하고 게임머니 지급만 면제한다', () => {
    const result = calculateSettlement({
      winnerScore: score(['m01-02', 'm02-02', 'm03-02']),
      loserScore: score([]),
      winnerGoCount: 0,
      loserCapturedCount: 0
    });
    expect(result.finalScore).toBe(3);
    expect(result.displayAmount).toBe(0);
    expect(result.paymentExempt).toBe(true);
  });

  it('오광은 상대 광 보유와 무관하게 광박이다', () => {
    const winner = score(['m01-01', 'm03-01', 'm08-01', 'm11-01', 'm12-01']);
    const loser = score(['m02-01', 'm01-03', 'm01-04', 'm02-03', 'm02-04', 'm03-03', 'm03-04', 'm04-03']);
    const result = calculateSettlement({ winnerScore: winner, loserScore: loser, winnerGoCount: 0 });
    expect(result.baks.some(bak => bak.code === 'gwang-bak')).toBe(true);
  });

  it('고를 선언한 뒤 상대가 스톱하면 고박이다', () => {
    const winner = score(['m01-01', 'm03-01', 'm08-01']);
    const loser = score(['m01-02', 'm02-02', 'm03-02', 'm02-01']);
    const result = calculateSettlement({ winnerScore: winner, loserScore: loser, winnerGoCount: 0, loserGoCount: 1 });
    expect(result.baks.some(bak => bak.code === 'go-bak')).toBe(true);
  });

  it('계산 과정을 기본점수→고 배수→흔들기·폭탄→미션→박 배수 순서로 반환한다', () => {
    const result = calculateSettlement({ winnerScore: score(['m01-01', 'm03-01', 'm08-01']), loserScore: score(['m02-01']), winnerGoCount: 1 });
    expect(result.steps.map(step => step.label)).toEqual(['기본점수', '고 점수', '고 배수', '흔들기·폭탄', '미션 배수', '박 배수']);
    expect(result.isRealCurrency).toBe(false);
    expect(result.isExchangeable).toBe(false);
  });

  it('흔들기나 폭탄 한 번마다 최종 박 적용 전 점수가 두 배가 된다', () => {
    const options = {
      winnerScore: score(['m01-01', 'm03-01', 'm08-01']),
      loserScore: score(['m02-01']),
      winnerGoCount: 0
    };
    const normal = calculateSettlement(options);
    const shaken = calculateSettlement({ ...options, winnerShakeCount: 1 });
    expect(shaken.shakeMultiplier).toBe(2);
    expect(shaken.finalScore).toBe(normal.finalScore * 2);
  });

  it('미션 배수는 흔들기·폭탄 다음, 박 배수 전에 적용한다', () => {
    const options = {
      winnerScore: score(['m01-01', 'm03-01', 'm08-01']),
      loserScore: score(['m02-01']),
      winnerGoCount: 0
    };
    const normal = calculateSettlement(options);
    const mission = calculateSettlement({ ...options, winnerMissionMultiplier: 4 });
    expect(mission.missionMultiplier).toBe(4);
    expect(mission.finalScore).toBe(normal.finalScore * 4);
  });

  it('선택한 점당 금액을 최종 게임머니에 반영한다', () => {
    const result = calculateSettlement({
      winnerScore: score(['m01-01', 'm03-01', 'm08-01']),
      loserScore: score(['m02-01']),
      winnerGoCount: 0,
      settings: matgoRulesForPointValue(10_000)
    });
    expect(result.pointValue).toBe(10_000);
    expect(result.displayAmount).toBe(result.finalScore * 10_000);
  });

  it('나가리 이월 배율은 모든 정산 후 최종 점수와 게임머니에 적용한다', () => {
    const options = {
      winnerScore: score(['m01-01', 'm03-01', 'm08-01']),
      loserScore: score(['m02-01']),
      winnerGoCount: 0
    };
    const normal = calculateSettlement(options);
    const carried = calculateSettlement({ ...options, roundMultiplier: 4 });
    expect(carried.roundMultiplier).toBe(4);
    expect(carried.finalScore).toBe(normal.finalScore * 4);
    expect(carried.displayAmount).toBe(normal.displayAmount * 4);
    expect(carried.steps.at(-1)?.label).toBe('나가리 이월');
  });
});
