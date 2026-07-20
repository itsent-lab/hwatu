import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LicensePage from '../pages/LicensePage';
import PrivacyPage from '../pages/PrivacyPage';

describe('서비스 정책과 라이선스 페이지', () => {
  it('개인정보 처리 항목과 이용자 권리를 안내한다', () => {
    const html = renderToStaticMarkup(<MemoryRouter><PrivacyPage /></MemoryRouter>);
    expect(html).toContain('개인정보 처리방침');
    expect(html).toContain('기기 식별값');
    expect(html).toContain('제3자에게 판매하거나 제공하지 않으며');
    expect(html).toContain('열람, 수정, 삭제, 처리 정지');
  });

  it('자체 코드와 화투 패의 라이선스를 구분한다', () => {
    const html = renderToStaticMarkup(<MemoryRouter><LicensePage /></MemoryRouter>);
    expect(html).toContain('MIT License');
    expect(html).toContain('Copyright (c) 2026 NSRNB');
    expect(html).toContain('CC BY-SA 4.0');
    expect(html).toContain('href="/credits"');
  });
});
