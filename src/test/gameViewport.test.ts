import { describe, expect, it } from 'vitest';
import { calculateGameViewportFit, resolveGameViewportSize } from '../lib/gameViewport';

describe('작은 가로 화면 전체 비율 축소', () => {
  it('짧은 가로 화면을 720px 논리 높이로 확대 배치한 뒤 화면 크기에 맞춰 축소한다', () => {
    const fit = calculateGameViewportFit(946, 452);
    expect(fit).not.toBeNull();
    expect(fit!.scale).toBeCloseTo(452 / 720);
    expect(fit!.logicalHeight).toBe(720);
    expect(fit!.logicalWidth * fit!.scale).toBeCloseTo(946);
    expect(fit!.logicalHeight * fit!.scale).toBeCloseTo(452);
    expect(fit!.dockHeight).toBe(170);
  });

  it('화면이 넓어져도 손패 영역 높이는 카드와 함께 커지지 않는다', () => {
    expect(calculateGameViewportFit(1867, 452)!.dockHeight).toBe(170);
  });

  it('서로 다른 휴대폰 가로 비율에서도 화면 전체가 정확한 크기로 맞춰진다', () => {
    for (const [width, height] of [[844, 390], [946, 452], [1024, 600], [1366, 600], [1867, 452]]) {
      const fit = calculateGameViewportFit(width, height);
      expect(fit).not.toBeNull();
      expect(fit!.logicalWidth * fit!.scale).toBeCloseTo(width);
      expect(fit!.logicalHeight * fit!.scale).toBeCloseTo(height);
    }
  });

  it('일반 iPad 크기와 세로 화면은 기존 크기를 유지한다', () => {
    expect(calculateGameViewportFit(1024, 768)).toBeNull();
    expect(calculateGameViewportFit(452, 946)).toBeNull();
  });

  it('실기기 브라우저 UI가 바뀌면 visual viewport의 실제 표시 크기를 사용한다', () => {
    expect(resolveGameViewportSize(844, 430, { width: 844, height: 390 })).toEqual({ width: 844, height: 390 });
    expect(resolveGameViewportSize(844, 430)).toEqual({ width: 844, height: 430 });
  });
});
