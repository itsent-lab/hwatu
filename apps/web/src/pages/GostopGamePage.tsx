import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AudioControls from '../components/AudioControls';
import AutoPlayButton from '../components/AutoPlayButton';
import BombDecisionPanel from '../components/BombDecisionPanel';
import CapturedCardRack from '../components/CapturedCardRack';
import DifficultySelector from '../components/DifficultySelector';
import ExitChoiceDialog from '../components/ExitChoiceDialog';
import GameDeclarationOverlay, { type DeclarationEffect } from '../components/GameDeclarationOverlay';
import GoStopDecisionPanel from '../components/GoStopDecisionPanel';
import GookjinDecisionPanel from '../components/GookjinDecisionPanel';
import GostopDealAnimation from '../components/GostopDealAnimation';
import GostopHiddenHand from '../components/GostopHiddenHand';
import GostopHumanHand from '../components/GostopHumanHand';
import GostopOpponentCaptured from '../components/GostopOpponentCaptured';
import GostopRoundResult from '../components/GostopRoundResult';
import GostopScoreSummary from '../components/GostopScoreSummary';
import HwatuCard from '../components/HwatuCard';
import Loading from '../components/Loading';
import ShakeDecisionPanel from '../components/ShakeDecisionPanel';
import type { AiDifficulty } from '../engine/ai/types';
import { getCard } from '../engine/cards';
import { applyGostopAutomaticGookjinChoice, chooseGostopAiCard, chooseGostopAiDecision } from '../games/gostop/aiStrategy';
import { loadGostopBalanceSnapshot, saveGostopBalanceSnapshot } from '../games/gostop/balanceSnapshot';
import { getGostopTransitionEffect } from '../games/gostop/effects';
import { DEFAULT_GOSTOP_COMPUTER_BALANCE, settleGostopPointDeltas } from '../games/gostop/money';
import { enqueuePendingGostopSettlement, loadPendingGostopSettlements, removePendingGostopSettlement } from '../games/gostop/pendingSettlement';
import {
  chooseGostopAutomaticCard, chooseGostopAutomaticDecision, chooseGostopDecision, createGostopRoom, declareGostopShake,
  getGostopBombOption, getGostopDrawFloorChoice, getGostopFlipOnlyDrawChoice, getGostopFloorChoice, getGostopMatchingFloorCards,
  getGostopShakeOption, nextGostopRoundMultiplier, playGostopBomb, playGostopFlipOnlyTurn, playGostopTurn, previewGostopSettlement,
  scoreGostopPlayer, setGostopGookjinChoice,
  type GostopPlayerId, type GostopRoomState
} from '../games/gostop/gameState';
import { dashboard, settleGostopRound } from '../lib/api';
import {
  applyAudioSettings, pauseGameAudio, playAutoPlaySound, playBonusPeeSound, playCancelSound, playCaptureSound, playCardSound,
  playDealSound, playDecisionSound, playFlipSound, playGoSound, playGookjinSound, playLoseSound, playMoneySound,
  playNagariSound, playPpeokSound, playScoreSound, playSelectSound, playSpecialMoveSound, playStartSound, playStopSound, playBombSound, playShakeSound,
  playWinSound, unlockAudio, type VoiceActor
} from '../lib/audio';
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from '../lib/audioSettings';
import { useGostopComputerPlayers, voiceActorDisplayName, type GostopComputerPlayers } from '../lib/computerPlayers';
import { animateCardFlight } from '../lib/effects';
import { loadGostopAiDifficulty, loadGostopPointValue, saveGostopAiDifficulty } from '../lib/gamePreferences';
import { useGameViewportFit } from '../lib/gameViewport';
import { saveProfile } from '../lib/localStore';
import type { GostopSettlementRequest, MatchStatistics, UserProfile } from '../lib/types';

const COMPUTER_TURN_DELAY_MS = 1_700;
const AUTO_HUMAN_TURN_DELAY_MS = 1_300;
const formatMoney = (value: number) => new Intl.NumberFormat('ko-KR').format(value);

function humanMatchStatistics(room: GostopRoomState): MatchStatistics {
  const human = room.players.human;
  const humanWon = room.winner === 'human';
  const baks = humanWon
    ? room.settlement?.loserPayments.flatMap(payment => payment.baks) ?? []
    : [];
  return {
    version: 1,
    goCount: human.goCount,
    sweepCount: human.sweepCount ?? 0,
    bombCount: human.bombCount,
    shakeCount: human.shakeCount,
    ppeokCount: human.ppeokCount,
    openingPpeokCount: human.openingPpeokTotal ?? 0,
    threePpeokWin: humanWon && human.ppeokCount >= 3,
    piBakWin: baks.includes('pi-bak'),
    gwangBakWin: baks.includes('gwang-bak')
  };
}

interface FloorChoice {
  stage: 'played' | 'drawn' | 'flip-only';
  cardId: string;
  candidates: string[];
  playedMatchId?: string;
  drawnCardId?: string;
}

interface GostopBombChoice {
  month: number;
  handCardIds: string[];
  floorCardIds: string[];
  selectedCardId: string;
}

interface GostopShakeChoice {
  month: number;
  cardIds: string[];
  selectedCardId: string;
}

function playerName(player: GostopPlayerId, user: UserProfile, computerPlayers: GostopComputerPlayers) {
  const actor = player === 'human' ? 'player' : computerPlayers[player].voiceActor;
  return voiceActorDisplayName(actor, user.displayName);
}

function voiceActor(player: GostopPlayerId | null, computerPlayers: GostopComputerPlayers): VoiceActor {
  return player === 'human' || player === null ? 'player' : computerPlayers[player].voiceActor;
}

function findPlayedCardTarget(container: HTMLElement | null, floorCards: string[], cardId: string, preferredMatchId?: string) {
  if (!container) return null;
  const matches = getGostopMatchingFloorCards(floorCards, cardId);
  const targetId = preferredMatchId && matches.includes(preferredMatchId) ? preferredMatchId : matches[0];
  const cards = [...container.querySelectorAll<HTMLElement>('.hwatu-card[data-card-id]')];
  if (targetId) return cards.find(card => card.dataset.cardId === targetId) ?? null;
  return container.querySelector<HTMLElement>('.gostop-floor-card-group.right .hwatu-card:last-child')
    ?? container.querySelector<HTMLElement>('.gostop-floor-card-group.left .hwatu-card:last-child')
    ?? container;
}

export default function GostopGamePage() {
  const navigate = useNavigate();
  const viewportFit = useGameViewportFit();
  const computerPlayers = useGostopComputerPlayers();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [room, setRoom] = useState<GostopRoomState | null>(null);
  const [floorChoice, setFloorChoice] = useState<FloorChoice | null>(null);
  const [bombChoice, setBombChoice] = useState<GostopBombChoice | null>(null);
  const [shakeChoice, setShakeChoice] = useState<GostopShakeChoice | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => loadAudioSettings());
  const [difficulty, setDifficulty] = useState<AiDifficulty>(() => loadGostopAiDifficulty());
  const [computerBalances, setComputerBalances] = useState({
    computerA: DEFAULT_GOSTOP_COMPUTER_BALANCE,
    computerB: DEFAULT_GOSTOP_COMPUTER_BALANCE
  });
  const [gookjinChoiceOpen, setGookjinChoiceOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exitReserved, setExitReserved] = useState(false);
  const [dealing, setDealing] = useState(true);
  const [declaration, setDeclaration] = useState<DeclarationEffect | null>(null);
  const previousRoomRef = useRef<GostopRoomState | null>(null);
  const declarationTimerRef = useRef<number | null>(null);
  const declarationSequenceRef = useRef(0);
  const computerAHandRef = useRef<HTMLElement | null>(null);
  const computerBHandRef = useRef<HTMLElement | null>(null);
  const drawPileRef = useRef<HTMLButtonElement | null>(null);
  const floorCardsRef = useRef<HTMLDivElement | null>(null);
  const humanHandRef = useRef<HTMLDivElement | null>(null);
  const turnAnimationRef = useRef(false);
  const roundGameUuidRef = useRef(crypto.randomUUID());
  const settledRoundRef = useRef<string | null>(null);

  useEffect(() => {
    const openRoom = (profile: UserProfile) => {
      if (profile.virtualBalance <= 0) {
        navigate('/gostop', { replace: true });
        return;
      }
      setUser(profile);
      setComputerBalances({
        computerA: profile.gostopComputerABalance ?? DEFAULT_GOSTOP_COMPUTER_BALANCE,
        computerB: profile.gostopComputerBBalance ?? DEFAULT_GOSTOP_COMPUTER_BALANCE
      });
      roundGameUuidRef.current = crypto.randomUUID();
      settledRoundRef.current = null;
      setRoom(createGostopRoom(Date.now(), loadGostopPointValue(), 1, 'human', computerPlayers));
      setDealing(true);
    };
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1') {
      openRoom({ id: 0, username: 'preview', displayName: '어머니', role: 'member', virtualBalance: 136000 });
      return;
    }
    dashboard().then(async result => {
      const pendingSettlements = loadPendingGostopSettlements(result.user.id);
      const balanceSnapshot = loadGostopBalanceSnapshot(result.user.id);
      for (const pending of pendingSettlements) {
        try {
          await settleGostopRound(pending);
          removePendingGostopSettlement(result.user.id, pending.gameUuid);
        }
        catch {
          break;
        }
      }
      if (pendingSettlements.length > 0) result = await dashboard();
      const remainingSettlements = loadPendingGostopSettlements(result.user.id);
      if (remainingSettlements.length > 0 && balanceSnapshot) {
        result = {
          ...result,
          user: {
            ...result.user,
            virtualBalance: balanceSnapshot.human,
            gostopComputerABalance: balanceSnapshot.computerA,
            gostopComputerBBalance: balanceSnapshot.computerB
          }
        };
      }
      else {
        saveGostopBalanceSnapshot(result.user.id, {
          human: result.user.virtualBalance,
          computerA: result.user.gostopComputerABalance ?? DEFAULT_GOSTOP_COMPUTER_BALANCE,
          computerB: result.user.gostopComputerBBalance ?? DEFAULT_GOSTOP_COMPUTER_BALANCE
        });
      }
      await saveProfile(result.user);
      openRoom(result.user);
    }).catch(() => navigate('/login', { replace: true }));
  }, [computerPlayers, navigate]);

  useEffect(() => {
    applyAudioSettings(audioSettings);
    saveAudioSettings(audioSettings);
  }, [audioSettings]);

  useEffect(() => {
    const enableAudio = () => { void unlockAudio(); };
    window.addEventListener('pointerdown', enableAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', enableAudio);
      pauseGameAudio();
    };
  }, []);

  useEffect(() => {
    if (!room || !dealing) return;
    playDealSound();
    const timer = window.setTimeout(() => setDealing(false), 1550);
    return () => window.clearTimeout(timer);
  }, [dealing, room?.randomSeed]);

  useEffect(() => {
    if (!room) return;
    const previousRoom = previousRoomRef.current;
    const effect = getGostopTransitionEffect(previousRoom, room);
    previousRoomRef.current = room;
    if (!effect) return;
    const actor = voiceActor(effect.player, room.computerPlayers);
    if (previousRoom?.phase !== 'round-ended' && room.phase === 'round-ended') {
      if (room.roundResult === 'nagari') playNagariSound();
      else if (effect.kind === 'stop') playStopSound(actor);
      else if (room.winner === 'human') playWinSound(room.finalScore, room.players.human.goCount);
      else playLoseSound([], voiceActor(room.winner, room.computerPlayers));
    } else if (effect.kind === 'go' && effect.player) {
      playGoSound(room.players[effect.player].goCount, actor);
    } else if (effect.kind === 'double-pee' || effect.kind === 'triple-pee') {
      playBonusPeeSound(effect.kind === 'triple-pee' ? 3 : 2, actor);
    } else if (effect.kind === 'ppeok') {
      playPpeokSound(actor);
    } else if (effect.kind === 'bomb') {
      playBombSound(actor);
    } else if (effect.kind === 'shake') {
      playShakeSound(actor);
    } else if (effect.kind === 'jjok' || effect.kind === 'ttadak' || effect.kind === 'sweep' || effect.kind === 'ppeok-capture' || effect.kind === 'self-ppeok') {
      playSpecialMoveSound(effect.kind, actor);
    } else if (effect.kind === 'score' && effect.player) {
      playScoreSound(effect.text.replace('!', ''), scoreGostopPlayer(room, effect.player).total, actor);
    } else if (effect.kind === 'capture') {
      playCaptureSound(actor);
    } else if (effect.kind === 'stop') {
      playStopSound(actor);
    }
    if (declarationTimerRef.current !== null) window.clearTimeout(declarationTimerRef.current);
    declarationSequenceRef.current += 1;
    setDeclaration({
      id: declarationSequenceRef.current, kind: effect.kind, text: effect.text, detail: effect.detail,
      peeBurstValue: effect.peeBurstValue, peeBurstText: effect.peeBurstText
    });
    declarationTimerRef.current = window.setTimeout(() => setDeclaration(null), effect.duration);
  }, [room]);

  useEffect(() => () => {
    if (declarationTimerRef.current !== null) window.clearTimeout(declarationTimerRef.current);
  }, []);

  useEffect(() => {
    if (!exitReserved || room?.phase !== 'round-ended') return;
    const timer = window.setTimeout(() => navigate('/gostop'), 3000);
    return () => window.clearTimeout(timer);
  }, [exitReserved, navigate, room?.phase]);

  useEffect(() => {
    if (room?.phase === 'round-ended') setAutoPlay(false);
  }, [room?.phase]);

  useEffect(() => {
    if (!user || !room || room.phase !== 'round-ended') return;
    const pointDeltas = room.settlement?.pointDeltas ?? room.interimPointDeltas;
    if (Object.values(pointDeltas).every(points => points === 0) && room.roundResult !== 'nagari') return;
    const gameUuid = roundGameUuidRef.current;
    if (settledRoundRef.current === gameUuid) return;
    settledRoundRef.current = gameUuid;
    const optimistic = settleGostopPointDeltas({
      human: user.virtualBalance,
      computerA: computerBalances.computerA,
      computerB: computerBalances.computerB
    }, pointDeltas, room.pointValue);
    saveGostopBalanceSnapshot(user.id, optimistic);
    playMoneySound(pointDeltas.human > 0);
    setUser(current => current ? { ...current, virtualBalance: optimistic.human } : current);
    setComputerBalances({ computerA: optimistic.computerA, computerB: optimistic.computerB });
    if (import.meta.env.DEV && user.id === 0) return;
    const settlementRequest: GostopSettlementRequest = {
      gameUuid,
      roundResult: room.roundResult ?? 'nagari',
      winner: room.winner,
      finalScore: room.finalScore,
      pointValue: room.pointValue,
      humanPoints: pointDeltas.human,
      computerAPoints: pointDeltas.computerA,
      computerBPoints: pointDeltas.computerB,
      statistics: humanMatchStatistics(room)
    };
    enqueuePendingGostopSettlement(user.id, settlementRequest);
    void settleGostopRound(settlementRequest).then(result => {
      removePendingGostopSettlement(user.id, gameUuid);
      saveGostopBalanceSnapshot(user.id, {
        human: result.balance,
        computerA: result.computerABalance,
        computerB: result.computerBBalance
      });
      setComputerBalances({ computerA: result.computerABalance, computerB: result.computerBBalance });
      setUser(current => {
        if (!current) return current;
        const updated = {
          ...current,
          virtualBalance: result.balance,
          gostopComputerABalance: result.computerABalance,
          gostopComputerBBalance: result.computerBBalance
        };
        void saveProfile(updated);
        return updated;
      });
    }).catch(() => { /* 다음 접속 때 미정산 판을 다시 처리합니다. */ });
  }, [computerBalances.computerA, computerBalances.computerB, room, user]);

  useEffect(() => {
    if (dealing || gookjinChoiceOpen || !room || room.phase === 'round-ended' || room.pendingDecision === 'human' || room.currentPlayer === 'human') return;
    const timer = window.setTimeout(async () => {
      if (room.phase === 'playing' && !turnAnimationRef.current) {
        turnAnimationRef.current = true;
        try {
          const computerPlayer = room.currentPlayer === 'computerA' ? 'computerA' : 'computerB';
          const seat = computerPlayer === 'computerA' ? computerAHandRef.current : computerBHandRef.current;
          const flipOnly = room.players[computerPlayer].flipOnlyTurns > 0;
          const cardId = flipOnly ? null : chooseGostopAiCard(room, computerPlayer, difficulty);
          const bonusMove = Boolean(cardId && getCard(cardId)?.tags.includes('bonus-pee'));
          const source = cardId ? seat?.querySelector(`.gostop-card-back[data-card-id="${cardId}"]`) ?? null : null;
          const playedTarget = cardId ? findPlayedCardTarget(floorCardsRef.current, room.floorCards, cardId) : null;
          if (!flipOnly) {
            playCardSound();
            await animateCardFlight(source, bonusMove ? seat?.querySelector('.gostop-score-summary') ?? null : playedTarget, -7, 280);
          }
          await animateCardFlight(drawPileRef.current, bonusMove ? seat : floorCardsRef.current, 7, 230);
          playFlipSound();
        } finally { turnAnimationRef.current = false; }
      }
      setRoom(current => {
        if (!current || current.phase === 'round-ended' || current.pendingDecision === 'human' || current.currentPlayer === 'human') return current;
        const player = current.currentPlayer;
        if (current.phase === 'awaiting-go-stop') return chooseGostopDecision(current, player, chooseGostopAiDecision(current, player, difficulty));
        if (current.players[player].flipOnlyTurns > 0) return playGostopFlipOnlyTurn(current, player).state;
        const cardId = chooseGostopAiCard(current, player, difficulty);
        if (!cardId) return current;
        const hadGookjin = current.players[player].captured.includes('m09-01');
        const bomb = getGostopBombOption(current, player, cardId);
        const shaken = bomb ? current : getGostopShakeOption(current, player, cardId)
          ? declareGostopShake(current, player, getCard(cardId)?.month ?? 0)
          : current;
        const next = bomb ? playGostopBomb(current, player, bomb.month).state : playGostopTurn(shaken, player, cardId).state;
        return next.phase !== 'round-ended' && !hadGookjin && next.players[player].captured.includes('m09-01')
          ? applyGostopAutomaticGookjinChoice(next, player)
          : next;
      });
    }, COMPUTER_TURN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [dealing, difficulty, gookjinChoiceOpen, room]);

  useEffect(() => {
    if (dealing || !autoPlay || !room || room.phase === 'round-ended' || (room.currentPlayer !== 'human' && room.pendingDecision !== 'human')) return;
    const timer = window.setTimeout(async () => {
      setFloorChoice(null);
      if (room.phase === 'playing' && !turnAnimationRef.current) {
        const flipOnly = room.players.human.flipOnlyTurns > 0;
        const cardId = flipOnly ? null : chooseGostopAutomaticCard(room, 'human');
        const bonusMove = Boolean(cardId && getCard(cardId)?.tags.includes('bonus-pee'));
        const source = cardId ? humanHandRef.current?.querySelector(`[data-card-id="${cardId}"]`) ?? null : null;
        const playedTarget = cardId ? findPlayedCardTarget(floorCardsRef.current, room.floorCards, cardId, getGostopFloorChoice(room, 'human', cardId)[0]) : null;
        turnAnimationRef.current = true;
        try {
          if (!flipOnly) {
            playCardSound();
            await animateCardFlight(source, bonusMove ? document.querySelector('.gostop-human-captured') : playedTarget, -7, 280);
          }
          await animateCardFlight(drawPileRef.current, bonusMove ? humanHandRef.current : floorCardsRef.current, 7, 230);
          playFlipSound();
        } finally { turnAnimationRef.current = false; }
      }
      setRoom(current => {
        if (!current || current.phase === 'round-ended') return current;
        if (current.phase === 'awaiting-go-stop' && current.pendingDecision === 'human') {
          return chooseGostopDecision(current, 'human', chooseGostopAutomaticDecision(current, 'human'));
        }
        if (current.phase !== 'playing' || current.currentPlayer !== 'human') return current;
        if (current.players.human.flipOnlyTurns > 0) return playGostopFlipOnlyTurn(current, 'human').state;
        const cardId = chooseGostopAutomaticCard(current, 'human');
        if (!cardId) return current;
        const playedMatchId = getGostopFloorChoice(current, 'human', cardId)[0];
        const drawnMatchId = getGostopDrawFloorChoice(current, 'human', cardId, playedMatchId)?.candidates[0];
        const hadGookjin = current.players.human.captured.includes('m09-01');
        const bomb = getGostopBombOption(current, 'human', cardId);
        const shaken = bomb ? current : getGostopShakeOption(current, 'human', cardId)
          ? declareGostopShake(current, 'human', getCard(cardId)?.month ?? 0)
          : current;
        const next = bomb
          ? playGostopBomb(current, 'human', bomb.month).state
          : playGostopTurn(shaken, 'human', cardId, playedMatchId, drawnMatchId).state;
        return next.phase !== 'round-ended' && !hadGookjin && next.players.human.captured.includes('m09-01')
          ? applyGostopAutomaticGookjinChoice(next, 'human')
          : next;
      });
    }, AUTO_HUMAN_TURN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoPlay, dealing, room]);

  if (!user || !room) return <Loading message="고스톱 게임방을 열고 있습니다" />;
  const liveBalances = room.phase === 'round-ended'
    ? { human: user.virtualBalance, computerA: computerBalances.computerA, computerB: computerBalances.computerB }
    : settleGostopPointDeltas({
      human: user.virtualBalance,
      computerA: computerBalances.computerA,
      computerB: computerBalances.computerB
    }, room.interimPointDeltas, room.pointValue);
  const money = formatMoney(liveBalances.human);
  const humanTurn = !dealing && room.phase === 'playing' && room.currentPlayer === 'human';
  const humanScore = scoreGostopPlayer(room, 'human');
  const computerAScore = scoreGostopPlayer(room, 'computerA');
  const computerBScore = scoreGostopPlayer(room, 'computerB');
  const floorCardSplit = Math.ceil(room.floorCards.length / 2);
  const decidingPlayer = room.pendingDecision;
  const decidingScore = decidingPlayer ? scoreGostopPlayer(room, decidingPlayer) : null;
  const decidingSettlement = decidingPlayer ? previewGostopSettlement(room, decidingPlayer) : null;
  const balanceEmpty = user.virtualBalance <= 0 || (
    room.phase === 'round-ended'
    && room.roundResult === 'win'
    && room.winner !== null
    && room.winner !== 'human'
    && settledRoundRef.current !== roundGameUuidRef.current
    && -(room.settlement?.pointDeltas.human ?? room.interimPointDeltas.human) * room.pointValue >= user.virtualBalance
  );

  const playHumanCard = async (
    cardId: string,
    preferredPlayedMatchId?: string,
    preferredDrawnMatchId?: string,
    sourceElement?: HTMLButtonElement,
    baseRoom: GostopRoomState = room
  ) => {
    if (baseRoom.phase !== 'playing' || baseRoom.currentPlayer !== 'human' || gookjinChoiceOpen || turnAnimationRef.current) return;
    const candidates = getGostopFloorChoice(baseRoom, 'human', cardId);
    if (!preferredPlayedMatchId && candidates.length === 2) {
      playDecisionSound();
      setFloorChoice({ stage: 'played', cardId, candidates });
      return;
    }
    const drawChoice = getGostopDrawFloorChoice(baseRoom, 'human', cardId, preferredPlayedMatchId);
    if (!preferredDrawnMatchId && drawChoice) {
      playDecisionSound();
      setFloorChoice({ stage: 'drawn', cardId, candidates: drawChoice.candidates, playedMatchId: preferredPlayedMatchId, drawnCardId: drawChoice.drawnCardId });
      return;
    }
    setFloorChoice(null);
    setBombChoice(null);
    setShakeChoice(null);
    turnAnimationRef.current = true;
    try {
      await unlockAudio();
      const bonusMove = Boolean(getCard(cardId)?.tags.includes('bonus-pee'));
      const source = sourceElement ?? humanHandRef.current?.querySelector(`[data-card-id="${cardId}"]`) ?? null;
      const playedTarget = findPlayedCardTarget(floorCardsRef.current, baseRoom.floorCards, cardId, preferredPlayedMatchId);
      playCardSound();
      await animateCardFlight(source, bonusMove ? document.querySelector('.gostop-human-captured') : playedTarget, -7, 280);
      await animateCardFlight(drawPileRef.current, bonusMove ? humanHandRef.current : floorCardsRef.current, 7, 230);
      playFlipSound();
    } finally { turnAnimationRef.current = false; }
    const result = playGostopTurn(baseRoom, 'human', cardId, preferredPlayedMatchId, preferredDrawnMatchId);
    setRoom(result.state);
    if (result.state.phase !== 'round-ended' && !baseRoom.players.human.captured.includes('m09-01') && result.state.players.human.captured.includes('m09-01')) { playDecisionSound(); setGookjinChoiceOpen(true); }
  };
  const requestHumanCard = (cardId: string, source: HTMLButtonElement) => {
    if (!humanTurn || room.players.human.flipOnlyTurns > 0 || bombChoice || shakeChoice) return;
    const bomb = getGostopBombOption(room, 'human', cardId);
    if (bomb) {
      playDecisionSound();
      setBombChoice({ month: bomb.month, handCardIds: bomb.handCardIds, floorCardIds: bomb.floorCardIds, selectedCardId: cardId });
      return;
    }
    const shake = getGostopShakeOption(room, 'human', cardId);
    if (shake) {
      playDecisionSound();
      setShakeChoice({ month: shake.month, cardIds: shake.handCardIds, selectedCardId: cardId });
      return;
    }
    void playHumanCard(cardId, undefined, undefined, source);
  };
  const decideHumanBomb = (decision: 'bomb' | 'plain') => {
    if (!bombChoice) return;
    const choice = bombChoice;
    setBombChoice(null);
    if (decision === 'bomb') {
      const result = playGostopBomb(room, 'human', choice.month).state;
      setRoom(result);
      if (result.phase !== 'round-ended' && !room.players.human.captured.includes('m09-01') && result.players.human.captured.includes('m09-01')) {
        playDecisionSound();
        setGookjinChoiceOpen(true);
      }
      return;
    }
    playCancelSound();
    const source = humanHandRef.current?.querySelector<HTMLButtonElement>(`button[data-card-id="${choice.selectedCardId}"]`);
    void playHumanCard(choice.selectedCardId, undefined, undefined, source ?? undefined);
  };
  const decideHumanShake = (decision: 'shake' | 'plain') => {
    if (!shakeChoice) return;
    const choice = shakeChoice;
    setShakeChoice(null);
    const source = humanHandRef.current?.querySelector<HTMLButtonElement>(`button[data-card-id="${choice.selectedCardId}"]`);
    if (decision === 'plain') {
      playCancelSound();
      void playHumanCard(choice.selectedCardId, undefined, undefined, source ?? undefined);
      return;
    }
    const shaken = declareGostopShake(room, 'human', choice.month);
    setRoom(shaken);
    void playHumanCard(choice.selectedCardId, undefined, undefined, source ?? undefined, shaken);
  };
  const playHumanFlipOnly = async (preferredDrawnMatchId?: string) => {
    if (!humanTurn || room.players.human.flipOnlyTurns <= 0 || turnAnimationRef.current) return;
    const choice = getGostopFlipOnlyDrawChoice(room, 'human');
    if (!preferredDrawnMatchId && choice) {
      playDecisionSound();
      setFloorChoice({ stage: 'flip-only', cardId: '', candidates: choice.candidates, drawnCardId: choice.drawnCardId });
      return;
    }
    setFloorChoice(null);
    turnAnimationRef.current = true;
    try {
      await animateCardFlight(drawPileRef.current, floorCardsRef.current, 7, 230);
      playFlipSound();
    } finally { turnAnimationRef.current = false; }
    const result = playGostopFlipOnlyTurn(room, 'human', preferredDrawnMatchId).state;
    setRoom(result);
    if (result.phase !== 'round-ended' && !room.players.human.captured.includes('m09-01') && result.players.human.captured.includes('m09-01')) {
      playDecisionSound();
      setGookjinChoiceOpen(true);
    }
  };
  const decide = (decision: 'go' | 'stop') => setRoom(chooseGostopDecision(room, 'human', decision));
  const newRound = () => {
    if (balanceEmpty) {
      navigate('/gostop');
      return;
    }
    setFloorChoice(null);
    setBombChoice(null);
    setShakeChoice(null);
    setAutoPlay(false);
    setGookjinChoiceOpen(false);
    setExitDialogOpen(false);
    setExitReserved(false);
    setDealing(true);
    roundGameUuidRef.current = crypto.randomUUID();
    settledRoundRef.current = null;
    const nextStarter = room.roundResult === 'win' && room.winner ? room.winner : room.startingPlayer;
    setRoom(createGostopRoom(Date.now(), room.pointValue, nextGostopRoundMultiplier(room.roundResult), nextStarter, room.computerPlayers));
    void unlockAudio().then(playStartSound);
  };
  const reserveExit = () => {
    setExitDialogOpen(false);
    setExitReserved(true);
  };
  const leaveNow = () => {
    setExitDialogOpen(false);
    navigate('/gostop');
  };
  const toggleAutoPlay = () => {
    setFloorChoice(null);
    setBombChoice(null);
    setShakeChoice(null);
    setAutoPlay(current => {
      const next = !current;
      if (next) void unlockAudio().then(() => playAutoPlaySound(true));
      else playAutoPlaySound(false);
      return next;
    });
  };
  const changeAudioSettings = (next: AudioSettings) => {
    setAudioSettings(next);
    applyAudioSettings(next);
    saveAudioSettings(next);
    if (!next.muted) void unlockAudio();
  };
  const changeDifficulty = (next: AiDifficulty) => {
    setDifficulty(next);
    saveGostopAiDifficulty(next);
  };
  const decideGookjin = (asDoubleJunk: boolean) => {
    playGookjinSound(asDoubleJunk);
    setRoom(current => current ? setGostopGookjinChoice(current, 'human', asDoubleJunk) : current);
    setGookjinChoiceOpen(false);
  };

  return <div className={`${viewportFit.className} gostop-room-page`} style={viewportFit.style}>
    <main className="gostop-table">
      <aside className="gostop-room-info" aria-label="게임방 정보">
        <strong>3인 고스톱 <span>점 {room.pointValue.toLocaleString('ko-KR')}냥{room.roundMultiplier > 1 ? ` · 나가리 ×${room.roundMultiplier}` : ''}</span></strong>
      </aside>
      <section className="gostop-room-difficulty" aria-label="고스톱 컴퓨터 난이도 설정">
        <b>난이도</b>
        <DifficultySelector compact value={difficulty} disabled={dealing} onChange={changeDifficulty} />
      </section>
      <nav className="gostop-room-actions" aria-label="게임방 메뉴">
        <AudioControls compact settings={audioSettings} onChange={changeAudioSettings} />
        <button type="button" className={exitReserved ? 'exit-reserved' : ''} disabled={exitReserved} onClick={() => setExitDialogOpen(true)}>{exitReserved ? '나가기 예약됨' : '나가기'}</button>
        <button type="button" disabled={balanceEmpty} onClick={newRound}>새 판</button>
      </nav>
      {dealing && <GostopDealAnimation />}
      <section ref={computerAHandRef} className={`gostop-seat opponent-a${room.currentPlayer === 'computerA' ? ' active' : ''}`}>
        <div className="gostop-player-summary"><span>{room.computerPlayers.computerA.icon}</span><b>{room.computerPlayers.computerA.name}</b><small>{formatMoney(liveBalances.computerA)}냥</small></div>
        <GostopHiddenHand cardIds={room.players.computerA.hand} />
        <GostopScoreSummary key={`${computerAScore.total}-${room.players.computerA.goCount}`} score={computerAScore} capturedCount={room.players.computerA.captured.length} goCount={room.players.computerA.goCount} />
        <GostopOpponentCaptured cardIds={room.players.computerA.captured} name={room.computerPlayers.computerA.name} gookjinAsDoubleJunk={room.players.computerA.gookjinAsDoubleJunk} />
      </section>
      <section ref={computerBHandRef} className={`gostop-seat opponent-b${room.currentPlayer === 'computerB' ? ' active' : ''}`}>
        <div className="gostop-player-summary"><span>{room.computerPlayers.computerB.icon}</span><b>{room.computerPlayers.computerB.name}</b><small>{formatMoney(liveBalances.computerB)}냥</small></div>
        <GostopHiddenHand cardIds={room.players.computerB.hand} />
        <GostopScoreSummary key={`${computerBScore.total}-${room.players.computerB.goCount}`} score={computerBScore} capturedCount={room.players.computerB.captured.length} goCount={room.players.computerB.goCount} />
        <GostopOpponentCaptured cardIds={room.players.computerB.captured} name={room.computerPlayers.computerB.name} gookjinAsDoubleJunk={room.players.computerB.gookjinAsDoubleJunk} />
      </section>
      <section className="gostop-floor" aria-label={`바닥패 ${room.floorCards.length}장`}>
        <div ref={floorCardsRef} className="gostop-floor-cards">
          <div className="gostop-floor-card-group left">{room.floorCards.slice(0, floorCardSplit).map(cardId => <HwatuCard key={cardId} cardId={cardId} />)}</div>
          <button
            ref={drawPileRef}
            type="button"
            className="gostop-draw-pile"
            aria-label={`더미 ${room.drawPile.length}장${room.players.human.flipOnlyTurns > 0 ? ', 폭탄으로 비워 둔 차례에 뒤집기' : ''}`}
            disabled={!humanTurn || room.players.human.flipOnlyTurns <= 0}
            onClick={() => void playHumanFlipOnly()}
          ><span>花</span><b>{room.drawPile.length}</b></button>
          <div className="gostop-floor-card-group right">{room.floorCards.slice(floorCardSplit).map(cardId => <HwatuCard key={cardId} cardId={cardId} />)}</div>
        </div>
      </section>
      <div className="gostop-room-status" aria-live="polite"><strong>{room.phase === 'round-ended' ? '판 종료' : humanTurn ? '내 차례' : `${playerName(room.currentPlayer, user, room.computerPlayers)} 차례`}</strong><span>{room.lastAction}</span></div>
      <section className={`gostop-human-seat${humanTurn ? ' active' : ''}`}>
        <div className="gostop-player-summary human"><span>🙂</span><b>{user.displayName}</b><small>{money}냥</small></div>
        <GostopScoreSummary key={`${humanScore.total}-${room.players.human.goCount}`} score={humanScore} capturedCount={room.players.human.captured.length} goCount={room.players.human.goCount} />
        <div className="gostop-human-captured">
          <b>내가 먹은 패</b>
          {room.players.human.captured.length > 0
            ? <CapturedCardRack
                cardIds={room.players.human.captured}
                owner="human"
                gookjinAsDoubleJunk={room.players.human.gookjinAsDoubleJunk}
                onToggleGookjin={room.phase !== 'round-ended' ? () => { playDecisionSound(); setGookjinChoiceOpen(true); } : undefined}
              />
            : <span>아직 획득한 패가 없습니다</span>}
        </div>
        <GostopHumanHand
          ref={humanHandRef}
          cardIds={room.players.human.hand}
          floorCardIds={room.floorCards}
          disabled={!humanTurn || gookjinChoiceOpen || room.players.human.flipOnlyTurns > 0 || Boolean(bombChoice) || Boolean(shakeChoice)}
          showHints={humanTurn && !floorChoice && !gookjinChoiceOpen && room.players.human.flipOnlyTurns === 0}
          selectedCardId={floorChoice?.stage === 'played' ? floorChoice.cardId : null}
          onPlay={requestHumanCard}
        />
        <div className="gostop-auto-zone"><AutoPlayButton active={autoPlay} disabled={room.phase === 'round-ended'} onToggle={toggleAutoPlay} /></div>
      </section>
      {floorChoice && <div className="gostop-floor-choice" role="dialog" aria-label="먹을 바닥패 선택">
        <strong>{floorChoice.stage === 'drawn' ? `뒤집은 패로 어느 패를 먹을까요?` : '어느 패를 먹을까요?'}</strong>
        {floorChoice.drawnCardId && <span className="gostop-drawn-card"><HwatuCard cardId={floorChoice.drawnCardId} />뒤집은 패</span>}
        <div>{floorChoice.candidates.map(cardId => <HwatuCard key={cardId} cardId={cardId} onClick={() => {
          playSelectSound();
          return floorChoice.stage === 'played'
            ? playHumanCard(floorChoice.cardId, cardId)
            : floorChoice.stage === 'drawn'
            ? playHumanCard(floorChoice.cardId, floorChoice.playedMatchId, cardId)
            : playHumanFlipOnly(cardId);
        }} />)}</div>
        <button type="button" onClick={() => { playCancelSound(); setFloorChoice(null); }}>다른 손패 고르기</button>
      </div>}
      {bombChoice && <BombDecisionPanel
        month={bombChoice.month}
        kind="three-card-bomb"
        handCardIds={bombChoice.handCardIds}
        floorCardIds={bombChoice.floorCardIds}
        selectedCardId={bombChoice.selectedCardId}
        onDecision={decideHumanBomb}
      />}
      {shakeChoice && <ShakeDecisionPanel
        month={shakeChoice.month}
        cardIds={shakeChoice.cardIds}
        selectedCardId={shakeChoice.selectedCardId}
        onDecision={decideHumanShake}
      />}
      {gookjinChoiceOpen && room.players.human.captured.includes('m09-01') && <GookjinDecisionPanel
        currentAsDoubleJunk={room.players.human.gookjinAsDoubleJunk}
        onDecision={decideGookjin}
      />}
      {!gookjinChoiceOpen && room.phase === 'awaiting-go-stop' && decidingPlayer && decidingScore && <GoStopDecisionPanel
        owner={decidingPlayer === 'human' ? 'human' : 'computer'}
        score={decidingScore.total}
        nextGoCount={room.players[decidingPlayer].goCount + 1}
        stopScore={decidingSettlement?.commonScore ?? decidingScore.total}
        stopAmount={(decidingSettlement?.commonScore ?? decidingScore.total) * room.pointValue}
        onDecision={decidingPlayer === 'human' ? decide : undefined}
      />}
    </main>
    {room.phase === 'round-ended' && <GostopRoundResult room={room} winnerName={room.winner ? playerName(room.winner, user, room.computerPlayers) : ''} exitReserved={exitReserved} balanceEmpty={balanceEmpty} onContinue={newRound} onExit={leaveNow} onReturnLobby={() => navigate('/gostop')} />}
    {exitDialogOpen && <ExitChoiceDialog onReserve={reserveExit} onImmediate={leaveNow} onCancel={() => setExitDialogOpen(false)} guide="현재 판을 마친 뒤 나가거나, 지금 바로 나갈 수 있습니다." immediateDescription="현재 판을 중단하고 바로 나갑니다" />}
    {declaration && <GameDeclarationOverlay key={declaration.id} effect={declaration} />}
  </div>;
}
