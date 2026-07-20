import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GostopHiddenHand from '../components/GostopHiddenHand';

describe('고스톱 상대 손패', () => {
  it('이동할 때 공개할 실제 패 앞면을 뒷면 안에 준비한다', () => {
    const html = renderToStaticMarkup(<GostopHiddenHand cardIds={['m01-01', 'm02-01']} />);
    expect(html).toContain('손패 2장');
    expect(html).toContain('data-card-id="m01-01"');
    expect(html).toContain('data-card-id="m02-01"');
    expect(html).toContain('gostop-card-flight-face');
    expect(html).toContain('card-art');
  });
});
