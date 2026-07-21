import { describe, expect, it } from 'vitest';
import vectors from '../../../../shared/contracts/game-rule-vectors-v1.json';
import { calculateCapturedScore } from '../engine/rules/scoring';
import { calculateSettlement } from '../engine/rules/settlement';
import { matgoRulesForPointValue } from '../engine/rules/settings';
import type { CapturedScore } from '../engine/rules/types';
import { settleGostopPointDeltas } from '../games/gostop/money';
import { calculateGostopSettlement, type GostopSettlementPlayerState } from '../games/gostop/settlement';

type JsonObject = Record<string, unknown>;
type VectorCase = (typeof vectors.cases)[number];

function subset(actual: JsonObject, expected: JsonObject) {
  expect(actual).toMatchObject(expected);
}

function scoreSummary(value: JsonObject): CapturedScore {
  return {
    total: Number(value.total ?? 0),
    brightCount: Number(value.brightCount ?? 0),
    animalCount: Number(value.animalCount ?? 0),
    ribbonCount: Number(value.ribbonCount ?? 0),
    junkCount: Number(value.junkCount ?? 0),
    hasRainBright: Boolean(value.hasRainBright),
    gookjinAsDoubleJunk: Boolean(value.gookjinAsDoubleJunk),
    lines: []
  };
}

function playerState(value: JsonObject): GostopSettlementPlayerState {
  return {
    score: scoreSummary(value.score as JsonObject),
    goCount: Number(value.goCount),
    scoreAtLastGo: Number(value.scoreAtLastGo),
    shakeCount: Number(value.shakeCount),
    bombCount: Number(value.bombCount)
  };
}

function runVector(vector: VectorCase) {
  const input = vector.input as JsonObject;
  const expected = vector.expected as JsonObject;
  if (vector.operation === 'captured-score') {
    const result = calculateCapturedScore(input.cards as string[], {
      gookjinAsDoubleJunk: Boolean(input.gookjinAsDoubleJunk)
    });
    subset(result as unknown as JsonObject, expected);
    return;
  }
  if (vector.operation === 'matgo-settlement') {
    const result = calculateSettlement({
      winnerScore: calculateCapturedScore(input.winnerCards as string[]),
      loserScore: calculateCapturedScore(input.loserCards as string[]),
      winnerGoCount: Number(input.winnerGoCount),
      winnerShakeCount: Number(input.winnerShakeCount ?? 0),
      winnerMissionMultiplier: Number(input.winnerMissionMultiplier ?? 1),
      roundMultiplier: Number(input.roundMultiplier ?? 1),
      loserGoCount: Number(input.loserGoCount ?? 0),
      loserCapturedCount: input.loserCapturedCount === undefined ? undefined : Number(input.loserCapturedCount),
      settings: matgoRulesForPointValue(input.pointValue)
    });
    subset({ ...result, bakCodes: result.baks.map(bak => bak.code) }, expected);
    return;
  }
  if (vector.operation === 'gostop-settlement') {
    const source = input.players as Record<'human' | 'computerA' | 'computerB', JsonObject>;
    const result = calculateGostopSettlement({
      winner: input.winner as 'human' | 'computerA' | 'computerB',
      players: {
        human: playerState(source.human),
        computerA: playerState(source.computerA),
        computerB: playerState(source.computerB)
      },
      lastGoPlayer: input.lastGoPlayer as 'human' | 'computerA' | 'computerB' | null,
      roundMultiplier: Number(input.roundMultiplier),
      interimPointDeltas: input.interimPointDeltas as { human: number; computerA: number; computerB: number }
    });
    subset(result as unknown as JsonObject, expected);
    return;
  }
  const result = settleGostopPointDeltas(
    input.balances as { human: number; computerA: number; computerB: number },
    input.pointDeltas as { human: number; computerA: number; computerB: number },
    Number(input.pointValue)
  );
  subset(result as unknown as JsonObject, expected);
}

describe('공통 게임 규칙 계약 벡터', () => {
  for (const vector of vectors.cases) {
    it(`${vector.id}: ${vector.description}`, () => runVector(vector));
  }
});
