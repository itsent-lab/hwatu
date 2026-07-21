import type { CardType, HwatuCard } from './types';

const MONTHS: Array<[string, string] | null> = [
  null, ['소나무', '송학'], ['매화', '매조'], ['벚꽃', '벚꽃'], ['흑싸리', '흑싸리'],
  ['난초', '난초'], ['모란', '모란'], ['홍싸리', '홍싸리'], ['억새', '공산'],
  ['국화', '국진'], ['단풍', '단풍'], ['오동', '오동'], ['비', '비']
];

type Definition = [number, CardType, string, string[]];
const DEFINITIONS: Definition[] = [
  [1, 'bright', '송학광', ['bright']], [1, 'ribbon', '홍단', ['ribbon', 'hongdan']], [1, 'junk', '피', ['junk']], [1, 'junk', '피', ['junk']],
  [2, 'animal', '매조', ['animal', 'godori']], [2, 'ribbon', '홍단', ['ribbon', 'hongdan']], [2, 'junk', '피', ['junk']], [2, 'junk', '피', ['junk']],
  [3, 'bright', '벚꽃광', ['bright']], [3, 'ribbon', '홍단', ['ribbon', 'hongdan']], [3, 'junk', '피', ['junk']], [3, 'junk', '피', ['junk']],
  [4, 'animal', '흑싸리 고도리', ['animal', 'godori']], [4, 'ribbon', '초단', ['ribbon', 'chodan']], [4, 'junk', '피', ['junk']], [4, 'junk', '피', ['junk']],
  [5, 'animal', '난초 열끗', ['animal']], [5, 'ribbon', '초단', ['ribbon', 'chodan']], [5, 'junk', '피', ['junk']], [5, 'junk', '피', ['junk']],
  [6, 'animal', '모란 나비', ['animal']], [6, 'ribbon', '청단', ['ribbon', 'cheongdan']], [6, 'junk', '피', ['junk']], [6, 'junk', '피', ['junk']],
  [7, 'animal', '홍싸리 멧돼지', ['animal']], [7, 'ribbon', '초단', ['ribbon', 'chodan']], [7, 'junk', '피', ['junk']], [7, 'junk', '피', ['junk']],
  [8, 'bright', '공산광', ['bright']], [8, 'animal', '기러기', ['animal', 'godori']], [8, 'junk', '피', ['junk']], [8, 'junk', '피', ['junk']],
  [9, 'animal', '국진', ['animal', 'gookjin']], [9, 'ribbon', '청단', ['ribbon', 'cheongdan']], [9, 'junk', '피', ['junk']], [9, 'junk', '피', ['junk']],
  [10, 'animal', '단풍 사슴', ['animal']], [10, 'ribbon', '청단', ['ribbon', 'cheongdan']], [10, 'junk', '피', ['junk']], [10, 'junk', '피', ['junk']],
  [11, 'bright', '오동광', ['bright']], [11, 'doubleJunk', '쌍피', ['junk', 'double-junk']], [11, 'junk', '피', ['junk']], [11, 'junk', '피', ['junk']],
  [12, 'bright', '비광', ['bright', 'rain-bright']], [12, 'animal', '제비', ['animal']], [12, 'ribbon', '비띠', ['ribbon', 'rain-ribbon']], [12, 'doubleJunk', '쌍피', ['junk', 'double-junk']]
];

const TYPE_LABELS: Record<CardType, string> = {
  bright: '광', animal: '열끗', ribbon: '띠', junk: '피', doubleJunk: '쌍피'
};

export const HWATU_CARDS: readonly HwatuCard[] = Object.freeze(DEFINITIONS.map(([month, type, name, tags], index) => ({
  id: `m${String(month).padStart(2, '0')}-${String((index % 4) + 1).padStart(2, '0')}`,
  month,
  monthName: MONTHS[month]?.[0] ?? '',
  familyName: MONTHS[month]?.[1] ?? '',
  type,
  typeLabel: TYPE_LABELS[type],
  name,
  imageKey: `card-${String(month).padStart(2, '0')}-${(index % 4) + 1}`,
  tags: Object.freeze(tags)
})));

export const BONUS_PEE_CARDS: readonly HwatuCard[] = Object.freeze([
  { id: 'bonus-pee-1', month: 0, monthName: '보너스', familyName: '보너스', type: 'doubleJunk', typeLabel: '쌍피', name: '보너스 쌍피', imageKey: 'bonus-pee-1', tags: Object.freeze(['junk', 'double-junk', 'bonus-pee']) },
  { id: 'bonus-pee-2', month: 0, monthName: '보너스', familyName: '보너스', type: 'doubleJunk', typeLabel: '쌍피', name: '보너스 쌍피', imageKey: 'bonus-pee-2', tags: Object.freeze(['junk', 'double-junk', 'bonus-pee']) },
  { id: 'bonus-double-pee-1', month: 0, monthName: '보너스', familyName: '보너스', type: 'doubleJunk', typeLabel: '삼피', name: '보너스 삼피', imageKey: 'bonus-double-pee-1', tags: Object.freeze(['junk', 'double-junk', 'triple-junk', 'bonus-pee']) }
]);

const CARD_MAP = new Map([...HWATU_CARDS, ...BONUS_PEE_CARDS].map(card => [card.id, card]));
export const getCard = (cardId: string): HwatuCard | null => CARD_MAP.get(cardId) ?? null;
export const cardsForMonth = (month: number): HwatuCard[] => HWATU_CARDS.filter(card => card.month === month);
