interface ExitChoiceDialogProps {
  onReserve: () => void;
  onImmediate: () => void;
  onCancel: () => void;
  guide?: string;
  immediateDescription?: string;
}

export default function ExitChoiceDialog({ onReserve, onImmediate, onCancel, guide = '현재 판을 마친 뒤 나가거나, 진행 상태를 저장하고 지금 바로 나갈 수 있습니다.', immediateDescription = '현재 진행을 저장하고 바로 나갑니다' }: ExitChoiceDialogProps) {
  return <div className="exit-dialog-backdrop" role="presentation">
    <section className="exit-dialog" role="dialog" aria-modal="true" aria-labelledby="exit-dialog-title">
      <p className="result-kicker">게임 나가기</p>
      <h2 id="exit-dialog-title">어떻게 나갈까요?</h2>
      <p className="exit-dialog-guide">{guide}</p>
      <div className="exit-choice-list">
        <button type="button" className="reserve-exit-button" onClick={onReserve}>
          <b>예약 나가기</b>
          <span>이번 판까지만 치고 나갑니다</span>
        </button>
        <button type="button" className="immediate-exit-button" onClick={onImmediate}>
          <b>바로 나가기</b>
          <span>{immediateDescription}</span>
        </button>
      </div>
      <button type="button" className="exit-cancel-button" onClick={onCancel}>계속 게임하기</button>
    </section>
  </div>;
}
