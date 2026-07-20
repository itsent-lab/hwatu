import type { RoundSettlement } from '../engine/rules/types';

export default function SettlementImpact({ settlement }: { settlement: RoundSettlement }) {
  const scores = settlement.scoreLines?.filter(line => line.points > 0) ?? [];
  const multipliers = [
    settlement.goMultiplier > 1 ? { label: '고', value: settlement.goMultiplier } : null,
    settlement.shakeMultiplier > 1 ? { label: '흔들기·폭탄', value: settlement.shakeMultiplier } : null,
    settlement.missionMultiplier > 1 ? { label: '미션', value: settlement.missionMultiplier } : null,
    (settlement.roundMultiplier ?? 1) > 1 ? { label: '나가리 이월', value: settlement.roundMultiplier ?? 1 } : null
  ].filter(item => item !== null);
  const summary = [
    ...(scores.length ? scores.map(line => `${line.label} ${line.points}점`) : [`기본 ${settlement.baseScore}점`]),
    ...multipliers.map(item => `${item.label} ${item.value}배`),
    ...settlement.baks.map(bak => `${bak.label} ${bak.multiplier}배`)
  ].join(', ');
  return <div className="settlement-impact" aria-label={summary}>
    <div className="settlement-impact-items">
      {scores.length ? scores.map(line => <span className="settlement-impact-score" key={line.code}><em>{line.label}</em><b>+{line.points}점</b></span>) : <span className="settlement-impact-score"><em>기본 점수</em><b>{settlement.baseScore}점</b></span>}
      {multipliers.map(item => <span className="settlement-impact-multiplier" key={item.label}><em>{item.label}</em><b>×{item.value}</b></span>)}
      {settlement.baks.map(bak => <span className="settlement-impact-bak" key={bak.code}><em>{bak.label}</em><b>×{bak.multiplier}</b></span>)}
    </div>
  </div>;
}
