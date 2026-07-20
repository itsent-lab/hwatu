export type RoundMultiplier = number;

export function nextRoundMultiplier(
  roundResult: 'win' | 'nagari' | null | undefined,
  currentMultiplier: number | undefined = 1
): RoundMultiplier {
  return roundResult === 'nagari' ? Math.max(1, currentMultiplier) * 2 : 1;
}
