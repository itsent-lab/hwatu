export function normalizeSeed(seed: number): number {
  const normalized = Number(seed) >>> 0;
  return normalized === 0 ? 0x9e3779b9 : normalized;
}
export function nextRandom(seed: number): { seed: number; value: number } {
  let value = normalizeSeed(seed);
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  value >>>= 0;
  return { seed: value, value: value / 0x100000000 };
}

export function randomInteger(seed: number, maxExclusive: number): { seed: number; value: number } {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError('maxExclusive must be a positive integer');
  }
  const next = nextRandom(seed);
  return { seed: next.seed, value: Math.floor(next.value * maxExclusive) };
}
