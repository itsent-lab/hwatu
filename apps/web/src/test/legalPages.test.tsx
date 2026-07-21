import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CreditsPage from '../pages/CreditsPage';
import LicensePage from '../pages/LicensePage';
import PrivacyPage from '../pages/PrivacyPage';

describe('서비스 정책과 라이선스 페이지', () => {
  it('개인정보 처리 항목과 이용자 권리를 안내한다', () => {
    const html = renderToStaticMarkup(<MemoryRouter><PrivacyPage /></MemoryRouter>);
    expect(html).toContain('개인정보 처리방침');
    expect(html).toContain('기기 식별값');
    expect(html).toContain('제3자에게 판매하거나 제공하지 않으며');
    expect(html).toContain('열람, 수정, 삭제, 처리 정지');
    expect(html).toContain('가족 관리자 또는 서비스 운영자');
    expect(html).not.toContain('NSJ 운영자');
    expect(html).toContain('mailto:itsent@itsent.co.kr');
  });

  it('자체 코드와 화투 패의 라이선스를 구분한다', () => {
    const html = renderToStaticMarkup(<MemoryRouter><LicensePage /></MemoryRouter>);
    expect(html).toContain('MIT License');
    expect(html).toContain('Copyright (c) 2026 NSJ &lt;itsent@itsent.co.kr&gt;');
    expect(html).toContain('독자적으로 작성');
    expect(html).toContain('추출·복사·전재한 형태로 가져오지 않았습니다');
    expect(html).toContain('새로 작성·제작했습니다');
    expect(html).toContain('유지보수, 업데이트, 호환성');
    expect(html).toContain('오픈소스 의존성');
    expect(html).toContain('CC BY-SA 4.0');
    expect(html).toContain('href="/credits"');
    expect(html).toContain('THIRD_PARTY_NOTICES.md');
  });

  it('화투 패 원저작자와 공개 라이선스 사운드를 구분한다', () => {
    const html = renderToStaticMarkup(<MemoryRouter><CreditsPage /></MemoryRouter>);
    expect(html).toContain('개별 SVG 제작·공개');
    expect(html).not.toContain('개별 SVG 추출·최적화');
    expect(html).toContain('런타임 합성음을 만들지 않습니다');
    expect(html).toContain('Kenney Casino Audio');
    expect(html).toContain('기기의 한국어 TTS는 사용하지 않습니다');
    expect(html).toContain('국악 배경음악 #133');
    expect(html).toContain('CC BY 4.0');
    expect(html).toContain('/audio/ATTRIBUTION.txt');
  });
});
