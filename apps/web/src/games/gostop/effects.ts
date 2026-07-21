import type { DeclarationKind } from '../../components/GameDeclarationOverlay';
import { getCard } from '../../engine/cards';
import type { ScoreLine } from '../../engine/rules/types';
import { computerPlayerActionLabel } from '../../lib/computerPlayers';
import { scoreGostopPlayer, type GostopPlayerId, type GostopRoomState } from './gameState';

export interface GostopTransitionEffect {
  kind: DeclarationKind;
  text: string;
  detail: string;
  duration: number;
  player: GostopPlayerId | null;
  peeBurstValue?: 2 | 3;
  peeBurstText?: string;
}

const PLAYERS: readonly GostopPlayerId[] = ['human', 'computerA', 'computerB'];
const SCORE_PRIORITY = ['bright', 'godori', 'hongdan', 'cheongdan', 'chodan'];

function playerLabel(state: GostopRoomState, player: GostopPlayerId): string {
  return player === 'human' ? '내가' : `${computerPlayerActionLabel(player, state.computerPlayers)}가`;
}

function changedScoreLine(previous: ScoreLine[], current: ScoreLine[]): ScoreLine | null {
  const previousPoints = new Map(previous.map(line => [line.code, line.points]));
  return current
    .filter(line => previousPoints.get(line.code) !== line.points)
    .sort((left, right) => {
      const leftPriority = SCORE_PRIORITY.indexOf(left.code);
      const rightPriority = SCORE_PRIORITY.indexOf(right.code);
      if (leftPriority >= 0 || rightPriority >= 0) {
        if (leftPriority < 0) return 1;
        if (rightPriority < 0) return -1;
        return leftPriority - rightPriority;
      }
      return right.points - left.points;
    })[0] ?? null;
}

export function getGostopTransitionEffect(previous: GostopRoomState | null, current: GostopRoomState): GostopTransitionEffect | null {
  if (!previous || previous.randomSeed !== current.randomSeed) return null;

  if (previous.phase !== 'round-ended' && current.phase === 'round-ended') {
    if (current.roundResult === 'nagari') {
      return { kind: 'settlement', text: '나가리!', detail: '이번 판은 승부 없이 끝났습니다. 다음 판은 2배입니다.', duration: 1500, player: null };
    }
    const winner = current.winner;
    const stopped = previous.phase === 'awaiting-go-stop' && previous.pendingDecision === winner;
    return {
      kind: stopped ? 'stop' : 'settlement',
      text: stopped ? '스톱!' : '승리!',
      detail: winner ? `${playerLabel(current, winner)} ${current.finalScore}점으로 이겼습니다.` : `${current.finalScore}점으로 판이 끝났습니다.`,
      duration: 1600,
      player: winner
    };
  }

  for (const player of PLAYERS) {
    if (current.players[player].shakeCount > previous.players[player].shakeCount) {
      return { kind: 'shake', text: '흔들기!', detail: `${playerLabel(current, player)} 같은 월 패 세 장을 공개했습니다.`, duration: 1200, player };
    }
  }

  for (const player of PLAYERS) {
    const goCount = current.players[player].goCount;
    if (goCount > previous.players[player].goCount) {
      return { kind: 'go', text: `${goCount}고!`, detail: `${playerLabel(current, player)} 승부를 계속합니다.`, duration: goCount >= 5 ? 1800 : 1150, player };
    }
  }

  if (current.turnNumber > previous.turnNumber && current.lastSpecialEvents.length) {
    const priority = ['bomb', 'ttadak', 'jjok', 'sweep', 'self-ppeok', 'ppeok-capture', 'ppeok'];
    const primary = [...current.lastSpecialEvents].sort((left, right) => priority.indexOf(left.kind) - priority.indexOf(right.kind))[0];
    const player = previous.currentPlayer;
    const stolenPee = current.lastSpecialEvents.flatMap(event => event.stolenPee);
    const detail = primary.kind === 'ppeok'
      ? `${playerLabel(current, player)} 같은 월 패 세 장을 바닥에 쌌습니다.`
      : `${playerLabel(current, player)} ${primary.label}에 성공했습니다.${stolenPee.length ? ` 두 상대에게서 피 ${stolenPee.length}장을 가져왔습니다.` : ''}`;
    return { kind: primary.kind, text: `${primary.label}!`, detail, duration: primary.kind === 'sweep' ? 1350 : 1200, player };
  }

  for (const player of PLAYERS) {
    const previousCards = new Set(previous.players[player].captured);
    const bonusCard = current.players[player].captured.find(cardId => !previousCards.has(cardId) && getCard(cardId)?.tags.includes('bonus-pee'));
    if (bonusCard) {
      const value = getCard(bonusCard)?.tags.includes('triple-junk') ? 3 : 2;
      return {
        kind: value === 3 ? 'triple-pee' : 'double-pee',
        text: value === 3 ? '쓰리피!' : '쌍피!',
        detail: `${playerLabel(current, player)} 보너스패를 얻었습니다.`,
        duration: 1250,
        player,
        peeBurstValue: value,
        peeBurstText: `보너스 ${value}피!`
      };
    }
  }

  for (const player of PLAYERS) {
    const previousScore = scoreGostopPlayer(previous, player);
    const currentScore = scoreGostopPlayer(current, player);
    if (currentScore.total <= previousScore.total) continue;
    const line = changedScoreLine(previousScore.lines, currentScore.lines);
    const added = line ? line.points - (previousScore.lines.find(previousLine => previousLine.code === line.code)?.points ?? 0) : currentScore.total - previousScore.total;
    return {
      kind: 'score',
      text: `${line?.label ?? '점수'}!`,
      detail: `${playerLabel(current, player)} +${added}점 · 현재 ${currentScore.total}점`,
      duration: 1250,
      player
    };
  }

  for (const player of PLAYERS) {
    const captured = current.players[player].captured.length - previous.players[player].captured.length;
    if (captured > 0) {
      return { kind: 'capture', text: '짝!', detail: `${playerLabel(current, player)} ${captured}장을 먹었습니다.`, duration: 620, player };
    }
  }
  return null;
}
