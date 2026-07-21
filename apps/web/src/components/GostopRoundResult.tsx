import { scoreGostopPlayer, type GostopRoomState } from '../games/gostop/gameState';
import { computerPlayerName } from '../lib/computerPlayers';

interface GostopRoundResultProps {
  room: GostopRoomState;
  winnerName: string;
  exitReserved?: boolean;
  balanceEmpty?: boolean;
  onContinue: () => void;
  onExit: () => void;
  onReturnLobby?: () => void;
}

export default function GostopRoundResult({ room, winnerName, exitReserved = false, balanceEmpty = false, onContinue, onExit, onReturnLobby }: GostopRoundResultProps) {
  const won = room.roundResult === 'win' && room.winner;
  const score = won ? scoreGostopPlayer(room, room.winner!) : null;
  const humanDelta = (room.settlement?.pointDeltas.human ?? room.interimPointDeltas.human) * room.pointValue;
  return <div className="round-result-overlay">
    <section className="round-result-card gostop-result-card" role="dialog" aria-label="고스톱 판 결과">
      <div className="result-scroll-content">
        <p className="result-kicker">고스톱 판 결과</p>
        <h2>{won ? `${winnerName} 승리!` : '이번 판은 나가리입니다.'}</h2>
        {won && <>
          <div className="result-score"><strong>{room.finalScore}</strong><span>점</span></div>
          <div className="settlement-impact">
            <div className="settlement-impact-items">
              {score?.lines.map(line => <span className="settlement-impact-score" key={line.code}><em>{line.label}</em><b>+{line.points}점</b></span>)}
              {room.players[room.winner!].goCount > 0 && <span className="settlement-impact-multiplier"><em>고 선언</em><b>{room.players[room.winner!].goCount}고</b></span>}
              {(room.settlement?.goMultiplier ?? 1) > 1 && <span className="settlement-impact-multiplier"><em>고 배수</em><b>×{room.settlement?.goMultiplier}</b></span>}
              {(room.settlement?.shakeBombMultiplier ?? 1) > 1 && <span className="settlement-impact-multiplier"><em>흔들기·폭탄</em><b>×{room.settlement?.shakeBombMultiplier}</b></span>}
              {(room.settlement?.meongttaMultiplier ?? 1) > 1 && <span className="settlement-impact-multiplier"><em>멍따</em><b>×2</b></span>}
              {room.roundMultiplier > 1 && <span className="settlement-impact-multiplier"><em>나가리 이월</em><b>×{room.roundMultiplier}</b></span>}
              {room.settlement?.loserPayments.flatMap(payment => payment.baks.map(bak => <span className="settlement-impact-bak" key={`${payment.loser}-${bak}`}><em>{bak === 'pi-bak' ? '피박' : '광박'}</em><b>{payment.loser === 'human' ? '나' : computerPlayerName(payment.loser, room.computerPlayers)} ×2</b></span>))}
              {room.settlement?.dokbakPlayer && <span className="settlement-impact-bak"><em>독박</em><b>{room.settlement.dokbakPlayer === 'human' ? '나' : computerPlayerName(room.settlement.dokbakPlayer, room.computerPlayers)} 두 몫 부담</b></span>}
            </div>
          </div>
          <div className={`money-transfer-card ${humanDelta >= 0 ? 'money-win' : 'money-loss'} money-animated`}>
            <div className="money-coins" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <i key={index}>냥</i>)}</div>
            <small>내 게임머니 증감</small><strong>{humanDelta > 0 ? '+' : ''}{humanDelta.toLocaleString('ko-KR')}냥</strong>
          </div>
        </>}
        {!won && <>
          <p className="nagari-note">{room.lastAction} 다음 판은 2배로 진행됩니다.</p>
          {humanDelta !== 0 && <div className={`money-transfer-card ${humanDelta > 0 ? 'money-win' : 'money-loss'} money-animated`}>
            <small>첫뻑·연뻑·첫따닥 보상</small><strong>{humanDelta > 0 ? '+' : ''}{humanDelta.toLocaleString('ko-KR')}냥</strong>
          </div>}
        </>}
      </div>
      <div className="result-footer">
        <p className={`result-question${balanceEmpty ? ' balance-empty-notice' : ''}`}>{balanceEmpty
          ? '게임머니가 0냥입니다. 대기실에서 리필한 뒤 다시 시작해 주세요.'
          : exitReserved ? '예약하신 대로 잠시 후 게임을 나갑니다.' : '한 판 더 진행할까요?'}</p>
        {balanceEmpty
          ? <button type="button" className="result-new-button refill-home-button" onClick={onReturnLobby ?? onExit}>대기실로 가서 리필 받기</button>
          : exitReserved
          ? <button type="button" className="result-exit-button" onClick={onExit}>지금 나가기</button>
          : <div className="result-actions"><button type="button" className="result-new-button" onClick={onContinue}>한 판 더</button><button type="button" className="result-exit-button" onClick={onExit}>나가기</button></div>}
      </div>
    </section>
  </div>;
}
