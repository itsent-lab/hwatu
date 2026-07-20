import { scoreGostopPlayer, type GostopRoomState } from '../games/gostop/gameState';

interface GostopRoundResultProps {
  room: GostopRoomState;
  winnerName: string;
  exitReserved?: boolean;
  onContinue: () => void;
  onExit: () => void;
}

export default function GostopRoundResult({ room, winnerName, exitReserved = false, onContinue, onExit }: GostopRoundResultProps) {
  const won = room.roundResult === 'win' && room.winner;
  const score = won ? scoreGostopPlayer(room, room.winner!) : null;
  const amount = Math.max(0, room.finalScore * room.pointValue);
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
              {room.roundMultiplier > 1 && <span className="settlement-impact-multiplier"><em>나가리 이월</em><b>×{room.roundMultiplier}</b></span>}
            </div>
          </div>
          <div className="money-transfer-card money-win money-animated">
            <div className="money-coins" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <i key={index}>냥</i>)}</div>
            <small>상대 한 명당 정산 기준</small><strong>{amount.toLocaleString('ko-KR')}냥</strong>
          </div>
        </>}
        {!won && <p className="nagari-note">{room.lastAction} 다음 판은 {room.roundMultiplier * 2}배로 진행됩니다.</p>}
      </div>
      <div className="result-footer">
        <p className="result-question">{exitReserved ? '예약하신 대로 잠시 후 게임을 나갑니다.' : '한 판 더 진행할까요?'}</p>
        {exitReserved
          ? <button type="button" className="result-exit-button" onClick={onExit}>지금 나가기</button>
          : <div className="result-actions"><button type="button" className="result-new-button" onClick={onContinue}>한 판 더</button><button type="button" className="result-exit-button" onClick={onExit}>나가기</button></div>}
      </div>
    </section>
  </div>;
}
