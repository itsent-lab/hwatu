import { AI_DIFFICULTIES, AI_DIFFICULTY_ORDER } from '../engine/ai/settings';
import type { AiDifficulty } from '../engine/ai/types';

const DESCRIPTIONS: Readonly<Record<AiDifficulty, string>> = {
  easy: '가끔 실수하고 점수가 나면 대부분 멈춰요',
  normal: '패와 상대 점수를 함께 살펴봐요',
  hard: '확률과 족보, 폭탄 시점까지 계산해요',
  expert: '위험 수까지 다시 계산하고 승리를 빠르게 확정해요'
};

interface DifficultySelectorProps {
  value: AiDifficulty;
  onChange: (difficulty: AiDifficulty) => void;
  compact?: boolean;
  disabled?: boolean;
}

export default function DifficultySelector({ value, onChange, compact = false, disabled = false }: DifficultySelectorProps) {
  return <fieldset className={`difficulty-selector${compact ? ' compact' : ''}`} aria-label="컴퓨터 난이도">
    {!compact && <legend>컴퓨터 난이도</legend>}
    <div>
      {AI_DIFFICULTY_ORDER.map(difficulty => {
        const config = AI_DIFFICULTIES[difficulty];
        return <button
          type="button"
          key={difficulty}
          data-difficulty={difficulty}
          className={value === difficulty ? 'selected' : ''}
          aria-pressed={value === difficulty}
          disabled={disabled}
          onClick={() => onChange(difficulty)}
        >
          <b>{config.label}</b><span>{DESCRIPTIONS[difficulty]}</span>
        </button>;
      })}
    </div>
  </fieldset>;
}
