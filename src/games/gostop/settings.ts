export const GOSTOP_POINT_VALUES = [100, 1_000, 2_000, 5_000, 10_000] as const;
export type GostopPointValue = typeof GOSTOP_POINT_VALUES[number];

export function isGostopPointValue(value: unknown): value is GostopPointValue {
  return typeof value === 'number' && (GOSTOP_POINT_VALUES as readonly number[]).includes(value);
}

export function normalizeGostopPointValue(value: unknown): GostopPointValue {
  return isGostopPointValue(value) ? value : 100;
}
