import type { GameState } from '../engine/types';
import SettlementImpact from './SettlementImpact';

export interface MoneyTransfer {
  humanBefore: number;
  humanAfter: number;
  computerBefore: number;
  computerAfter: number;
  computerRefillAfter?: number;
  amount: number;
  appliedNow: boolean;
}

interface RoundResultOverlayProps {
  game: GameState;
  opponentName?: string;
  exitReserved?: boolean;
  moneyTransfer?: MoneyTransfer | null;
  balanceEmpty?: boolean;
  disabled?: boolean;
  onContinue: () => void;
  onExit: () => void;
  onReturnHome?: () => void;
}

const money = (value: number) => new Intl.NumberFormat('ko-KR').format(value);

export default function RoundResultOverlay({ game, opponentName = '상대', exitReserved = false, moneyTransfer, balanceEmpty = false, disabled = false, onContinue, onExit, onReturnHome = onExit }: RoundResultOverlayProps) {
  const settlement = game.settlement;
  const winner = game.winner === 'human' ? '내가 이겼습니다!' : game.winner === 'computer' ? `${opponentName} 님이 이겼습니다.` : '이번 판은 나가리입니다.';
  const transferTone = !moneyTransfer
    ? ''
    : moneyTransfer.amount > 0
      ? 'money-win'
      : moneyTransfer.amount < 0
        ? 'money-loss'
        : 'money-neutral';
  return <div className="round-result-overlay">
    <section className="round-result-card">
      <div className="result-scroll-content">
        <p className="result-kicker">판 결과</p>
        <h2>{winner}</h2>
        {settlement ? <>
          <div className="result-score"><strong>{settlement.finalScore}</strong><span>점</span></div>
          <SettlementImpact settlement={settlement} />
          {moneyTransfer ? <div className={`money-transfer-card ${transferTone}${moneyTransfer.appliedNow ? ' money-animated' : ''}`} aria-live="polite">
            <div className="money-coins" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <i key={index}>냥</i>)}</div>
            <strong>{moneyTransfer.amount > 0 ? '+' : ''}{money(moneyTransfer.amount)}냥</strong>
            {moneyTransfer.amount > 0 && moneyTransfer.computerAfter === 0 && <p className="all-in-result"><b>ALL IN</b><span>{opponentName} 게임머니 전액 획득</span></p>}
            {moneyTransfer.computerRefillAfter !== undefined && <p className="opponent-refill-note"><b>{opponentName} 자동 리필</b><span>0 → {money(moneyTransfer.computerRefillAfter)}냥</span></p>}
          </div> : <p className="money-pending">게임머니 {money(settlement.displayAmount)}냥을 정산하고 있습니다.</p>}
        </> : <p className="nagari-note">{game.roundResult === 'nagari' && game.lastAction
          ? `${game.lastAction} 다음 판은 ${(game.roundMultiplier ?? 1) * 2}배로 진행됩니다.`
          : '승부가 나지 않아 정산 없이 새 판으로 넘어갑니다.'}</p>}
      </div>
      {balanceEmpty ? <>
        <div className="result-footer">
          <p className="result-question balance-empty-notice">게임머니가 0냥입니다. 대기실에서 리필한 뒤 다시 시작해 주세요.</p>
          <button type="button" className="result-new-button refill-home-button" disabled={disabled} onClick={onReturnHome}>대기실로 가서 리필 받기</button>
        </div>
      </> : exitReserved ? <>
        <div className="result-footer">
          <p className="result-question">예약하신 대로 잠시 후 게임을 나갑니다.</p>
          <button type="button" className="result-exit-button" disabled={disabled} onClick={onExit}>지금 나가기</button>
        </div>
      </> : <>
        <div className="result-footer">
          <p className="result-question">계속하시겠습니까? 확인하면 다음 판이 바로 시작됩니다.</p>
          <div className="result-actions">
            <button type="button" className="result-new-button" disabled={disabled} onClick={onContinue}>확인 · 바로 시작</button>
            <button type="button" className="result-exit-button" disabled={disabled} onClick={onExit}>나가기</button>
          </div>
        </div>
      </>}
    </section>
  </div>;
}
