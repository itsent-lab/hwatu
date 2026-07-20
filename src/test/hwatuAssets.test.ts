import { describe, expect, it } from 'vitest';
import { HWATU_ASSET_CREDITS, HWATU_CREDIT, getHwatuAssetUrl, getHwatuSourceTitle } from '../data/hwatuAssets';
import { HWATU_CARDS } from '../engine/cards';

describe('Wikimedia Commons 화투 자산', () => {
  it('정규 화투 48장에 서로 다른 한국식 SVG를 연결한다', () => {
    expect(HWATU_ASSET_CREDITS).toHaveLength(48);
    expect(new Set(HWATU_ASSET_CREDITS.map(asset => asset.fileTitle)).size).toBe(48);
    for (const card of HWATU_CARDS) {
      expect(getHwatuAssetUrl(card.id)).toBe(`/cards/hwatu/${card.id}.svg`);
      expect(getHwatuSourceTitle(card.id)).toMatch(/^File:Hwatu .+\.svg$/);
    }
  });

  it('한국식 11월 오동과 12월 비 배열을 유지한다', () => {
    expect(getHwatuSourceTitle('m11-01')).toBe('File:Hwatu November Hikari.svg');
    expect(getHwatuSourceTitle('m11-02')).toBe('File:Hwatu November Kasu 2.svg');
    expect(getHwatuSourceTitle('m12-01')).toBe('File:Hwatu December Hikari.svg');
  });

  it('요청된 라이선스와 원저작자 크레딧을 제공한다', () => {
    expect(HWATU_CREDIT.licenseName).toBe('CC BY-SA 4.0');
    expect(HWATU_CREDIT.individualAuthor).toBe('Spenĉjo');
    expect(HWATU_CREDIT.designAuthor).toBe('Marcus Richert');
  });
});
