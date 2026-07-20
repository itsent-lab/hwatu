import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginLayer from '../components/LoginLayer';
import PageLayout from '../components/PageLayout';
import BootstrapPage from '../pages/BootstrapPage';

describe('입장 화면 로그인 레이어', () => {
  it('로그인을 별도 페이지가 아닌 큰 레이어 선택창으로 표시한다', () => {
    const html = renderToStaticMarkup(<LoginLayer onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('로그인하고 입장하기');
    expect(html).not.toContain('한글 아이디도 가능합니다');
    expect(html).not.toContain('가족 계정의 비밀번호를 입력하세요');
    expect(html).not.toContain('가족 계정으로 입장');
    expect(html).not.toContain('내 게임머니와 진행 중인 판을 안전하게 불러옵니다');
    expect(html).not.toContain('농사랑');
    expect(html).toContain('이 기기에서 로그인 유지');
    expect(html).toContain('로그인 창 닫기');
  });

  it('로그인 전 입장 화면의 상단에서 레이어를 다시 열 수 있다', () => {
    const html = renderToStaticMarkup(<MemoryRouter><PageLayout onLogin={vi.fn()}><p>입장 화면</p></PageLayout></MemoryRouter>);
    expect(html).toContain('guest-login-button');
    expect(html).toContain('로그인');
  });

  it('첫 관리자는 서버 설정 토큰과 15자 이상의 비밀번호를 요구한다', () => {
    const html = renderToStaticMarkup(<MemoryRouter><BootstrapPage /></MemoryRouter>);
    expect(html).toContain('name="setupToken"');
    expect(html).toContain('minLength="32"');
    expect(html).toContain('비밀번호 (15자 이상)');
    expect(html).toContain('minLength="15"');
  });
});
