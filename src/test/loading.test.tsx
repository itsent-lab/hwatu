import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Loading from '../components/Loading';

describe('초기 로딩 화면', () => {
  it('빈 화면 대신 브랜드와 진행 상태를 표시한다', () => {
    const html = renderToStaticMarkup(<Loading />);
    expect(html).toContain('가족화투');
    expect(html).toContain('가족화투를 불러오고 있습니다');
    expect(html).toContain('loading-cards');
    expect(html).toContain('loading-progress');
  });
});
