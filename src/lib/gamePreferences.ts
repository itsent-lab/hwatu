import { isAiDifficulty } from '../engine/ai/settings';
import type { AiDifficulty } from '../engine/ai/types';
import { normalizeMatgoPointValue, type MatgoPointValue } from '../engine/rules/settings';
import { normalizeGostopPointValue, type GostopPointValue } from '../games/gostop/settings';

interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const AI_DIFFICULTY_KEY = 'nsrnb-hwatu-ai-difficulty-v1';
const GOSTOP_AI_DIFFICULTY_KEY = 'nsrnb-hwatu-gostop-ai-difficulty-v1';
const POINT_VALUE_KEY = 'nsrnb-hwatu-point-value-v1';
const GOSTOP_POINT_VALUE_KEY = 'nsrnb-hwatu-gostop-point-value-v1';
const DISCARD_CONFIRMATION_KEY = 'nsrnb-hwatu-discard-confirmation-v1';

export function loadAiDifficulty(storage: PreferenceStorage = window.localStorage): AiDifficulty {
  try {
    const value = storage.getItem(AI_DIFFICULTY_KEY);
    return isAiDifficulty(value) ? value : 'normal';
  } catch {
    return 'normal';
  }
}

export function saveAiDifficulty(difficulty: AiDifficulty, storage: PreferenceStorage = window.localStorage) {
  try { storage.setItem(AI_DIFFICULTY_KEY, difficulty); }
  catch { /* 기기 저장이 막혀도 현재 판은 계속 진행 */ }
}

export function loadGostopAiDifficulty(storage: PreferenceStorage = window.localStorage): AiDifficulty {
  try {
    const value = storage.getItem(GOSTOP_AI_DIFFICULTY_KEY);
    return isAiDifficulty(value) ? value : 'normal';
  } catch {
    return 'normal';
  }
}

export function saveGostopAiDifficulty(difficulty: AiDifficulty, storage: PreferenceStorage = window.localStorage) {
  try { storage.setItem(GOSTOP_AI_DIFFICULTY_KEY, difficulty); }
  catch { /* 기기 저장이 막혀도 현재 판은 계속 진행 */ }
}

export function loadPointValue(storage: PreferenceStorage = window.localStorage): MatgoPointValue {
  try { return normalizeMatgoPointValue(Number(storage.getItem(POINT_VALUE_KEY))); }
  catch { return 100; }
}

export function savePointValue(pointValue: MatgoPointValue, storage: PreferenceStorage = window.localStorage) {
  try { storage.setItem(POINT_VALUE_KEY, String(pointValue)); }
  catch { /* 기기 저장이 막혀도 현재 판은 계속 진행 */ }
}

export function loadGostopPointValue(storage: PreferenceStorage = window.localStorage): GostopPointValue {
  try { return normalizeGostopPointValue(Number(storage.getItem(GOSTOP_POINT_VALUE_KEY))); }
  catch { return 100; }
}

export function saveGostopPointValue(pointValue: GostopPointValue, storage: PreferenceStorage = window.localStorage) {
  try { storage.setItem(GOSTOP_POINT_VALUE_KEY, String(pointValue)); }
  catch { /* 기기 저장이 막혀도 현재 선택은 유지 */ }
}

export function loadDiscardConfirmation(storage: PreferenceStorage = window.localStorage): boolean {
  try { return storage.getItem(DISCARD_CONFIRMATION_KEY) === '1'; }
  catch { return false; }
}

export function saveDiscardConfirmation(enabled: boolean, storage: PreferenceStorage = window.localStorage) {
  try { storage.setItem(DISCARD_CONFIRMATION_KEY, enabled ? '1' : '0'); }
  catch { /* 기기 저장이 막혀도 현재 판은 계속 진행 */ }
}
