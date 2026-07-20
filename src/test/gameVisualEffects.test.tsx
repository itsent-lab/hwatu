import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AutoPlayButton from '../components/AutoPlayButton';
import BombDecisionPanel from '../components/BombDecisionPanel';
import CapturedCardRack from '../components/CapturedCardRack';
import CardMissionPanel from '../components/CardMissionPanel';
import ChongtongDecisionPanel from '../components/ChongtongDecisionPanel';
import DealAnimation from '../components/DealAnimation';
import DifficultySelector from '../components/DifficultySelector';
import FloorCardField from '../components/FloorCardField';
import GameDeclarationOverlay from '../components/GameDeclarationOverlay';
import GamePlayerPanel from '../components/GamePlayerPanel';
import GoStopDecisionPanel from '../components/GoStopDecisionPanel';
import GookjinDecisionPanel from '../components/GookjinDecisionPanel';
import HumanHandRow from '../components/HumanHandRow';
import PointEntryButtons from '../components/PointEntryButtons';
import PointValueSelector from '../components/PointValueSelector';
import ShakeDecisionPanel from '../components/ShakeDecisionPanel';
import SettlementImpact from '../components/SettlementImpact';
import StakeQuickSelector from '../components/StakeQuickSelector';
import StartingPlayerChoice from '../components/StartingPlayerChoice';
import TableScoreBadge from '../components/TableScoreBadge';

describe('맞고 선언과 패 액션 UI', () => {
  it('메인 화면에서 점당 금액 다섯 개의 입장 버튼을 가로로 제공한다', () => {
    const html = renderToStaticMarkup(<PointEntryButtons onEnter={() => undefined} />);
    expect(html).toContain('점당 금액을 고르고 입장하세요');
    expect(html).not.toContain('<legend>');
    expect(html).toContain('점 100냥');
    expect(html).toContain('점 1,000냥');
    expect(html).toContain('점 2,000냥');
    expect(html).toContain('점 5,000냥');
    expect(html).toContain('점 10,000냥');
    expect(html.match(/<button/g)).toHaveLength(5);
    expect(html.match(/class="room-kind"/g)).toHaveLength(5);
    expect(html.match(/class="room-enter"/g)).toHaveLength(5);
    expect(html.match(/입장/g)).toHaveLength(6);
  });

  it('첫 판에서 점당 게임머니 다섯 단계를 고를 수 있다', () => {
    const html = renderToStaticMarkup(<PointValueSelector value={2_000} onChange={() => undefined} />);
    expect(html).toContain('점 100냥');
    expect(html).toContain('점 1,000냥');
    expect(html).toContain('점 2,000냥');
    expect(html).toContain('점 5,000냥');
    expect(html).toContain('점 10,000냥');
    expect(html.match(/<button/g)).toHaveLength(5);
    expect(html.match(/data-point-value=/g)).toHaveLength(5);
    expect(html).toContain('aria-pressed="true"');
  });

  it('게임 화면에서 점당 금액 다섯 단계를 즉시 바꿀 수 있다', () => {
    const html = renderToStaticMarkup(<StakeQuickSelector value={1_000} onChange={() => undefined} onClose={() => undefined} />);
    expect(html).toContain('점당 금액 변경');
    expect(html).toContain('이번 판 정산에 바로 적용');
    expect(html.match(/<button/g)).toHaveLength(6);
    expect(html.match(/data-point-value=/g)).toHaveLength(5);
    expect(html).toContain('aria-pressed="true"');
  });

  it('게임 중 오른쪽에서 사용할 간단한 난이도 선택기는 네 단계와 현재 단계를 보여준다', () => {
    const html = renderToStaticMarkup(<DifficultySelector compact value="normal" disabled onChange={() => undefined} />);
    expect(html).toContain('difficulty-selector compact');
    expect(html).toContain('aria-label="컴퓨터 난이도"');
    expect(html).not.toContain('<legend>컴퓨터 난이도</legend>');
    expect(html).toContain('쉬움');
    expect(html).toContain('보통');
    expect(html).toContain('어려움');
    expect(html).toContain('초고수');
    expect(html).toContain('data-difficulty="easy"');
    expect(html).toContain('data-difficulty="normal"');
    expect(html).toContain('data-difficulty="hard"');
    expect(html).toContain('data-difficulty="expert"');
    expect(html.match(/disabled=""/g)).toHaveLength(4);
    expect(html).toContain('aria-pressed="true"');
  });

  it('자동 치기를 크게 켜고 같은 버튼으로 즉시 멈출 수 있다', () => {
    const ready = renderToStaticMarkup(<AutoPlayButton active={false} onToggle={() => undefined} />);
    const playing = renderToStaticMarkup(<AutoPlayButton active onToggle={() => undefined} />);
    expect(ready).toContain('자동 치기');
    expect(ready).toContain('편하게 관전');
    expect(ready).toContain('aria-pressed="false"');
    expect(playing).toContain('자동 치는 중');
    expect(playing).toContain('눌러서 멈춤');
    expect(playing).toContain('aria-pressed="true"');
    expect(playing).toContain('auto-play-button active');
  });

  it('흔들 수 있는 패를 고르면 중앙에서 흔들기와 그냥 내기를 크게 선택한다', () => {
    const html = renderToStaticMarkup(<ShakeDecisionPanel
      month={3}
      cardIds={['m03-01', 'm03-02', 'm03-03']}
      selectedCardId="m03-02"
      onDecision={() => undefined}
    />);
    expect(html).toContain('3월 세 장을 흔들까요?');
    expect(html).toContain('흔들기!');
    expect(html).toContain('그냥 내기');
    expect(html).toContain('점수 ×2');
    expect(html).toContain('선택한 패');
    expect(html.match(/<button/g)).toHaveLength(2);
  });

  it('폭탄 가능한 패를 고르면 중앙에서 폭탄과 그냥 내기를 크게 선택한다', () => {
    const html = renderToStaticMarkup(<BombDecisionPanel
      month={4}
      kind="two-card-bomb"
      handCardIds={['m04-01', 'm04-02']}
      floorCardIds={['m04-03', 'm04-04']}
      selectedCardId="m04-01"
      onDecision={() => undefined}
    />);
    expect(html).toContain('4월 두장폭탄을 쓸까요?');
    expect(html).toContain('두장폭탄!');
    expect(html).toContain('그냥 내기');
    expect(html).toContain('점수 ×2');
    expect(html).toContain('내 패');
    expect(html).toContain('바닥패');
    expect(html.match(/<button/g)).toHaveLength(2);
  });

  it('미션패 세 장과 양쪽의 현재 미션 배수를 항상 보여준다', () => {
    const html = renderToStaticMarkup(<CardMissionPanel
      mission={{ kind: 'gakpae', cardIds: ['m01-01', 'm02-01', 'm03-01'] }}
      humanCaptured={['m01-01', 'm02-01']}
      computerCaptured={['m03-01']}
    />);
    expect(html).toContain('미션패');
    expect(html.match(/class="mission-card/g)).toHaveLength(4);
    expect(html).toContain('나 ×4');
    expect(html).toContain('상대 ×2');
    expect(html).toContain('최대 ×8');
    expect(html).toContain('mission-clear-badge human');
    expect(html).toContain('CLEAR');
    expect(html).toContain('×4');
  });

  it('새 족보 점수를 중앙의 큰 숫자와 이름으로 선언한다', () => {
    const html = renderToStaticMarkup(<GameDeclarationOverlay effect={{ id: 7, kind: 'score', text: '고도리!', detail: '+5점 · 현재 7점' }} />);
    expect(html).toContain('declaration-score');
    expect(html).toContain('<strong>고도리!</strong>');
    expect(html).toContain('<span>+5점 · 현재 7점</span>');
  });

  it('정산 결과에서 족보 점수와 박 배수를 색이 다른 카드로 강조한다', () => {
    const html = renderToStaticMarkup(<SettlementImpact settlement={{
      scoreLines: [{ code: 'godori', label: '고도리', points: 5, description: '새 패 완성' }],
      baseScore: 5, goBonus: 0, goMultiplier: 1, shakeMultiplier: 1, missionMultiplier: 1,
      baks: [{ code: 'pi-bak', label: '피박', multiplier: 2 }], bakMultiplier: 2,
      finalScore: 10, pointValue: 100, displayAmount: 1000, isRealCurrency: false, isExchangeable: false, steps: []
    }} />);
    expect(html).toContain('settlement-impact-score');
    expect(html).toContain('고도리</em><b>+5점');
    expect(html).toContain('settlement-impact-bak');
    expect(html).toContain('피박</em><b>×2');
    expect(html).not.toContain('최종 점수');
  });

  it('한 판 시작 시 중앙 더미에서 양쪽으로 열 장씩 패를 돌린다', () => {
    const html = renderToStaticMarkup(<DealAnimation />);
    expect(html.match(/deal-card-back/g)).toHaveLength(20);
    expect(html.match(/deal-to-human/g)).toHaveLength(10);
    expect(html.match(/deal-to-computer/g)).toHaveLength(10);
    expect(html).toContain('패를 나누고 있습니다');
    expect(html).toContain('aria-hidden="true"');
  });

  it('고 선언을 큰 중앙 효과와 상세 안내로 표시한다', () => {
    const html = renderToStaticMarkup(<GameDeclarationOverlay effect={{
      id: 1,
      kind: 'go',
      text: '1고!',
      detail: '1고로 계속합니다.'
    }} />);
    expect(html).toContain('declaration-go');
    expect(html).toContain('1고!');
    expect(html).toContain('1고로 계속합니다.');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('declaration-sparks');
    expect(html.match(/<i/g)).toHaveLength(12);
  });

  it('5고 이상은 화면 전체에 축포를 터뜨린다', () => {
    const html = renderToStaticMarkup(<GameDeclarationOverlay effect={{ id: 5, kind: 'go', text: '5고!', detail: '승부를 계속합니다.' }} />);
    expect(html).toContain('five-go-celebration');
    expect(html).toContain('five-go-fireworks');
    expect(html.match(/--firework-x/g)).toHaveLength(36);
  });

  it('따닥·쪽·싹쓸이 같은 특수 패도 큰 중앙 선언 효과로 표시한다', () => {
    const html = renderToStaticMarkup(<GameDeclarationOverlay effect={{
      id: 2,
      kind: 'ttadak',
      text: '따닥!',
      detail: '싹쓸이까지 · 상대 피 2장 뺏기'
    }} />);
    expect(html).toContain('declaration-ttadak');
    expect(html).toContain('따닥!');
    expect(html).toContain('싹쓸이까지 · 상대 피 2장 뺏기');
  });

  it('두 번째 뻑과 삼연뻑은 단계별 충격파를 겹쳐 표시한다', () => {
    const second = renderToStaticMarkup(<GameDeclarationOverlay effect={{ id: 8, kind: 'ppeok-chain', text: '연속뻑!', detail: '두 번째 뻑 · 한 번 더면 기본 7점 승리' }} />);
    const third = renderToStaticMarkup(<GameDeclarationOverlay effect={{ id: 9, kind: 'ppeok-triple', text: '삼연뻑!', detail: '세 번째 뻑 · 기본 7점 즉시 승리' }} />);
    expect(second).toContain('declaration-ppeok-chain');
    expect(second.match(/<i/g)).toHaveLength(14);
    expect(third).toContain('declaration-ppeok-triple');
    expect(third.match(/<i/g)).toHaveLength(15);
    expect(third).toContain('기본 7점 즉시 승리');
  });

  it('쌍피와 쓰리피는 보너스패가 화면 밖으로 터지는 중앙 연출로 표시한다', () => {
    const doublePee = renderToStaticMarkup(<GameDeclarationOverlay effect={{
      id: 3,
      kind: 'double-pee',
      text: '쌍피!',
      detail: '피 2장 값 · 상대 피 1장 뺏기'
    }} />);
    const triplePee = renderToStaticMarkup(<GameDeclarationOverlay effect={{
      id: 4,
      kind: 'triple-pee',
      text: '쓰리피!',
      detail: '피 3장 값'
    }} />);

    expect(doublePee).toContain('declaration-double-pee');
    expect(doublePee).toContain('쌍피!');
    expect(doublePee.match(/<i/g)).toHaveLength(21);
    expect(triplePee).toContain('declaration-triple-pee');
    expect(triplePee).toContain('쓰리피!');
  });

  it('쪽·따닥 등으로 쌍피를 뺏으면 특수 선언과 쌍피 이동 연출을 함께 표시한다', () => {
    const html = renderToStaticMarkup(<GameDeclarationOverlay effect={{
      id: 5,
      kind: 'jjok',
      text: '쪽!',
      detail: '상대 쌍피 1장(피 2장 값) 뺏기',
      peeBurstValue: 2,
      peeBurstText: '쌍피 뺏기!'
    }} />);

    expect(html).toContain('declaration-jjok');
    expect(html).toContain('pee-burst-cards');
    expect(html).toContain('쌍피 뺏기!');
    expect(html).toContain('피 2장 값');
  });

  it('고·스톱 선택창에 다음 고와 스톱 확정 점수·게임머니를 크게 표시한다', () => {
    const html = renderToStaticMarkup(<GoStopDecisionPanel
      owner="human"
      score={10}
      nextGoCount={1}
      stopScore={10}
      stopAmount={10000}
      onDecision={() => undefined}
    />);
    expect(html).toContain('go-stop-score-medal');
    expect(html).toContain('승부 선택');
    expect(html).toContain('1고!');
    expect(html).toContain('스톱!');
    expect(html).toContain('<b>10점</b> · 10,000냥 확정');
    expect(html).toContain('바닥패를 보며 천천히 결정하세요');
  });

  it('상대가 고·스톱을 결정하는 동안 같은 선택판을 잠금 상태로 보여준다', () => {
    const html = renderToStaticMarkup(<GoStopDecisionPanel
      owner="computer"
      score={8}
      nextGoCount={2}
      stopScore={9}
      stopAmount={9000}
    />);
    expect(html).toContain('상대 선택');
    expect(html).toContain('상대가 고 · 스톱을 결정 중입니다');
    expect(html).toContain('고와 스톱을 생각하고 있습니다');
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });

  it('스톱 정산액이 상대 잔액을 넘으면 올인과 실제 획득액을 미리 알려준다', () => {
    const html = renderToStaticMarkup(<GoStopDecisionPanel owner="human" score={18} nextGoCount={3} stopScore={20} stopAmount={700000} opponentBalance={500000} />);
    expect(html).toContain('go-stop-all-in');
    expect(html).toContain('상대가 올인입니다');
    expect(html).toContain('스톱 시 500,000냥 전액 획득');
    expect(html).toContain('<b>20점</b> · 500,000냥 확정');
    expect(html).not.toContain('700,000냥 확정');
  });

  it('총통 네 장을 펼쳐 보여주고 계속 또는 스톱을 크게 고르게 한다', () => {
    const html = renderToStaticMarkup(<ChongtongDecisionPanel
      cardIds={['m01-01', 'm01-02', 'm01-03', 'm01-04']}
      month={1}
      onDecision={() => undefined}
    />);
    expect(html).toContain('총통!');
    expect(html.match(/data-card-id="m01-/g)).toHaveLength(4);
    expect(html).toContain('4장 흔들기 후 폭탄');
    expect(html).toContain('7점 승리');
  });

  it('플레이어 상태판에는 중앙과 중복되는 점수와 획득패 개수를 표시하지 않는다', () => {
    const html = renderToStaticMarkup(<GamePlayerPanel
      name="시화원"
      balance={100000}
      human
      first
    />);
    expect(html).toContain('시화원');
    expect(html).toContain('100,000냥');
    expect(html).not.toContain('Lv.');
    expect(html).not.toContain('player-round-score');
    expect(html).not.toContain('capture-summary');
    expect(html).toContain('<span>시화원</span><b class="first-player-badge">선</b>');
    expect(html).toContain('<div class="player-portrait"><span aria-hidden="true">🙂</span></div>');
  });

  it('게임머니는 자릿수가 짧을수록 상태판 너비를 더 크게 채운다', () => {
    const shortHtml = renderToStaticMarkup(<GamePlayerPanel name="시화원" balance={50000} human />);
    const longHtml = renderToStaticMarkup(<GamePlayerPanel name="시화원" balance={1234567890} human />);
    const shortSize = Number(shortHtml.match(/--balance-fit-size:([\d.]+)cqw/)?.[1]);
    const longSize = Number(longHtml.match(/--balance-fit-size:([\d.]+)cqw/)?.[1]);
    expect(shortHtml).toContain('player-balance-frame');
    expect(shortSize).toBeGreaterThan(longSize);
    expect(longHtml).toContain('1,234,567,890냥');
  });

  it('등록된 프로필 사진을 표시하고 사진 선택 버튼을 제공한다', () => {
    const html = renderToStaticMarkup(<GamePlayerPanel name="시화원" balance={100000} human profileImageUrl="/api/profile/image/1/123" onProfileImageChange={async () => undefined} />);
    expect(html).toContain('aria-label="사진 앱에서 프로필 사진 선택"');
    expect(html).toContain('accept="image/*,.heic,.heif"');
    expect(html).not.toContain('capture=');
    expect(html).toContain('<img src="/api/profile/image/1/123" alt=""/>');
  });

  it('상대가 고민할 때 상태판 내용을 가리는 대신 전용 배치를 사용한다', () => {
    const html = renderToStaticMarkup(<GamePlayerPanel
      name="김영숙"
      balance={50000}
      thinking={{ durationMs: 2300, endsAt: Date.now() + 2300, label: '낼 패를 고르는 중…' }}
    />);
    expect(html).toContain('game-player-card thinking-player');
    expect(html).toContain('role="status"');
  });

  it('획득 패를 광·열끗·띠·피 묶음으로 나누고 보너스 삼피를 피 수에 반영한다', () => {
    const html = renderToStaticMarkup(<CapturedCardRack
      owner="human"
      cardIds={['m01-01', 'm02-01', 'm01-02', 'm01-03', 'bonus-double-pee-1']}
    />);
    expect(html).toContain('captured-bright');
    expect(html).toContain('captured-animal');
    expect(html).toContain('captured-ribbon');
    expect(html).toContain('captured-junk');
    expect(html).toContain('피 4');
  });

  it('국진 선택은 빈 바닥이 아니라 획득한 국진 패에 붙여 표시한다', () => {
    const html = renderToStaticMarkup(<CapturedCardRack
      owner="human"
      cardIds={['m09-01', 'm01-03']}
      gookjinAsDoubleJunk
      onToggleGookjin={() => undefined}
    />);
    expect(html).toContain('gookjin-card-toggle');
    expect(html).toContain('국진은 현재 쌍피, 눌러서 변경');
    expect(html).toContain('<em>쌍피</em>');
    expect(html).toContain('피 3');
    expect(html).not.toContain('captured-animal');
    expect(html.indexOf('captured-junk')).toBeLessThan(html.indexOf('gookjin-card-toggle'));
  });

  it('국진을 먹으면 열끗과 쌍피 중 하나를 크게 선택할 수 있다', () => {
    const html = renderToStaticMarkup(<GookjinDecisionPanel currentAsDoubleJunk={false} onDecision={() => undefined} />);
    expect(html).toContain('국진 열끗 또는 쌍피 선택');
    expect(html).toContain('열끗으로 사용');
    expect(html).toContain('쌍피로 사용');
    expect(html).toContain('피 2장으로 계산');
  });

  it('손패 열 칸을 유지하며 먹을 패·보너스패·폭탄 뒤집기 차례를 강조한다', () => {
    const html = renderToStaticMarkup(<HumanHandRow
      cardIds={['m01-01', 'm01-02', 'm01-03', 'm02-01', 'bonus-double-pee-1']}
      floorCardIds={['m01-04']}
      bombSkips={2}
      shakenMonths={[2]}
      requiredMonth={2}
      showHints
      disabled={false}
      flipOnlyDisabled={false}
      onPlay={() => undefined}
      onFlipOnly={() => undefined}
    />);
    expect(html.match(/hand-card-slot/g)).toHaveLength(10);
    expect(html).toContain('match-hint');
    expect(html).toContain('bonus-hint');
    expect(html).toContain('pending-shake-card');
    expect(html.match(/bomb-ready-mark/g)).toHaveLength(3);
    expect(html.match(/bomb-skip-slot/g)).toHaveLength(2);
    expect(html).toContain('보관한 폭탄 패: 눌러서 덱 뒤집기');
    expect(html).toContain('보관한 폭탄 빈 차례');
  });

  it('흔들 수 있는 같은 월 세 장 위에 황금 흔들기 표시를 붙인다', () => {
    const html = renderToStaticMarkup(<HumanHandRow
      cardIds={['m02-01', 'm02-02', 'm02-03']}
      floorCardIds={['m01-01']}
      bombSkips={0}
      showHints
      disabled={false}
      onPlay={() => undefined}
    />);
    expect(html.match(/shake-ready-mark/g)).toHaveLength(3);
    expect(html).toContain('2월 흔들기 가능: 패를 누르세요');
  });

  it('점수 아래에 고·흔들기·폭탄 표시를 구분해 보여준다', () => {
    const html = renderToStaticMarkup(<TableScoreBadge owner="human" score={8} goCount={1}
      shakeMultiplierCount={3} bombCount={2} />);
    expect(html).toContain('내 점수 8점, 1고, 흔들기 1회, 폭탄 2회');
    expect(html).toContain('shake-status-icon');
    expect(html).toContain('bomb-status-icon');
  });

  it('첫 판 시작 전에 펼친 열두 장 중 한 장을 골라 낮장으로 선을 정한다', () => {
    const html = renderToStaticMarkup(<StartingPlayerChoice seed={20260719} daytime onSelect={() => undefined} onExit={() => undefined} />);
    expect(html).toContain('낮장 · 높은 월이 선입니다');
    expect(html.match(/class="dealer-pick-card"/g)).toHaveLength(12);
    expect(html).toContain('1번 뒤집힌 선택패');
    expect(html).toContain('12번 뒤집힌 선택패');
    expect(html).toContain('dealer-exit-button');
  });

  it('같은 월의 바닥패가 두 장이면 선택 후보를 좌우 전용 영역에 표시한다', () => {
    const html = renderToStaticMarkup(<FloorCardField
      cardIds={['m01-02', 'm01-03', 'm02-01']}
      choice={{ playedCardId: 'm01-01', candidateIds: ['m01-02', 'm01-03'], source: 'hand' }}
      onSelect={() => undefined}
      onCancel={() => undefined}
    />);
    expect(html.match(/floor-choice-candidate/g)).toHaveLength(2);
    expect(html).toContain('floor-choice-pair');
    expect(html).toContain('floor-choice-candidate choice-left');
    expect(html).toContain('floor-choice-candidate choice-right');
    expect(html).toContain('1월, 어느 패를 먹을까요?');
    expect(html).toContain('파란 화살표가 있는 바닥패를 누르세요');
    expect(html).toContain('다른 손패 고르기');
  });

  it('뒤집은 패가 바닥패 두 장과 맞을 때도 뒤집은 패와 선택 후보를 함께 보여준다', () => {
    const html = renderToStaticMarkup(<FloorCardField
      cardIds={['m02-01', 'm02-02', 'm03-01']}
      choice={{ playedCardId: 'm02-03', candidateIds: ['m02-01', 'm02-02'], source: 'draw' }}
      onSelect={() => undefined}
      onCancel={() => undefined}
    />);
    expect(html).toContain('floor-choice-drawn-preview');
    expect(html).toContain('뒤집은 2월 패, 어느 패를 먹을까요?');
    expect(html).not.toContain('다른 손패 고르기');
  });
});
