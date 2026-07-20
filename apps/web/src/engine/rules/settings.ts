export interface GameRuleSettings {
  targetScore: number;
  pointValue: number;
  bright: { rainThree: number; three: number; four: number; five: number };
  setScore: number;
  godoriScore: number;
  animalStart: number;
  ribbonStart: number;
  junkStart: number;
  bakMultiplier: number;
  allowTwoCardBomb: boolean;
  threePpeokBaseScore: number;
}

export const MATGO_POINT_VALUES = [100, 1_000, 2_000, 5_000, 10_000] as const;
export type MatgoPointValue = typeof MATGO_POINT_VALUES[number];

export function isMatgoPointValue(value: unknown): value is MatgoPointValue {
  return typeof value === 'number' && (MATGO_POINT_VALUES as readonly number[]).includes(value);
}

export function normalizeMatgoPointValue(value: unknown): MatgoPointValue {
  return isMatgoPointValue(value) ? value : 100;
}

export const DEFAULT_MATGO_RULES: Readonly<GameRuleSettings> = Object.freeze({
  targetScore: 7,
  pointValue: 100,
  bright: { rainThree: 2, three: 3, four: 4, five: 15 },
  setScore: 3,
  godoriScore: 5,
  animalStart: 5,
  ribbonStart: 5,
  junkStart: 10,
  bakMultiplier: 2,
  allowTwoCardBomb: true,
  threePpeokBaseScore: 7
});

export function matgoRulesForPointValue(pointValue: unknown): GameRuleSettings {
  return { ...DEFAULT_MATGO_RULES, pointValue: normalizeMatgoPointValue(pointValue) };
}
