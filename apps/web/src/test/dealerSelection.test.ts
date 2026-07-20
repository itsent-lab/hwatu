import { describe, expect, it } from 'vitest';
import { getCard } from '../engine/cards';
import { chooseComputerDealerIndex, createDealerSelectionCards, determineDealerWinner } from '../engine/dealerSelection';

describe('첫 판 선 정하기', () => {
  it('서로 다른 월의 뒤집힌 패 열두 장을 펼친다', () => {
    const cards = createDealerSelectionCards(20260719);
    expect(cards).toHaveLength(12);
    expect(new Set(cards.map(cardId => getCard(cardId)?.month))).toHaveLength(12);
  });

  it('컴퓨터는 내가 고르지 않은 패를 선택한다', () => {
    const cards = createDealerSelectionCards(101);
    expect(chooseComputerDealerIndex(cards, 4, 101)).not.toBe(4);
  });

  it('낮에는 높은 월, 밤에는 낮은 월이 선이다', () => {
    expect(determineDealerWinner('m12-01', 'm01-01', true)).toBe('human');
    expect(determineDealerWinner('m12-01', 'm01-01', false)).toBe('computer');
  });

  it('같은 월이면 광·열끗·띠·피 순서로 정한다', () => {
    expect(determineDealerWinner('m01-01', 'm01-02', true)).toBe('human');
    expect(determineDealerWinner('m02-03', 'm02-04', true)).toBeNull();
  });
});
