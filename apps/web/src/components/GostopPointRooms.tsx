import { GOSTOP_POINT_VALUES, type GostopPointValue } from '../games/gostop/settings';

interface GostopPointRoomsProps {
  disabled?: boolean;
  onEnter: (pointValue: GostopPointValue) => void;
}

const ROOM_LABELS: Record<GostopPointValue, string> = {
  100: '가볍게',
  1_000: '신나게',
  2_000: '짜릿하게',
  5_000: '화끈하게',
  10_000: '큰 승부'
};

export default function GostopPointRooms({ disabled = false, onEnter }: GostopPointRoomsProps) {
  return <fieldset className="dashboard-point-entry gostop-point-rooms" aria-label="고스톱 점당 금액을 고르고 입장하세요">
    <legend>점당 게임머니</legend>
    <div>{GOSTOP_POINT_VALUES.map(pointValue => <button
      type="button"
      key={pointValue}
      disabled={disabled}
      onClick={() => onEnter(pointValue)}
    >
      <span className="room-kind">3인 고스톱</span>
      <b className="room-stake">점 {pointValue.toLocaleString('ko-KR')}냥</b>
      <small>{ROOM_LABELS[pointValue]}</small>
      <span className="room-enter">입장</span>
    </button>)}</div>
  </fieldset>;
}
