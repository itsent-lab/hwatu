export type ScoreCode = 'bright' | 'animal' | 'godori' | 'ribbon' | 'hongdan' | 'cheongdan' | 'chodan' | 'junk';
export type BakCode = 'pi-bak' | 'gwang-bak' | 'meong-bak' | 'go-bak';

export interface ScoreLine {
  code: ScoreCode;
  label: string;
  points: number;
  description: string;
}

export interface CapturedScore {
  total: number;
  brightCount: number;
  animalCount: number;
  ribbonCount: number;
  junkCount: number;
  hasRainBright: boolean;
  gookjinAsDoubleJunk: boolean;
  lines: ScoreLine[];
}

export interface SettlementStep {
  label: string;
  formula: string;
  value: number;
}

export interface RoundSettlement {
  scoreLines?: ScoreLine[];
  baseScore: number;
  goBonus: number;
  goMultiplier: number;
  shakeMultiplier: number;
  missionMultiplier: number;
  roundMultiplier?: number;
  baks: Array<{ code: BakCode; label: string; multiplier: number }>;
  bakMultiplier: number;
  finalScore: number;
  pointValue: number;
  displayAmount: number;
  isRealCurrency: false;
  isExchangeable: false;
  steps: SettlementStep[];
}
