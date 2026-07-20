import { DEFAULT_MATGO_RULES, type GameRuleSettings } from './settings';

export function canChooseGoStop(score: number, scoreAtLastGo: number, settings: GameRuleSettings = DEFAULT_MATGO_RULES): boolean {
  return score >= settings.targetScore && score > scoreAtLastGo;
}

export function chooseComputerGoStop(score: number, goCount: number, cardsRemaining: number): 'go' | 'stop' {
  if (goCount === 0 && score < 10 && cardsRemaining >= 3) return 'go';
  return 'stop';
}
