import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GostopHumanHand from '../components/GostopHumanHand';

describe('고스톱 손패 선택 보조', () => {
  it('바닥패와 같은 월의 손패 및 보너스패를 구분해 안내한다', () => {
    const html = renderToStaticMarkup(<GostopHumanHand
      cardIds={['m01-01', 'm02-01', 'bonus-pee-1']}
      floorCardIds={['m01-02', 'm03-01']}
      disabled={false}
      showHints
      onPlay={() => undefined}
    />);

    expect(html).toContain('gostop-match-hint');
    expect(html).toContain('gostop-bonus-hint');
    expect(html).toContain('바닥패와 맞아 먹을 수 있습니다');
    expect(html).toContain('보너스패: 한 번 더 칩니다');
    expect(html.match(/gostop-match-hint/g)).toHaveLength(1);
    expect(html.match(/gostop-bonus-hint/g)).toHaveLength(1);
  });

  it('내 차례가 아니면 패 안내를 숨긴다', () => {
    const html = renderToStaticMarkup(<GostopHumanHand
      cardIds={['m01-01', 'bonus-pee-1']}
      floorCardIds={['m01-02']}
      disabled
      showHints={false}
      onPlay={() => undefined}
    />);

    expect(html).not.toContain('gostop-match-hint');
    expect(html).not.toContain('gostop-bonus-hint');
  });
});
