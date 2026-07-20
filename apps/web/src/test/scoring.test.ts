import { describe, expect, it } from 'vitest';
import { HWATU_CARDS } from '../engine/cards';
import { calculateCapturedScore } from '../engine/rules/scoring';

describe('기본 맞고 족보 점수', () => {
  it('비광 없는 3광은 3점, 비광 포함 3광은 2점이다', () => {
    expect(calculateCapturedScore(['m01-01', 'm03-01', 'm08-01']).lines[0]?.label).toBe('삼광');
    expect(calculateCapturedScore(['m01-01', 'm03-01', 'm12-01']).lines[0]).toMatchObject({ label: '비삼광', points: 2 });
  });

  it('4광은 4점, 5광은 15점이다', () => {
    expect(calculateCapturedScore(['m01-01', 'm03-01', 'm08-01', 'm12-01']).lines[0]).toMatchObject({ label: '4광', points: 4 });
    expect(calculateCapturedScore(['m01-01', 'm03-01', 'm08-01', 'm11-01', 'm12-01']).lines[0]).toMatchObject({ label: '오광', points: 15 });
  });

  it('고도리는 그림 속 새 다섯 마리를 모은 세 패로 5점이다', () => {
    const score = calculateCapturedScore(['m02-01', 'm04-01', 'm08-02']);
    expect(score.lines.find(line => line.code === 'godori')?.points).toBe(5);
  });

  it('열끗은 5장부터 1점씩 증가한다', () => {
    expect(calculateCapturedScore(['m02-01', 'm04-01', 'm05-01', 'm06-01', 'm07-01']).lines.find(line => line.code === 'animal')?.points).toBe(1);
    expect(calculateCapturedScore(['m02-01', 'm04-01', 'm05-01', 'm06-01', 'm07-01', 'm08-02']).lines.find(line => line.code === 'animal')?.points).toBe(2);
  });

  it.each([
    ['홍단', ['m01-02', 'm02-02', 'm03-02'], 'hongdan'],
    ['청단', ['m06-02', 'm09-02', 'm10-02'], 'cheongdan'],
    ['초단', ['m04-02', 'm05-02', 'm07-02'], 'chodan']
  ])('%s 완성은 3점이다', (_, ids, code) => {
    expect(calculateCapturedScore(ids).lines.find(line => line.code === code)?.points).toBe(3);
  });

  it('띠는 5장부터 1점씩 증가한다', () => {
    const ids = ['m01-02', 'm02-02', 'm04-02', 'm06-02', 'm09-02'];
    expect(calculateCapturedScore(ids).lines.find(line => line.code === 'ribbon')?.points).toBe(1);
  });

  it('피는 쌍피를 두 장으로 세어 10장부터 1점이다', () => {
    const singles = HWATU_CARDS.filter(card => card.type === 'junk').slice(0, 8).map(card => card.id);
    const score = calculateCapturedScore([...singles, 'm11-02']);
    expect(score.junkCount).toBe(10);
    expect(score.lines.find(line => line.code === 'junk')?.points).toBe(1);
  });

  it('보너스패는 쌍피와 삼피로 계산한다', () => {
    const score = calculateCapturedScore(['bonus-pee-1', 'bonus-double-pee-1']);
    expect(score.junkCount).toBe(5);
  });

  it('국진은 열끗 또는 쌍피 중 하나로만 계산한다', () => {
    const cards = ['m09-01', 'm02-01', 'm04-01', 'm05-01', 'm06-01', 'm01-03', 'm01-04', 'm02-03', 'm02-04', 'm03-03', 'm03-04', 'm04-03', 'm04-04'];
    const animal = calculateCapturedScore(cards);
    const doubleJunk = calculateCapturedScore(cards, { gookjinAsDoubleJunk: true });
    expect(animal.animalCount).toBe(5);
    expect(doubleJunk.animalCount).toBe(4);
    expect(doubleJunk.junkCount).toBe(10);
  });
});
