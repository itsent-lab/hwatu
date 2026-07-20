interface GoStopDecisionPanelProps {
  owner: 'human' | 'computer';
  score: number;
  nextGoCount: number;
  stopScore: number;
  stopAmount: number;
  opponentBalance?: number;
  disabled?: boolean;
  onDecision?: (decision: 'go' | 'stop') => void;
}

const money = (value: number) => new Intl.NumberFormat('ko-KR').format(value);

export default function GoStopDecisionPanel({
  owner,
  score,
  nextGoCount,
  stopScore,
  stopAmount,
  opponentBalance,
  disabled = false,
  onDecision
}: GoStopDecisionPanelProps) {
  const computerThinking = owner === 'computer';
  const allInAmount = !computerThinking && opponentBalance !== undefined && opponentBalance > 0 && stopAmount >= opponentBalance ? opponentBalance : null;
  const confirmedAmount = allInAmount ?? stopAmount;
  return <section
    className={`go-stop-choice-panel${computerThinking ? ' opponent-go-stop' : ''}`}
    role={computerThinking ? 'status' : 'dialog'}
    aria-live={computerThinking ? 'polite' : undefined}
    aria-label={computerThinking ? `상대 ${score}점, 고 또는 스톱 결정 중` : `현재 ${score}점, 고 또는 스톱 선택`}
  >
    <div className="go-stop-score-medal" aria-hidden="true">
      <span>{computerThinking ? '상대' : '현재'}</span>
      <strong>{score}</strong>
      <b>점</b>
    </div>
    <div className="go-stop-heading">
      <span>{computerThinking ? '상대 선택' : '승부 선택'}</span>
      <p>{computerThinking ? '상대가 고 · 스톱을 결정 중입니다' : '고를 하시겠습니까?'}</p>
    </div>
    {allInAmount !== null && <div className="go-stop-all-in" role="alert"><strong>상대가 올인입니다</strong><span>스톱 시 {money(allInAmount)}냥 전액 획득</span></div>}
    <div className="go-stop-buttons" aria-hidden={computerThinking || undefined}>
      <button className="go-choice-button" type="button" aria-label={`${nextGoCount}고, 승부 계속`} disabled={disabled || computerThinking} onClick={() => onDecision?.('go')}>
        <span>한 판 더</span>
        <strong>{nextGoCount}고!</strong>
        <small>점수와 배수에 도전</small>
      </button>
      <button className="stop-choice-button" type="button" aria-label={`스톱, ${stopScore}점 ${money(confirmedAmount)}냥 확정`} disabled={disabled || computerThinking} onClick={() => onDecision?.('stop')}>
        <span>지금 끝내기</span>
        <strong>스톱!</strong>
        <small><b>{stopScore}점</b> · {money(confirmedAmount)}냥 확정</small>
      </button>
    </div>
    {computerThinking
      ? <div className="go-stop-thinking"><i /><i /><i /><span>고와 스톱을 생각하고 있습니다</span></div>
      : <p className="go-stop-board-guide"><span aria-hidden="true">◈</span> 바닥패를 보며 천천히 결정하세요</p>}
  </section>;
}
