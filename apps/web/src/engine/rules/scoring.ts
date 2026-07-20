import { getCard } from '../cards';
import { DEFAULT_MATGO_RULES, type GameRuleSettings } from './settings';
import type { CapturedScore, ScoreLine } from './types';

export interface ScoreOptions {
  gookjinAsDoubleJunk?: boolean;
  settings?: GameRuleSettings;
}

function countSet(cardIds: string[], tag: string): boolean {
  return cardIds.filter(id => getCard(id)?.tags.includes(tag)).length === 3;
}

export function calculateCapturedScore(cardIds: string[], options: ScoreOptions = {}): CapturedScore {
  const settings = options.settings ?? DEFAULT_MATGO_RULES;
  const gookjinAsDoubleJunk = options.gookjinAsDoubleJunk ?? false;
  const cards = cardIds.map(getCard).filter(card => card !== null);
  const scoringCards = cards.filter(card => !(gookjinAsDoubleJunk && card.tags.includes('gookjin')));
  const brightCards = scoringCards.filter(card => card.type === 'bright');
  const animalCards = scoringCards.filter(card => card.type === 'animal');
  const ribbonCards = scoringCards.filter(card => card.type === 'ribbon');
  const hasRainBright = brightCards.some(card => card.tags.includes('rain-bright'));
  const baseJunkCount = scoringCards.reduce((count, card) => count + (
    card.tags.includes('triple-junk') ? 3 : card.type === 'doubleJunk' ? 2 : card.type === 'junk' ? 1 : 0
  ), 0);
  const junkCount = baseJunkCount + (gookjinAsDoubleJunk && cards.some(card => card.tags.includes('gookjin')) ? 2 : 0);
  const lines: ScoreLine[] = [];

  let brightPoints = 0;
  if (brightCards.length >= 5) brightPoints = settings.bright.five;
  else if (brightCards.length === 4) brightPoints = settings.bright.four;
  else if (brightCards.length === 3) brightPoints = hasRainBright ? settings.bright.rainThree : settings.bright.three;
  const brightLabel = brightCards.length === 5 ? '오광' : brightCards.length === 4 ? '4광' : hasRainBright ? '비삼광' : '삼광';
  if (brightPoints) lines.push({ code: 'bright', label: brightLabel, points: brightPoints, description: hasRainBright && brightCards.length === 3 ? '비광이 포함된 3광' : `광 ${brightCards.length}장` });

  if (animalCards.length >= settings.animalStart) {
    const points = animalCards.length - settings.animalStart + 1;
    lines.push({ code: 'animal', label: '열끗', points, description: `열끗 ${animalCards.length}장` });
  }
  if (countSet(scoringCards.map(card => card.id), 'godori')) {
    lines.push({ code: 'godori', label: '고도리', points: settings.godoriScore, description: '2월·4월·8월의 새 패 완성' });
  }

  if (ribbonCards.length >= settings.ribbonStart) {
    const points = ribbonCards.length - settings.ribbonStart + 1;
    lines.push({ code: 'ribbon', label: '띠', points, description: `띠 ${ribbonCards.length}장` });
  }
  const ribbonIds = ribbonCards.map(card => card.id);
  if (countSet(ribbonIds, 'hongdan')) lines.push({ code: 'hongdan', label: '홍단', points: settings.setScore, description: '1월·2월·3월 홍단 완성' });
  if (countSet(ribbonIds, 'cheongdan')) lines.push({ code: 'cheongdan', label: '청단', points: settings.setScore, description: '6월·9월·10월 청단 완성' });
  if (countSet(ribbonIds, 'chodan')) lines.push({ code: 'chodan', label: '초단', points: settings.setScore, description: '4월·5월·7월 초단 완성' });

  if (junkCount >= settings.junkStart) {
    const points = junkCount - settings.junkStart + 1;
    lines.push({ code: 'junk', label: '피', points, description: `보너스피·쌍피를 포함해 피 ${junkCount}장` });
  }

  return {
    total: lines.reduce((sum, line) => sum + line.points, 0),
    brightCount: brightCards.length,
    animalCount: animalCards.length,
    ribbonCount: ribbonCards.length,
    junkCount,
    hasRainBright,
    gookjinAsDoubleJunk,
    lines
  };
}
