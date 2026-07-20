import type { CSSProperties } from 'react';
import AiThinkingIndicator from './AiThinkingIndicator';
import type { AiThinkingPlan } from '../engine/ai/thinking';

interface Props {
  name: string;
  balance: number;
  human?: boolean;
  active?: boolean;
  first?: boolean;
  thinking?: AiThinkingPlan | null;
  profileImageUrl?: string | null;
  onProfileImageChange?: (file: File) => Promise<void>;
  profileImageUploading?: boolean;
}

export default function GamePlayerPanel({ name, balance, human = false, active = false, first = false, thinking = null, profileImageUrl, onProfileImageChange, profileImageUploading = false }: Props) {
  const safeBalance = Number.isFinite(balance) ? balance : 0;
  const balanceText = `${new Intl.NumberFormat('ko-KR').format(safeBalance)}냥`;
  const balanceUnits = [...balanceText].reduce((total, character) => total + (/\d/.test(character) ? .62 : character === ',' ? .33 : character === '-' ? .5 : 1), 0);
  const balanceStyle = { '--balance-fit-size': `${(94 / balanceUnits).toFixed(2)}cqw` } as CSSProperties;
  const portrait = profileImageUrl
    ? <img src={profileImageUrl} alt="" />
    : <span aria-hidden="true">{human ? '🙂' : '🐶'}</span>;
  return <section className={`game-player-card${human ? ' human-player' : ''}${active ? ' active-player' : ''}${thinking ? ' thinking-player' : ''}`}>
    <div className="player-name" title={name}><span>{name}</span>{first && <b className="first-player-badge">선</b>}</div>
    <div className="player-balance-frame"><div className="player-balance" style={balanceStyle}>{balanceText}</div></div>
    {thinking && <AiThinkingIndicator plan={thinking} />}
    {human && onProfileImageChange ? <>
      <div className="player-portrait profile-image-button" title="눌러서 사진 앱에서 선택">
        <input className="profile-image-input" type="file" accept="image/*,.heic,.heif" aria-label="사진 앱에서 프로필 사진 선택" disabled={profileImageUploading} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; if (file) void onProfileImageChange(file); }} />
        {portrait}{profileImageUploading && <b>저장 중</b>}
      </div>
    </> : <div className="player-portrait">{portrait}</div>}
  </section>;
}
