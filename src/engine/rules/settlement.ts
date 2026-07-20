import { PMANG_MATGO_RULES, type GameRuleSettings } from './settings';
import type { BakCode, CapturedScore, RoundSettlement } from './types';

export interface SettlementOptions {
  winnerScore: CapturedScore;
  loserScore: CapturedScore;
  winnerGoCount: number;
  winnerShakeCount?: number;
  winnerMissionMultiplier?: number;
  roundMultiplier?: number;
  loserGoCount?: number;
  loserScoreAtLastGo?: number;
  settings?: GameRuleSettings;
  suppressMultipliers?: boolean;
  forcedBaseScore?: number;
}

const BAK_LABELS: Record<BakCode, string> = {
  'pi-bak': '피박', 'gwang-bak': '광박', 'meong-bak': '멍박', 'go-bak': '고박'
};

export function calculateGoMultiplier(goCount: number): number {
  return goCount >= 3 ? 2 ** (goCount - 2) : 1;
}

export function calculateSettlement(options: SettlementOptions): RoundSettlement {
  const settings = options.settings ?? PMANG_MATGO_RULES;
  const baseScore = options.forcedBaseScore ?? options.winnerScore.total;
  const goBonus = options.suppressMultipliers ? 0 : Math.max(0, options.winnerGoCount);
  const goMultiplier = options.suppressMultipliers ? 1 : calculateGoMultiplier(options.winnerGoCount);
  const shakeMultiplier = options.suppressMultipliers ? 1 : 2 ** Math.max(0, options.winnerShakeCount ?? 0);
  const missionMultiplier = options.suppressMultipliers ? 1 : Math.max(1, options.winnerMissionMultiplier ?? 1);
  const roundMultiplier = Math.max(1, options.roundMultiplier ?? 1);
  const bakCodes: BakCode[] = [];

  if (!options.suppressMultipliers) {
    if (options.winnerScore.junkCount >= settings.junkStart && options.loserScore.junkCount <= 7) bakCodes.push('pi-bak');
    if (options.winnerScore.brightCount === 5 || (options.winnerScore.brightCount >= 3 && options.loserScore.brightCount === 0)) bakCodes.push('gwang-bak');
    if (options.loserScore.animalCount === 0) bakCodes.push('meong-bak');
    if ((options.loserGoCount ?? 0) > 0 && options.loserScore.total <= (options.loserScoreAtLastGo ?? -1)) bakCodes.push('go-bak');
  }

  const baks = bakCodes.map(code => ({ code, label: BAK_LABELS[code], multiplier: settings.bakMultiplier }));
  const bakMultiplier = baks.reduce(multiplier => multiplier * settings.bakMultiplier, 1);
  const scoreWithGo = (baseScore + goBonus) * goMultiplier;
  const scoreWithShake = scoreWithGo * shakeMultiplier;
  const scoreWithMission = scoreWithShake * missionMultiplier;
  const scoreWithBaks = scoreWithMission * bakMultiplier;
  const finalScore = scoreWithBaks * roundMultiplier;
  const steps = [
    { label: '기본점수', formula: `${baseScore}점`, value: baseScore },
    { label: '고 점수', formula: `${baseScore} + ${goBonus}`, value: baseScore + goBonus },
    { label: '고 배수', formula: `${baseScore + goBonus} × ${goMultiplier}`, value: scoreWithGo },
    { label: '흔들기·폭탄', formula: `${scoreWithGo} × ${shakeMultiplier}`, value: scoreWithShake },
    { label: '미션 배수', formula: `${scoreWithShake} × ${missionMultiplier}`, value: scoreWithMission },
    { label: '박 배수', formula: `${scoreWithMission} × ${bakMultiplier}`, value: scoreWithBaks },
    ...(roundMultiplier > 1 ? [{ label: '나가리 이월', formula: `${scoreWithBaks} × ${roundMultiplier}`, value: finalScore }] : [])
  ];
  return {
    scoreLines: options.winnerScore.lines,
    baseScore, goBonus, goMultiplier, shakeMultiplier, missionMultiplier, roundMultiplier, baks, bakMultiplier, finalScore,
    pointValue: settings.pointValue,
    displayAmount: finalScore * settings.pointValue,
    isRealCurrency: false,
    isExchangeable: false,
    steps
  };
}
