import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ExitChoiceDialog from '../components/ExitChoiceDialog';
import GostopRoundResult from '../components/GostopRoundResult';
import PageLayout from '../components/PageLayout';
import RoundResultOverlay from '../components/RoundResultOverlay';
import { createInitialGame } from '../engine/gameState';
import { createGostopRoom } from '../games/gostop/gameState';

describe('게임 종료 선택창', () => {
  it('출처와 서비스 정책 링크는 상단 메뉴가 아니라 페이지 하단에 표시한다', () => {
    const html = renderToStaticMarkup(<MemoryRouter><PageLayout><p>본문</p></PageLayout></MemoryRouter>);
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
    const footer = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));
    expect(header).not.toContain('패 출처');
    expect(footer).toContain('화투 패 출처 및 라이선스');
    expect(footer).toContain('href="/credits"');
    expect(footer).toContain('개인정보 처리방침');
    expect(footer).toContain('href="/privacy"');
    expect(footer).toContain('MIT 라이선스');
    expect(footer).toContain('href="/license"');
  });

  it('진행 중 나가기에서 예약과 바로 나가기를 함께 보여준다', () => {
    const html = renderToStaticMarkup(<ExitChoiceDialog onReserve={vi.fn()} onImmediate={vi.fn()} onCancel={vi.fn()} />);
    expect(html).toContain('예약 나가기');
    expect(html).toContain('바로 나가기');
    expect(html).toContain('계속 게임하기');
  });

  it('한 판 종료 후 계속할지 묻는다', () => {
    const game = createInitialGame(20260719);
    game.phase = 'round-ended';
    game.roundResult = 'nagari';
    const html = renderToStaticMarkup(<RoundResultOverlay game={game} onContinue={vi.fn()} onExit={vi.fn()} />);
    expect(html).toContain('확인하면 다음 판이 바로 시작됩니다');
    expect(html).toContain('class="result-scroll-content"');
    expect(html).toContain('class="result-footer"');
    expect(html).toContain('확인 · 바로 시작');
    expect(html).toContain('나가기');
  });

  it('바닥 총통으로 즉시 끝난 판은 총통 나가리 이유를 결과창에 보여준다', () => {
    const game = createInitialGame(11);
    game.phase = 'round-ended';
    game.roundResult = 'nagari';
    game.lastAction = '바닥패 총통으로 나가리입니다.';
    const html = renderToStaticMarkup(<RoundResultOverlay game={game} onContinue={vi.fn()} onExit={vi.fn()} />);
    expect(html).toContain('바닥패 총통으로 나가리입니다.');
  });

  it('예약 나가기 상태에서는 자동 나가기 안내를 보여준다', () => {
    const game = createInitialGame(20260719);
    game.phase = 'round-ended';
    game.roundResult = 'nagari';
    const html = renderToStaticMarkup(<RoundResultOverlay game={game} exitReserved onContinue={vi.fn()} onExit={vi.fn()} />);
    expect(html).toContain('잠시 후 게임을 나갑니다');
    expect(html).toContain('지금 나가기');
    expect(html).not.toContain('확인 · 바로 시작');
  });

  it('고스톱 예약 나가기 상태에서도 다음 판 대신 자동 나가기를 안내한다', () => {
    const room = createGostopRoom(20260720, 100);
    room.phase = 'round-ended';
    room.roundResult = 'nagari';
    const html = renderToStaticMarkup(<GostopRoundResult room={room} winnerName="" exitReserved onContinue={vi.fn()} onExit={vi.fn()} />);
    expect(html).toContain('잠시 후 게임을 나갑니다');
    expect(html).toContain('지금 나가기');
    expect(html).not.toContain('한 판 더</button>');
  });

  it('고스톱 잔액이 0냥이면 다음 판 대신 대기실 리필 이동만 제공한다', () => {
    const room = createGostopRoom(20260720, 100);
    room.phase = 'round-ended';
    room.roundResult = 'nagari';
    const html = renderToStaticMarkup(<GostopRoundResult room={room} winnerName="" balanceEmpty onContinue={vi.fn()} onExit={vi.fn()} onReturnLobby={vi.fn()} />);
    expect(html).toContain('게임머니가 0냥입니다');
    expect(html).toContain('대기실로 가서 리필 받기');
    expect(html).not.toContain('한 판 더</button>');
  });

  it('잔액이 0냥이면 결과창에서 새 판이나 리필을 제공하지 않고 메인 이동만 제공한다', () => {
    const game = createInitialGame(20260719);
    game.phase = 'round-ended';
    game.roundResult = 'win';
    const html = renderToStaticMarkup(<RoundResultOverlay game={game} balanceEmpty onContinue={vi.fn()} onExit={vi.fn()} onReturnHome={vi.fn()} />);
    expect(html).toContain('게임머니가 0냥입니다');
    expect(html).toContain('대기실로 가서 리필 받기');
    expect(html).not.toContain('확인 · 바로 시작');
    expect(html).not.toContain('500,000냥 리필 받기');
  });

  it('정산된 게임머니의 획득 금액만 간단히 보여준다', () => {
    const game = createInitialGame(20260719);
    game.phase = 'round-ended';
    game.roundResult = 'win';
    game.winner = 'human';
    game.settlement = {
      baseScore: 7,
      goBonus: 0,
      goMultiplier: 1,
      shakeMultiplier: 1,
      missionMultiplier: 1,
      baks: [],
      bakMultiplier: 1,
      finalScore: 7,
      pointValue: 100,
      displayAmount: 700,
      isRealCurrency: false,
      isExchangeable: false,
      steps: [{ label: '기본점수', formula: '7점', value: 7 }]
    };
    const html = renderToStaticMarkup(<RoundResultOverlay game={game} opponentName="김영숙" moneyTransfer={{
      humanBefore: 100000,
      humanAfter: 100700,
      computerBefore: 50000,
      computerAfter: 49300,
      amount: 700,
      appliedNow: true
    }} onContinue={vi.fn()} onExit={vi.fn()} />);
    expect(html).not.toContain('게임머니 획득');
    expect(html).not.toContain('7점 × 점 100냥');
    expect(html).not.toContain('= 700냥');
    expect(html).toContain('+700냥');
    expect(html).not.toContain('100,000 → 100,700냥');
    expect(html).not.toContain('50,000 → 49,300냥');
    expect(html).not.toContain('김영숙');
    expect(html).not.toContain('양쪽 잔액에 바로 저장되었습니다.');
    expect(html).not.toContain('기본점수');
    expect(html).not.toContain('settlement-steps');
    expect(html).not.toContain('가상 게임머니');
  });

  it('컴퓨터 상대 잔액이 0냥이면 500,000냥 자동 리필을 정산 결과에 보여준다', () => {
    const game = createInitialGame(20260720);
    game.phase = 'round-ended';
    game.roundResult = 'win';
    game.winner = 'human';
    game.settlement = {
      baseScore: 50,
      goBonus: 0,
      goMultiplier: 1,
      shakeMultiplier: 1,
      missionMultiplier: 1,
      baks: [],
      bakMultiplier: 1,
      finalScore: 50,
      pointValue: 10000,
      displayAmount: 500000,
      isRealCurrency: false,
      isExchangeable: false,
      steps: []
    };
    const html = renderToStaticMarkup(<RoundResultOverlay game={game} opponentName="박정호" moneyTransfer={{
      humanBefore: 100000,
      humanAfter: 600000,
      computerBefore: 500000,
      computerAfter: 0,
      computerRefillAfter: 500000,
      amount: 500000,
      appliedNow: true
    }} onContinue={vi.fn()} onExit={vi.fn()} />);
    expect(html).not.toContain('500,000 → 0냥');
    expect(html).toContain('ALL IN');
    expect(html).toContain('박정호 게임머니 전액 획득');
    expect(html).toContain('박정호 자동 리필');
    expect(html).toContain('0 → 500,000냥');
    expect(html).not.toContain('저장되었습니다.');
  });
});
