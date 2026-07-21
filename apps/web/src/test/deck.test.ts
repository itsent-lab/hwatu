import { describe, expect, it } from 'vitest';
import { createDeck, createGostopDeck, createMatgoDeck, dealGostop, dealMatgo, shuffleDeck } from '../engine/deck';

describe('화투 덱', () => {
  it('48장 모두가 한 번씩 존재한다', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(48);
    expect(new Set(deck)).toHaveLength(48);
  });

  it('같은 시드는 같은 순서를 만든다', () => {
    expect(shuffleDeck(createDeck(), 20260719).cards).toEqual(shuffleDeck(createDeck(), 20260719).cards);
  });

  it('맞고 덱에는 보너스패 두 장을 더한다', () => {
    const deck = createMatgoDeck();
    expect(deck).toHaveLength(50);
    expect(deck.filter(cardId => cardId.startsWith('bonus-'))).toHaveLength(2);
  });

  it('맞고 패를 10·10·8장으로 나누고 나머지를 더미와 선의 보너스패로 보존한다', () => {
    const deal = dealMatgo(shuffleDeck(createMatgoDeck(), 17).cards);
    expect([deal.humanHand.length, deal.computerHand.length, deal.floorCards.length]).toEqual([10, 10, 8]);
    expect(deal.drawPile.length + deal.humanCaptured.length).toBe(22);
  });

  it('처음 바닥에 놓인 보너스패는 선이 가져가고 일반 패로 보충한다', () => {
    const deck = createMatgoDeck();
    const bonus = deck.find(cardId => cardId.startsWith('bonus-'))!;
    const arranged = deck.filter(cardId => cardId !== bonus);
    arranged.splice(20, 0, bonus);
    const deal = dealMatgo(arranged);
    expect(deal.humanCaptured).toContain(bonus);
    expect(deal.floorCards).toHaveLength(8);
    expect(deal.floorCards.some(cardId => cardId.startsWith('bonus-'))).toBe(false);
  });

  it('컴퓨터가 선이면 처음 바닥 보너스패를 컴퓨터가 가져간다', () => {
    const deck = createMatgoDeck();
    const bonus = deck.find(cardId => cardId.startsWith('bonus-'))!;
    const arranged = deck.filter(cardId => cardId !== bonus);
    arranged.splice(20, 0, bonus);
    const deal = dealMatgo(arranged, 'computer');
    expect(deal.humanCaptured).toEqual([]);
    expect(deal.computerCaptured).toContain(bonus);
  });

  it('3인 고스톱은 보너스패를 포함해 7·7·7·6장으로 나눈다', () => {
    const deal = dealGostop(shuffleDeck(createGostopDeck(), 23).cards);
    expect([deal.humanHand.length, deal.computerAHand.length, deal.computerBHand.length, deal.floorCards.length]).toEqual([7, 7, 7, 6]);
    expect(deal.drawPile.length + deal.initialBonusCards.length).toBe(24);
    expect(deal.floorCards.some(cardId => cardId.startsWith('bonus-'))).toBe(false);
  });

  it('고스톱의 첫 바닥 보너스패는 선이 가져갈 수 있도록 따로 보존한다', () => {
    const deck = createGostopDeck();
    const bonus = deck.find(cardId => cardId.startsWith('bonus-'))!;
    const arranged = deck.filter(cardId => cardId !== bonus);
    arranged.splice(21, 0, bonus);
    const deal = dealGostop(arranged);
    expect(deal.initialBonusCards).toContain(bonus);
    expect(deal.floorCards).toHaveLength(6);
    expect(deal.floorCards.some(cardId => cardId.startsWith('bonus-'))).toBe(false);
  });
});
