import { getCard } from '../engine/cards';
import { getHwatuAssetUrl } from '../data/hwatuAssets';

interface Props {
  cardId: string;
  small?: boolean;
  disabled?: boolean;
  selected?: boolean;
  shortcutLabel?: string;
  onClick?: (element: HTMLButtonElement) => void;
}

export default function HwatuCard({ cardId, small = false, disabled, selected = false, shortcutLabel, onClick }: Props) {
  const card = getCard(cardId);
  const assetUrl = getHwatuAssetUrl(cardId);
  const isBonus = Boolean(card?.tags.includes('bonus-pee'));
  const bonusValue = card?.tags.includes('triple-junk') ? 3 : 2;
  const content = isBonus
    ? <span className="bonus-card-face"><b>{bonusValue}</b><em>보너스</em><small>피뺏기</small></span>
    : card && assetUrl
    ? <img className="card-art" src={assetUrl} alt="" draggable={false} />
    : <span className="card-fallback">{card?.name ?? cardId}</span>;
  const className = `hwatu-card card-${card?.type ?? 'unknown'}${isBonus ? ' bonus-card' : ''}${small ? ' small-card' : ''}`;
  const label = `${isBonus ? '' : `${card?.month ?? '?'}월 `}${card?.name ?? '알 수 없는 패'}${selected ? ', 선택됨, 한 번 더 누르면 냅니다' : ''}${shortcutLabel ? `, 숫자키 ${shortcutLabel}` : ''}`;
  if (onClick) {
    return <button type="button" className={className} data-card-id={cardId} disabled={disabled} aria-label={label} aria-pressed={selected || undefined} onClick={event => onClick(event.currentTarget)}>{content}{shortcutLabel && <kbd className="card-shortcut" aria-hidden="true">{shortcutLabel}</kbd>}</button>;
  }
  return <div className={className} data-card-id={cardId} aria-label={label}>{content}</div>;
}
