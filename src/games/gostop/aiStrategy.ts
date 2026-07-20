import { AI_DIFFICULTIES } from '../../engine/ai/settings';
import type { AiDifficulty } from '../../engine/ai/types';
import { getCard } from '../../engine/cards';
import { randomInteger } from '../../engine/random';
import {
  chooseGostopAutomaticCard,
  chooseGostopAutomaticDecision,
  getGostopMatchingFloorCards,
  scoreGostopPlayer,
  setGostopGookjinChoice,
  type GostopPlayerId,
  type GostopRoomState
} from './gameState';

type ComputerPlayer = Exclude<GostopPlayerId, 'human'>;

function cardValue(cardId: string) {
  const card = getCard(cardId);
  if (!card) return 0;
  if (card.tags.includes('bonus-pee')) return 100;
  if (card.type === 'bright') return 8;
  if (card.type === 'animal') return 5;
  if (card.type === 'ribbon') return 4;
  if (card.type === 'doubleJunk') return 3;
  return 2;
}

function moveValue(state: GostopRoomState, player: ComputerPlayer, cardId: string, expert: boolean) {
  const matches = getGostopMatchingFloorCards(state.floorCards, cardId);
  if (getCard(cardId)?.tags.includes('bonus-pee')) return 1_000;
  if (!matches.length) return -cardValue(cardId) * (expert ? 2 : 1);
  const before = scoreGostopPlayer(state, player).total;
  const choices = matches.length === 2 ? matches.map(match => [match]) : [matches];
  return Math.max(...choices.map(selected => {
    const next = structuredClone(state);
    next.players[player].captured.push(cardId, ...selected);
    const scoreGain = scoreGostopPlayer(next, player).total - before;
    const capturedValue = selected.reduce((total, capturedId) => total + cardValue(capturedId), cardValue(cardId));
    return matches.length * 12 + scoreGain * (expert ? 32 : 24) + capturedValue;
  }));
}

function rankedCards(state: GostopRoomState, player: ComputerPlayer, difficulty: AiDifficulty) {
  return [...state.players[player].hand].sort((left, right) => {
    const valueDifference = moveValue(state, player, right, difficulty === 'expert') - moveValue(state, player, left, difficulty === 'expert');
    if (valueDifference) return valueDifference;
    return (getCard(right)?.month ?? 0) - (getCard(left)?.month ?? 0);
  });
}

function randomValues(state: GostopRoomState, player: ComputerPlayer) {
  const playerSalt = player === 'computerA' ? 0x51ed270b : 0x68bc21eb;
  const seed = (state.randomSeed ^ playerSalt ^ Math.imul(state.turnNumber + 1, 0x9e3779b1)) >>> 0;
  const probability = randomInteger(seed, 10_000);
  return { probability: probability.value / 10_000, seed: probability.seed };
}

export function chooseGostopAiCard(state: GostopRoomState, player: ComputerPlayer, difficulty: AiDifficulty): string | null {
  const ranked = difficulty === 'normal'
    ? [chooseGostopAutomaticCard(state, player), ...rankedCards(state, player, difficulty)]
    : rankedCards(state, player, difficulty);
  const unique = ranked.filter((cardId, index): cardId is string => Boolean(cardId) && ranked.indexOf(cardId) === index);
  if (unique.length <= 1) return unique[0] ?? null;
  const random = randomValues(state, player);
  if (random.probability < AI_DIFFICULTIES[difficulty].optimalMoveProbability) return unique[0];
  return unique[1 + randomInteger(random.seed, unique.length - 1).value];
}

export function chooseGostopAiDecision(state: GostopRoomState, player: ComputerPlayer, difficulty: AiDifficulty): 'go' | 'stop' {
  const score = scoreGostopPlayer(state, player).total;
  const goCount = state.players[player].goCount;
  const remainingCards = Object.values(state.players).reduce((total, current) => total + current.hand.length, 0);
  const opponents: GostopPlayerId[] = ['human', player === 'computerA' ? 'computerB' : 'computerA'];
  const opponentScore = Math.max(...opponents.map(opponent => scoreGostopPlayer(state, opponent).total));
  if (difficulty === 'easy') return randomValues(state, player).probability < AI_DIFFICULTIES.easy.easyStopProbability ? 'stop' : 'go';
  if (difficulty === 'expert') return goCount === 0 && score < 7 && remainingCards >= 7 && opponentScore < 3 ? 'go' : 'stop';
  if (difficulty === 'hard') return goCount < 2 && score < 8 && remainingCards >= 5 && opponentScore < 5 ? 'go' : 'stop';
  return chooseGostopAutomaticDecision(state, player);
}

export function applyGostopAutomaticGookjinChoice(state: GostopRoomState, player: GostopPlayerId): GostopRoomState {
  if (!state.players[player].captured.includes('m09-01')) return state;
  const asAnimal = setGostopGookjinChoice(state, player, false);
  const asDoubleJunk = setGostopGookjinChoice(state, player, true);
  return scoreGostopPlayer(asDoubleJunk, player).total >= scoreGostopPlayer(asAnimal, player).total ? asDoubleJunk : asAnimal;
}
