import type { CapturedScore } from '../engine/rules/types';

interface GostopScoreSummaryProps {
  score: CapturedScore;
  capturedCount: number;
  goCount: number;
}

export default function GostopScoreSummary({ score, capturedCount, goCount }: GostopScoreSummaryProps) {
  return <div className="gostop-score-summary" aria-label={`현재 ${score.total}점, 획득패 ${capturedCount}장`}>
    <strong>{score.total}<small>점</small></strong>
    <span>광 {score.brightCount} · 열끗 {score.animalCount} · 띠 {score.ribbonCount} · 피 {score.junkCount}</span>
    {goCount > 0 && <b>{goCount}고</b>}
  </div>;
}
