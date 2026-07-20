import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GostopOpponentCaptured from '../components/GostopOpponentCaptured';

describe('고스톱 컴퓨터 획득패', () => {
  it('점수판 아래에서 획득한 패를 종류별 작은 패로 보여준다', () => {
    const html = renderToStaticMarkup(<GostopOpponentCaptured
      cardIds={['m01-01', 'm02-01', 'm03-02', 'm04-03']}
      name="정순이"
    />);

    expect(html).toContain('정순이 획득패 4장');
    expect(html).toContain('상대 획득 패');
    expect(html.match(/captured-card-slot/g)).toHaveLength(4);
    expect(html).toContain('광 1');
    expect(html).toContain('열끗 1');
    expect(html).toContain('띠 1');
    expect(html).toContain('피 1');
  });
});
