export type RoundMultiplier = number;
export const MAX_NAGARI_MULTIPLIER = 8;

export function nextRoundMultiplier(
  roundResult: 'win' | 'nagari' | null | undefined,
  currentMultiplier: number | undefined = 1
): RoundMultiplier {
  return roundResult === 'nagari'
    ? Math.min(MAX_NAGARI_MULTIPLIER, Math.max(1, currentMultiplier) * 2)
    : 1;
}
