import { chooseAiChongtong, chooseAiGoStop, chooseAiMove } from '../engine/ai/strategy';
import type { AiDifficulty } from '../engine/ai/types';
import { chooseChongtong, chooseGo, chooseStop, createInitialGame, declareShake, playBomb, playFlipOnlyTurn, playTurn } from '../engine/gameState';
import type { GameState, PlayerId } from '../engine/types';

export interface SimulationSummary {
  difficulty: AiDifficulty;
  games: number;
  computerWins: number;
  humanWins: number;
  nagari: number;
  stalled: number;
  computerWinRate: number;
  decisiveComputerWinRate: number;
}

const difficultyFor = (player: PlayerId, computerDifficulty: AiDifficulty): AiDifficulty =>
  player === 'computer' ? computerDifficulty : 'normal';

export function simulateGame(seed: number, computerDifficulty: AiDifficulty): GameState {
  let game = createInitialGame(seed, computerDifficulty);
  let actions = 0;
  while (game.phase !== 'round-ended' && actions < 120) {
    actions += 1;
    if (game.phase === 'awaiting-chongtong') {
      const player = game.pendingDecision!;
      const difficulty = difficultyFor(player, computerDifficulty);
      game = chooseChongtong(game, player, chooseAiChongtong(game, difficulty));
      continue;
    }
    if (game.phase === 'awaiting-go-stop') {
      const player = game.pendingDecision!;
      const difficulty = difficultyFor(player, computerDifficulty);
      const decision = chooseAiGoStop(game, player, difficulty);
      game = decision === 'go' ? chooseGo(game, player) : chooseStop(game, player);
      continue;
    }

    const player = game.currentPlayer;
    const difficulty = difficultyFor(player, computerDifficulty);
    const choice = chooseAiMove(game, player, difficulty);
    if (!choice.move) break;
    if (choice.move.kind === 'bomb') game = playBomb(game, player, choice.move.month).state;
    else if (choice.move.kind === 'shake') game = declareShake(game, player, choice.move.month);
    else if (choice.move.kind === 'flip-only') game = playFlipOnlyTurn(game, player).state;
    else game = playTurn(game, player, choice.move.cardId, { playedMatchId: choice.move.playedMatchId }).state;
  }
  return game;
}

export function simulateDifficulty(games: number, difficulty: AiDifficulty): SimulationSummary {
  let computerWins = 0;
  let humanWins = 0;
  let nagari = 0;
  let stalled = 0;
  for (let index = 0; index < games; index += 1) {
    const result = simulateGame(10_000 + index, difficulty);
    if (result.phase !== 'round-ended') stalled += 1;
    else if (result.winner === 'computer') computerWins += 1;
    else if (result.winner === 'human') humanWins += 1;
    else nagari += 1;
  }
  const decisiveGames = computerWins + humanWins;
  return {
    difficulty, games, computerWins, humanWins, nagari, stalled,
    computerWinRate: computerWins / games,
    decisiveComputerWinRate: decisiveGames ? computerWins / decisiveGames : 0
  };
}
