export type GameMusicMood = 'calm' | 'active' | 'tense' | 'climax' | 'result';

export interface GameMusicProfile {
  playbackRate: number;
  gain: number;
  transitionSeconds: number;
}

const MUSIC_PROFILES: Readonly<Record<GameMusicMood, GameMusicProfile>> = Object.freeze({
  calm: { playbackRate: 1, gain: 0.13, transitionSeconds: 0.9 },
  active: { playbackRate: 1.025, gain: 0.14, transitionSeconds: 0.65 },
  tense: { playbackRate: 1.06, gain: 0.152, transitionSeconds: 0.45 },
  climax: { playbackRate: 1.095, gain: 0.162, transitionSeconds: 0.28 },
  result: { playbackRate: 0.96, gain: 0.115, transitionSeconds: 0.75 }
});

const INTENSITY: Readonly<Record<GameMusicMood, number>> = Object.freeze({
  calm: 0,
  result: 0,
  active: 1,
  tense: 2,
  climax: 3
});

export function getGameMusicProfile(mood: GameMusicMood): GameMusicProfile {
  return MUSIC_PROFILES[mood];
}

export function escalateGameMusicMood(current: GameMusicMood, requested: GameMusicMood): GameMusicMood {
  return INTENSITY[requested] > INTENSITY[current] ? requested : current;
}

export function gameMusicMoodForScore(score: number): GameMusicMood {
  if (score >= 10) return 'climax';
  if (score >= 5) return 'tense';
  return 'active';
}

export function gameMusicMoodForGoCount(goCount: number): GameMusicMood {
  return goCount >= 3 ? 'climax' : 'tense';
}
