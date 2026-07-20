import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AiThinkingIndicator from '../components/AiThinkingIndicator';
import AudioControls from '../components/AudioControls';
import AutoPlayButton from '../components/AutoPlayButton';
import BombDecisionPanel from '../components/BombDecisionPanel';
import CardMissionPanel from '../components/CardMissionPanel';
import CapturedCardRack from '../components/CapturedCardRack';
import CaptureSummary from '../components/CaptureSummary';
import ChongtongDecisionPanel from '../components/ChongtongDecisionPanel';
import DifficultySelector from '../components/DifficultySelector';
import DealAnimation from '../components/DealAnimation';
import DiscardConfirmationToggle from '../components/DiscardConfirmationToggle';
import ExitChoiceDialog from '../components/ExitChoiceDialog';
import FloorCardField, { type FloorCardChoice } from '../components/FloorCardField';
import GameDeclarationOverlay, { type DeclarationEffect, type DeclarationKind } from '../components/GameDeclarationOverlay';
import GamePlayerPanel from '../components/GamePlayerPanel';
import GoStopDecisionPanel from '../components/GoStopDecisionPanel';
import GookjinDecisionPanel from '../components/GookjinDecisionPanel';
import HumanHandRow from '../components/HumanHandRow';
import Loading from '../components/Loading';
import PointValueSelector from '../components/PointValueSelector';
import RoundResultOverlay, { type MoneyTransfer } from '../components/RoundResultOverlay';
import ShakeDecisionPanel from '../components/ShakeDecisionPanel';
import StakeQuickSelector from '../components/StakeQuickSelector';
import StartingPlayerChoice from '../components/StartingPlayerChoice';
import TableScoreBadge from '../components/TableScoreBadge';
import UndoTurnButton from '../components/UndoTurnButton';
import { chooseAiFloorMatch } from '../engine/ai/evaluator';
import { AI_DIFFICULTY_ORDER, aiDifficultyLabel } from '../engine/ai/settings';
import { chooseAiChongtong, chooseAiGoStop, chooseAiGookjinAsDoubleJunk, chooseAiMove } from '../engine/ai/strategy';
import { createAiThinkingPlan, type AiThinkingPlan } from '../engine/ai/thinking';
import type { AiDifficulty } from '../engine/ai/types';
import { getCard } from '../engine/cards';
import { chooseChongtong, chooseGo, chooseStartingPlayer, chooseStop, createInitialGame, declareShake, getDrawFloorChoice, getFlipOnlyDrawChoice, getMatchingFloorCards, isValidGameState, nextRoundMultiplier, playBomb, playFlipOnlyTurn, playTurn, setGookjinChoice, setPointValue } from '../engine/gameState';
import { calculateCapturedScore } from '../engine/rules/scoring';
import { createCardMission } from '../engine/rules/missions';
import { normalizeMatgoPointValue, type MatgoPointValue } from '../engine/rules/settings';
import { findBombOptions, findShakeOptions, type BombOption } from '../engine/rules/specialRules';
import type { GameState, TurnResult, TurnSpecialEvent } from '../engine/types';
import { loadMatgoServerGame, saveMatgoServerGame, session } from '../lib/api';
import { applyAudioSettings, pauseGameAudio, playBombSound, playBonusPeeSound, playCaptureSound, playCardSound, playFlipSound, playGoSound, playLoseSound, playMissionSound, playMoneySound, playNagariSound, playPeeTransferSound, playPpeokSound, playScoreSound, playShakeSound, playSpecialMoveSound, playStartSound, playStopSound, playWinSound, unlockAudio } from '../lib/audio';
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from '../lib/audioSettings';
import { animateCapturedCardTransfers, animateCardFlight } from '../lib/effects';
import { loadAiDifficulty, loadDiscardConfirmation, loadPointValue, saveAiDifficulty, saveDiscardConfirmation, savePointValue } from '../lib/gamePreferences';
import { chooseLatestGame, shouldResumeSavedGame } from '../lib/gameResume';
import { useGameViewportFit } from '../lib/gameViewport';
import { remainingTurnUndos, useTurnUndo } from '../lib/useTurnUndo';
import { useProfileImageUpload } from '../lib/useProfileImageUpload';
import { opponentNameForGame } from '../lib/opponentNames';
import { handCardIndexFromKey, isTextEntryTarget } from '../lib/gameShortcuts';
import { loadLocalGame, loadProfile, saveLocalGame, saveProfile } from '../lib/localStore';
import { describePeeTransfer, summarizePeeTransfer } from '../lib/peeEffects';
import { getPpeokDeclaration } from '../lib/ppeokEffects';
import { getScoreCelebration, getScoreHeadline, getSettlementCelebration } from '../lib/scoreEffects';
import type { SessionData, UserProfile } from '../lib/types';

const ROUND_RESULT_REVEAL_DELAY_MS = 2200;

function bonusPeeBurst(cardIds: string[]) {
  const values = cardIds.map(cardId => getCard(cardId)?.tags.includes('triple-junk') ? 3 : 2);
  const strongest = values.includes(3) ? 3 : 2;
  return {
    kind: strongest === 3 ? 'triple-pee' as const : 'double-pee' as const,
    strongest: strongest as 2 | 3,
    totalValue: values.reduce((total, value) => total + value, 0)
  };
}

export default function GamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const viewportFit = useGameViewportFit();
  const [game, setGame] = useState<GameState | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [onlineSession, setOnlineSession] = useState<SessionData | null>(null);
  const profileImage = useProfileImageUpload(onlineSession !== null || (import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === '1'), setProfile);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => loadAudioSettings());
  const [preferredDifficulty, setPreferredDifficulty] = useState<AiDifficulty>(() => loadAiDifficulty());
  const [preferredPointValue, setPreferredPointValue] = useState<MatgoPointValue>(() => loadPointValue());
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exitReserved, setExitReserved] = useState(false);
  const [computerBalance, setComputerBalance] = useState(500000);
  const [moneyTransfer, setMoneyTransfer] = useState<MoneyTransfer | null>(null);
  const [dealing, setDealing] = useState(false);
  const [declaration, setDeclaration] = useState<DeclarationEffect | null>(null);
  const [floorCardChoice, setFloorCardChoice] = useState<FloorCardChoice | null>(null);
  const [bombChoice, setBombChoice] = useState<(BombOption & { selectedCardId: string }) | null>(null);
  const [shakeChoice, setShakeChoice] = useState<{ month: number; cardIds: string[]; selectedCardId: string } | null>(null);
  const [stakeSelectorOpen, setStakeSelectorOpen] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [discardConfirmation, setDiscardConfirmation] = useState(() => loadDiscardConfirmation());
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [aiThinking, setAiThinking] = useState<AiThinkingPlan | null>(null);
  const [gookjinChoiceOpen, setGookjinChoiceOpen] = useState(false);
  const floorRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const computerHandRef = useRef<HTMLDivElement>(null);
  const humanHandRef = useRef<HTMLDivElement>(null);
  const aiTimerRef = useRef<number | null>(null);
  const autoPlayTimerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const announcedResultRef = useRef<string | null>(null);
  const transferredGameRef = useRef<string | null>(null);
  const dealTimerRef = useRef<number | null>(null);
  const declarationTimerRef = useRef<number | null>(null);
  const declarationSequenceRef = useRef(0);
  const drawChoiceResolverRef = useRef<((cardId: string) => void) | null>(null);
  const turnUndo = useTurnUndo();

  useEffect(() => {
    applyAudioSettings(audioSettings);
    saveAudioSettings(audioSettings);
  }, [audioSettings]);
  useEffect(() => saveDiscardConfirmation(discardConfirmation), [discardConfirmation]);

  useEffect(() => () => {
    pauseGameAudio();
    if (dealTimerRef.current !== null) window.clearTimeout(dealTimerRef.current);
    if (declarationTimerRef.current !== null) window.clearTimeout(declarationTimerRef.current);
    if (autoPlayTimerRef.current !== null) window.clearTimeout(autoPlayTimerRef.current);
  }, []);

  const showDeclaration = (kind: DeclarationKind, text: string, detail?: string, duration = 950, peeBurstValue?: 2 | 3, peeBurstText?: string) => {
    if (declarationTimerRef.current !== null) window.clearTimeout(declarationTimerRef.current);
    declarationSequenceRef.current += 1;
    setDeclaration({ id: declarationSequenceRef.current, kind, text, detail, peeBurstValue, peeBurstText });
    declarationTimerRef.current = window.setTimeout(() => setDeclaration(null), duration);
  };

  const showDealAnimation = () => {
    if (dealTimerRef.current !== null) window.clearTimeout(dealTimerRef.current);
    setDealing(true);
    dealTimerRef.current = window.setTimeout(() => {
      setDealing(false);
    }, 1700);
  };

  const announceBonus = (result: TurnResult, opponent = false, delay = 0) => {
    const count = result.bonusCards?.length ?? 0;
    if (!count) return false;
    const burst = bonusPeeBurst(result.bonusCards ?? []);
    const show = () => {
      playBonusPeeSound(burst.strongest, opponent, count);
      const stolen = result.bonusStolenPee?.length ?? result.stolenPee?.length ?? 0;
      const mission = result.missionCards?.length ? ` · 미션 ×${result.missionMultiplier ?? 1}` : '';
      const chain = count > 1 ? `${count}장 연속 · ` : '';
      showDeclaration(burst.kind, burst.strongest === 3 ? '쓰리피!' : '쌍피!', `${chain}피 ${burst.totalValue}장 값${stolen ? ` · 상대 피 ${stolen}장 뺏기` : ''}${mission}`, 1250);
    };
    if (delay) window.setTimeout(show, delay);
    else show();
    return true;
  };

  const announceSpecialCapture = (result: TurnResult, opponent = false, delay = 0) => {
    const candidates = (result.specialEvents ?? []).filter(event => event.kind !== 'ppeok' && event.kind !== 'bomb') as Array<TurnSpecialEvent & {
      kind: 'jjok' | 'ttadak' | 'sweep' | 'ppeok-capture' | 'self-ppeok';
    }>;
    if (!candidates.length) return false;
    const priority = ['self-ppeok', 'ppeok-capture', 'ttadak', 'jjok', 'sweep'];
    const primary = [...candidates].sort((left, right) => priority.indexOf(left.kind) - priority.indexOf(right.kind))[0];
    const secondary = candidates.filter(event => event !== primary).map(event => event.label);
    const stolenPee = candidates.flatMap(event => event.stolenPee);
    const transfer = summarizePeeTransfer(stolenPee);
    const detail = [secondary.length ? `${secondary.join(' · ')}까지` : '', describePeeTransfer(stolenPee, opponent), result.missionCards?.length ? `미션 ×${result.missionMultiplier ?? 1}` : '']
      .filter(Boolean).join(' · ');
    const show = () => {
      playSpecialMoveSound(primary.kind, opponent);
      if (transfer.strongestBurst) window.setTimeout(() => playPeeTransferSound(transfer.strongestBurst!, opponent), 120);
      const burstText = transfer.strongestBurst
        ? `${transfer.strongestBurst === 3 ? '쓰리피' : '쌍피'} ${opponent ? '뺏김' : '뺏기'}!`
        : undefined;
      showDeclaration(primary.kind, `${primary.label}!`, detail, transfer.strongestBurst ? 1350 : 1100, transfer.strongestBurst ?? undefined, burstText);
    };
    if (delay) window.setTimeout(show, delay);
    else show();
    return true;
  };

  const announceMission = (result: TurnResult, opponent = false, delay = 0) => {
    const count = result.missionCards?.length ?? 0;
    if (!count) return false;
    const multiplier = result.missionMultiplier ?? 1;
    const show = () => {
      playMissionSound(multiplier, opponent);
      showDeclaration('mission', `미션 ×${multiplier}!`, `미션패 ${count}장 획득`, 1100);
    };
    if (delay) window.setTimeout(show, delay);
    else show();
    return true;
  };

  const persist = async (state: GameState, account: UserProfile, auth: SessionData | null) => {
    await saveLocalGame(account.id, state, Boolean(auth));
    if (!auth || !navigator.onLine) return;
    try {
      const saved = await saveMatgoServerGame(auth, state);
      await saveLocalGame(account.id, state, false);
      if (saved.balance !== account.virtualBalance || saved.opponentBalance !== account.opponentBalance) {
        const updatedProfile = { ...account, virtualBalance: saved.balance, opponentBalance: saved.opponentBalance };
        setProfile(current => current?.id === account.id ? {
          ...current,
          virtualBalance: saved.balance,
          opponentBalance: saved.opponentBalance
        } : current);
        await saveProfile(updatedProfile);
      }
      setComputerBalance(saved.opponentBalance);
      if (state.phase === 'round-ended' && state.settlement && transferredGameRef.current !== state.gameUuid) {
        transferredGameRef.current = state.gameUuid;
        const computerAfter = saved.opponentBalanceAfterSettlement ?? saved.opponentBalance;
        const computerBefore = computerAfter + saved.settlementAmount;
        setMoneyTransfer({
          humanBefore: saved.balance - saved.settlementAmount,
          humanAfter: saved.balance,
          computerBefore,
          computerAfter,
          ...(saved.opponentRefilled ? { computerRefillAfter: saved.opponentBalance } : {}),
          amount: saved.settlementAmount,
          appliedNow: saved.settlementApplied
        });
      }
    }
    catch { /* 로컬 저장으로 계속 */ }
  };

  const undoLastTurn = async () => {
    if (!game || !profile || busy || dealing || floorCardChoice || bombChoice || shakeChoice) return;
    const restored = turnUndo.restore(game);
    if (!restored) return;
    if (aiTimerRef.current !== null) window.clearTimeout(aiTimerRef.current);
    setAiThinking(null); setAutoPlay(false); setGookjinChoiceOpen(false); setStakeSelectorOpen(false);
    setDeclaration(null); setGame(restored); setBusy(true);
    try { await persist(restored, profile, onlineSession); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    (async () => {
      const parameters = new URLSearchParams(location.search);
      if (import.meta.env.DEV && parameters.get('preview') === '1') {
        setProfile({ id: 0, username: 'preview', displayName: '어머니', role: 'member', virtualBalance: 500000 });
        setGame(createInitialGame(20260719, preferredDifficulty, preferredPointValue));
        setStarted(false);
        return;
      }
      let auth: SessionData | null = null;
      let account: UserProfile | null = null;
      try { auth = await session(); account = auth.user; await saveProfile(account); setOnlineSession(auth); }
      catch { account = await loadProfile(); }
      if (!account) return navigate('/login', { replace: true });
      if (account.virtualBalance <= 0) return navigate('/matgo', { replace: true });
      setProfile(account);
      const loadedOpponentBalance = Number.isFinite(account.opponentBalance) ? account.opponentBalance! : 500000;
      setComputerBalance(loadedOpponentBalance);
      const fresh = parameters.get('action') === 'new';
      if (fresh) { const state = createInitialGame(Date.now(), preferredDifficulty, preferredPointValue); setGame(state); setStarted(state.phase === 'round-ended'); navigate('/matgo/play', { replace: true }); await persist(state, account, auth); return; }
      const local = await loadLocalGame(account.id);
      let serverState: GameState | null = null;
      if (auth) { try { const saved = await loadMatgoServerGame(); serverState = saved?.state && isValidGameState(saved.state) ? saved.state : null; } catch { /* 오프라인 저장으로 계속 */ } }
      const state = chooseLatestGame(local?.state && isValidGameState(local.state) ? local.state : null, serverState) ?? createInitialGame(Date.now(), preferredDifficulty, preferredPointValue);
      const difficulty = state.computerDifficulty ?? preferredDifficulty;
      const pointValue = normalizeMatgoPointValue(state.pointValue);
      state.computerDifficulty = difficulty;
      state.pointValue = pointValue;
      state.roundMultiplier ??= 1;
      state.mission ??= createCardMission(state.randomSeed);
      setPreferredDifficulty(difficulty);
      setPreferredPointValue(pointValue);
      saveAiDifficulty(difficulty);
      savePointValue(pointValue);
      setGame(state); setStarted(shouldResumeSavedGame(state)); await persist(state, account, auth);
    })().catch(() => navigate('/login', { replace: true }));
    return () => { if (aiTimerRef.current !== null) window.clearTimeout(aiTimerRef.current); };
  }, [location.search, navigate]);

  useEffect(() => {
    if (!started || !game || !profile || busy || dealing || gookjinChoiceOpen || (autoPlay && declaration) || game.currentPlayer !== 'computer' || game.phase !== 'playing') return;
    const thinking = createAiThinkingPlan(game.computerDifficulty ?? preferredDifficulty, game.randomSeed, game.turnNumber, 'turn', autoPlay);
    setAiThinking(autoPlay ? null : thinking);
    aiTimerRef.current = window.setTimeout(async () => {
      setAiThinking(null);
      setBusy(true);
      const working = structuredClone(game);
      const difficulty = working.computerDifficulty ?? preferredDifficulty;
      const choice = chooseAiMove(working, 'computer', difficulty);
      if (!choice.move) { setBusy(false); return; }
      if (choice.move.kind === 'shake') {
        const next = declareShake(working, 'computer', choice.move.month);
        playShakeSound(true);
        showDeclaration('shake', '흔들기!', `상대가 ${choice.move.month}월 세 장을 공개했습니다.`, 1100);
        setGame(next); await persist(next, profile, onlineSession); setBusy(false);
        return;
      }
      let result;
      if (choice.move.kind === 'flip-only') {
        await animateCardFlight(deckRef.current, floorRef.current, 8, 260);
        playFlipSound();
        result = playFlipOnlyTurn(working, 'computer');
      } else {
        const source = computerHandRef.current?.querySelector('.card-back');
        const bonusMove = choice.move.kind === 'card' && getCard(choice.move.cardId)?.tags.includes('bonus-pee');
        const flightTarget = bonusMove ? document.querySelector('.opponent-rack') : floorRef.current;
        await animateCardFlight(source ?? null, flightTarget, 6, 360);
        if (choice.move.kind === 'bomb') {
          playBombSound(true);
          result = playBomb(working, 'computer', choice.move.month);
          const bombStolen = result.specialEvents?.find(event => event.kind === 'bomb')?.stolenPee ?? [];
          const mission = result.missionCards?.length ? ` · 미션 ×${result.missionMultiplier ?? 1}` : '';
          showDeclaration('bomb', '폭탄!', `상대가 패를 한꺼번에 냈습니다.${bombStolen.length ? ` · ${describePeeTransfer(bombStolen, true)}` : ''}${mission}`, 1100);
        } else {
          playCardSound();
          result = playTurn(working, 'computer', choice.move.cardId, { playedMatchId: choice.move.playedMatchId });
        }
      }
      if (result.replacementCardId) await animateCardFlight(deckRef.current, computerHandRef.current, 8, 240);
      await animateCapturedCardTransfers(result.stolenPee ?? [], document.querySelector('.human-rack'), document.querySelector('.opponent-rack'));
      setGame(result.state);
      if (result.drawnCardId && choice.move.kind !== 'flip-only') window.setTimeout(playFlipSound, 100);
      const showedBonus = announceBonus(result, true, choice.move.kind === 'bomb' ? 620 : 0);
      const scoreEffect = getScoreCelebration(working, result.state, 'computer');
      if (result.ppeok) {
        window.setTimeout(() => {
          const effect = getPpeokDeclaration(result.state.computerPpeokCount);
          playPpeokSound(true, effect.count);
          showDeclaration(effect.kind, effect.text, effect.detail, effect.duration);
        }, showedBonus ? 1120 : 190);
      } else if (announceSpecialCapture(result, true, showedBonus ? (choice.move.kind === 'bomb' ? 1720 : 1120) : choice.move.kind === 'bomb' ? 1180 : 190)) {
        // 특수 패 선언이 일반 짝 효과를 대신합니다.
      } else if (!showedBonus && choice.move.kind !== 'bomb' && announceMission(result, true, 190)) {
        // 미션 성공 선언이 일반 짝 효과를 대신합니다.
      } else if (result.captured.length && choice.move.kind !== 'bomb' && !showedBonus) {
        if (scoreEffect) {
          window.setTimeout(() => playScoreSound(scoreEffect.label, scoreEffect.score, true), 190);
          showDeclaration('score', `${scoreEffect.label}!`, `+${scoreEffect.points}점 · 현재 ${scoreEffect.score}점`, 1250);
        } else {
          window.setTimeout(() => playCaptureSound(true), 190);
          showDeclaration('capture', '짝!', `${result.captured.length}장을 먹었습니다.`, 620);
        }
      }
      await persist(result.state, profile, onlineSession);
      setBusy(false);
    }, thinking.durationMs);
    return () => { if (aiTimerRef.current !== null) window.clearTimeout(aiTimerRef.current); setAiThinking(null); };
  }, [autoPlay, busy, dealing, autoPlay && declaration, game, gookjinChoiceOpen, onlineSession, preferredDifficulty, profile, started]);

  const playHumanBombSkip = async (autoChooseDraw = false) => {
    if (!started || !game || !profile || busy || dealing || game.currentPlayer !== 'human' || game.phase !== 'playing' || (game.humanBombSkips ?? 0) <= 0) return;
    if (autoChooseDraw) turnUndo.clear(); else turnUndo.capture(game);
    setBusy(true);
    try {
      const drawChoice = getFlipOnlyDrawChoice(game);
      await animateCardFlight(deckRef.current, floorRef.current, -8, 260);
      playFlipSound();
      let drawnMatchId: string | undefined;
      if (drawChoice) {
        if (autoChooseDraw) drawnMatchId = chooseAiFloorMatch(drawChoice.candidateIds, game.computerCaptured);
        else {
          drawnMatchId = await new Promise<string>(resolve => {
            drawChoiceResolverRef.current = resolve;
            setFloorCardChoice({ playedCardId: drawChoice.drawnCardId, candidateIds: drawChoice.candidateIds, source: 'draw' });
          });
          drawChoiceResolverRef.current = null;
        }
      }
      const result = playFlipOnlyTurn(game, 'human', drawnMatchId);
      await animateCapturedCardTransfers(result.stolenPee ?? [], document.querySelector('.opponent-rack'), document.querySelector('.human-rack'));
      setGame(result.state);
      if (!game.humanCaptured.includes('m09-01') && result.state.humanCaptured.includes('m09-01')) setGookjinChoiceOpen(true);
      const showedBonus = announceBonus(result);
      const showedSpecial = announceSpecialCapture(result, false, showedBonus ? 1120 : 150);
      const showedMission = !showedBonus && !showedSpecial && announceMission(result, false, 150);
      if (result.captured.length && !showedBonus && !showedSpecial && !showedMission) {
        window.setTimeout(playCaptureSound, 150);
        showDeclaration('capture', '짝!', `${result.captured.length}장을 먹었습니다.`, 620);
      }
      await persist(result.state, profile, onlineSession);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!started || !game || !profile || busy || dealing || gookjinChoiceOpen || (autoPlay && declaration) || game.phase !== 'awaiting-chongtong' || game.pendingDecision !== 'computer') return;
    const thinking = createAiThinkingPlan(game.computerDifficulty ?? preferredDifficulty, game.randomSeed, game.turnNumber, 'chongtong', autoPlay);
    setAiThinking(autoPlay ? null : thinking);
    aiTimerRef.current = window.setTimeout(async () => {
      setAiThinking(null);
      setBusy(true);
      const working = structuredClone(game);
      const decision = chooseAiChongtong(working, working.computerDifficulty ?? preferredDifficulty);
      const next = chooseChongtong(working, 'computer', decision);
      if (decision === 'continue') {
        playShakeSound(true);
        showDeclaration('shake', '흔들기!', '상대가 총통을 공개했습니다.', 1100);
      } else {
        playStopSound(true);
        showDeclaration('stop', '스톱!', '총통으로 7점 승리', 1200);
      }
      setGame(next); await persist(next, profile, onlineSession); setBusy(false);
    }, thinking.durationMs);
    return () => { if (aiTimerRef.current !== null) window.clearTimeout(aiTimerRef.current); setAiThinking(null); };
  }, [autoPlay, busy, dealing, autoPlay && declaration, game, gookjinChoiceOpen, onlineSession, preferredDifficulty, profile, started]);

  useEffect(() => {
    if (!started || !game || !profile || busy || dealing || gookjinChoiceOpen || (autoPlay && declaration) || game.phase !== 'awaiting-go-stop' || game.pendingDecision !== 'computer') return;
    const thinking = createAiThinkingPlan(game.computerDifficulty ?? preferredDifficulty, game.randomSeed, game.turnNumber, 'go-stop', autoPlay);
    setAiThinking(autoPlay ? null : thinking);
    aiTimerRef.current = window.setTimeout(async () => {
      setAiThinking(null);
      setBusy(true);
      const working = structuredClone(game);
      const difficulty = working.computerDifficulty ?? preferredDifficulty;
      const decision = chooseAiGoStop(working, 'computer', difficulty);
      const next = decision === 'go' ? chooseGo(working, 'computer') : chooseStop(working, 'computer');
      if (decision === 'go') {
        const scoreHeadline = getScoreHeadline(next, 'computer');
        playGoSound(next.computerGoCount, true);
        showDeclaration('go', `${next.computerGoCount}고!`, scoreHeadline ? `${scoreHeadline.label} · 현재 ${scoreHeadline.score}점` : '상대가 승부를 계속합니다.', next.computerGoCount >= 5 ? 1800 : 1150);
      } else {
        playStopSound(true);
        const settlementEffect = getSettlementCelebration(next, 'computer');
        showDeclaration('settlement', settlementEffect.text, settlementEffect.detail, 1600);
      }
      setGame(next); await persist(next, profile, onlineSession); setBusy(false);
    }, thinking.durationMs);
    return () => { if (aiTimerRef.current !== null) window.clearTimeout(aiTimerRef.current); setAiThinking(null); };
  }, [autoPlay, busy, dealing, autoPlay && declaration, game, gookjinChoiceOpen, onlineSession, preferredDifficulty, profile, started]);

  useEffect(() => {
    if (!started || !game || gookjinChoiceOpen || game.phase !== 'round-ended' || announcedResultRef.current === game.gameUuid) return;
    announcedResultRef.current = game.gameUuid;
    const timer = window.setTimeout(() => {
      if (game.winner === 'human') playWinSound(game.settlement?.finalScore ?? 7, game.humanGoCount);
      else if (game.winner === 'computer') playLoseSound(game.settlement?.baks.map(bak => bak.label) ?? []);
      else playNagariSound();
    }, 520);
    return () => window.clearTimeout(timer);
  }, [game, gookjinChoiceOpen, started]);

  useEffect(() => {
    if (!started || gookjinChoiceOpen || game?.phase !== 'round-ended') {
      setShowRoundResult(false);
      return;
    }
    setShowRoundResult(false);
    const timer = window.setTimeout(() => setShowRoundResult(true), ROUND_RESULT_REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [game?.gameUuid, game?.phase, gookjinChoiceOpen, started]);

  useEffect(() => {
    if (!showRoundResult || !moneyTransfer?.appliedNow || moneyTransfer.amount === 0) return;
    playMoneySound(moneyTransfer.amount > 0);
  }, [moneyTransfer?.amount, moneyTransfer?.appliedNow, showRoundResult]);

  useEffect(() => {
    if (!started || busy || !exitReserved || game?.phase !== 'round-ended' || !showRoundResult) return;
    const timer = window.setTimeout(() => navigate('/matgo'), 3000);
    return () => window.clearTimeout(timer);
  }, [busy, exitReserved, game?.phase, navigate, showRoundResult, started]);

  const playHumanCard = async (cardId: string, source: HTMLButtonElement, playedMatchId?: string, autoChooseDraw = false, stateOverride?: GameState) => {
    const activeGame = stateOverride ?? game;
    if (!activeGame || !profile || busy || dealing || activeGame.phase !== 'playing' || activeGame.currentPlayer !== 'human') return;
    if (autoChooseDraw) turnUndo.clear(); else turnUndo.capture(activeGame);
    setFloorCardChoice(null);
    setStakeSelectorOpen(false);
    setBusy(true);
    const bonusMove = Boolean(getCard(cardId)?.tags.includes('bonus-pee'));
    const flightTarget = bonusMove ? document.querySelector('.human-rack') : floorRef.current;
    await animateCardFlight(source, flightTarget, -7, 320);
    playCardSound();
    const drawChoice = getDrawFloorChoice(activeGame, cardId, playedMatchId);
    let drawnMatchId: string | undefined;
    let drawAnimated = false;
    if (drawChoice) {
      await animateCardFlight(deckRef.current, floorRef.current, 8, 260);
      playFlipSound();
      drawAnimated = true;
      if (autoChooseDraw) drawnMatchId = chooseAiFloorMatch(drawChoice.candidateIds, activeGame.computerCaptured);
      else {
        drawnMatchId = await new Promise<string>(resolve => {
          drawChoiceResolverRef.current = resolve;
          setFloorCardChoice({ playedCardId: drawChoice.drawnCardId, candidateIds: drawChoice.candidateIds, source: 'draw' });
        });
        drawChoiceResolverRef.current = null;
      }
    }
    const result = playTurn(activeGame, 'human', cardId, { playedMatchId, drawnMatchId });
    if (result.replacementCardId) await animateCardFlight(deckRef.current, humanHandRef.current, 8, 240);
    else if (result.drawnCardId && !drawAnimated) { await animateCardFlight(deckRef.current, floorRef.current, 8, 260); playFlipSound(); }
    await animateCapturedCardTransfers(result.stolenPee ?? [], document.querySelector('.opponent-rack'), document.querySelector('.human-rack'));
    setGame(result.state);
    if (!activeGame.humanCaptured.includes('m09-01') && result.state.humanCaptured.includes('m09-01')) setGookjinChoiceOpen(true);
    const showedBonus = announceBonus(result);
    const scoreEffect = getScoreCelebration(activeGame, result.state, 'human');
    if (result.ppeok) {
      window.setTimeout(() => {
        const effect = getPpeokDeclaration(result.state.humanPpeokCount);
        playPpeokSound(false, effect.count);
        showDeclaration(effect.kind, effect.text, effect.detail, effect.duration);
      }, showedBonus ? 1120 : 0);
    } else if (announceSpecialCapture(result, false, showedBonus ? 1120 : 0)) {
      // 특수 패 선언이 일반 짝 효과를 대신합니다.
    } else if (!showedBonus && announceMission(result)) {
      // 미션 성공 선언이 일반 짝 효과를 대신합니다.
    } else if (result.captured.length && !showedBonus) {
      if (scoreEffect) {
        playScoreSound(scoreEffect.label, scoreEffect.score);
        showDeclaration('score', `${scoreEffect.label}!`, `+${scoreEffect.points}점 · 현재 ${scoreEffect.score}점`, 1250);
      } else {
        playCaptureSound();
        showDeclaration('capture', '짝!', `${result.captured.length}장을 먹었습니다.`, 620);
      }
    }
    await persist(result.state, profile, onlineSession);
    setBusy(false);
  };

  const requestHumanCard = (cardId: string, source: HTMLButtonElement) => {
    if (!game || busy || dealing || floorCardChoice || bombChoice || shakeChoice || gookjinChoiceOpen) return;
    const cardMonth = getCard(cardId)?.month;
    const bomb = findBombOptions(game.humanHand, game.floorCards)
      .find(option => option.month === cardMonth);
    if (bomb) {
      setBombChoice({ ...bomb, selectedCardId: cardId });
      return;
    }
    const shake = findShakeOptions(game.humanHand, game.floorCards, game.humanShakenMonths ?? [])
      .find(option => option.month === cardMonth);
    if (shake) {
      setShakeChoice({ month: shake.month, cardIds: shake.handCardIds, selectedCardId: cardId });
      return;
    }
    const candidateIds = getMatchingFloorCards(game.floorCards, cardId);
    if (candidateIds.length === 2) {
      setFloorCardChoice({ playedCardId: cardId, candidateIds, source: 'hand' });
      return;
    }
    void playHumanCard(cardId, source);
  };

  const decideHumanShake = (decision: 'shake' | 'plain') => {
    if (!game || !shakeChoice || busy || dealing) return;
    const choice = shakeChoice;
    const source = humanHandRef.current?.querySelector<HTMLButtonElement>(`button[data-card-id="${choice.selectedCardId}"]`);
    setShakeChoice(null);
    if (!source) return;
    if (decision === 'plain') {
      void playHumanCard(choice.selectedCardId, source);
      return;
    }
    const next = declareShake(game, 'human', choice.month);
    turnUndo.capture(game);
    playShakeSound();
    showDeclaration('shake', '흔들기!', `${choice.month}월 세 장을 공개했습니다.`, 1200);
    setGame(next);
    void playHumanCard(choice.selectedCardId, source, undefined, false, next);
  };

  const selectFloorCard = (floorCardId: string) => {
    if (!floorCardChoice || !floorCardChoice.candidateIds.includes(floorCardId)) return;
    if (floorCardChoice.source === 'draw') {
      const resolve = drawChoiceResolverRef.current;
      setFloorCardChoice(null);
      resolve?.(floorCardId);
      return;
    }
    const cardId = floorCardChoice.playedCardId;
    const source = humanHandRef.current?.querySelector<HTMLButtonElement>(`button[data-card-id="${cardId}"]`);
    if (!source) { setFloorCardChoice(null); return; }
    void playHumanCard(cardId, source, floorCardId);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isTextEntryTarget(event.target)) return;
      const cardIndex = handCardIndexFromKey(event.code, event.key);
      if (cardIndex === null || !started || !game || !profile || busy || dealing || floorCardChoice || bombChoice || shakeChoice || gookjinChoiceOpen || exitDialogOpen || game.phase !== 'playing' || game.currentPlayer !== 'human') return;
      const cardId = game.humanHand[cardIndex];
      if (!cardId) return;
      const source = humanHandRef.current?.querySelector<HTMLButtonElement>(`button[data-card-id="${cardId}"]`);
      if (!source || source.disabled) return;
      event.preventDefault();
      requestHumanCard(cardId, source);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bombChoice, busy, dealing, exitDialogOpen, floorCardChoice, game, gookjinChoiceOpen, profile, shakeChoice, started]);

  const decideGoStop = async (decision: 'go' | 'stop') => {
    if (!game || !profile || busy || game.pendingDecision !== 'human') return;
    setBusy(true);
    const next = decision === 'go' ? chooseGo(game, 'human') : chooseStop(game, 'human');
    if (decision === 'go') {
      const scoreHeadline = getScoreHeadline(next, 'human');
      playGoSound(next.humanGoCount);
      showDeclaration('go', `${next.humanGoCount}고!`, scoreHeadline ? `${scoreHeadline.label} · 현재 ${scoreHeadline.score}점` : '승부를 계속합니다.', next.humanGoCount >= 5 ? 1800 : 1150);
    } else {
      playStopSound();
      const settlementEffect = getSettlementCelebration(next, 'human');
      showDeclaration('settlement', settlementEffect.text, settlementEffect.detail, 1600);
    }
    setGame(next); await persist(next, profile, onlineSession);
    setBusy(false);
  };

  const useBomb = async (month: number, allowUndo = true) => {
    if (!game || !profile || busy) return;
    if (allowUndo) turnUndo.capture(game); else turnUndo.clear();
    setBusy(true);
    const result = playBomb(game, 'human', month);
    playBombSound();
    const bombStolen = result.specialEvents?.find(event => event.kind === 'bomb')?.stolenPee ?? [];
    const mission = result.missionCards?.length ? ` · 미션 ×${result.missionMultiplier ?? 1}` : '';
    showDeclaration('bomb', '폭탄!', `${month}월 패를 한꺼번에 냈습니다.${bombStolen.length ? ` · ${describePeeTransfer(bombStolen, false)}` : ''}${mission}`, 1100);
    await animateCapturedCardTransfers(result.stolenPee ?? [], document.querySelector('.opponent-rack'), document.querySelector('.human-rack'));
    setGame(result.state);
    if (!game.humanCaptured.includes('m09-01') && result.state.humanCaptured.includes('m09-01')) setGookjinChoiceOpen(true);
    const showedBonus = announceBonus(result, false, 1180);
    announceSpecialCapture(result, false, showedBonus ? 2360 : 1180);
    await persist(result.state, profile, onlineSession); setBusy(false);
  };

  const decideHumanBomb = (decision: 'bomb' | 'plain') => {
    if (!game || !bombChoice || busy || dealing) return;
    const choice = bombChoice;
    const source = humanHandRef.current?.querySelector<HTMLButtonElement>(`button[data-card-id="${choice.selectedCardId}"]`);
    setBombChoice(null);
    if (!source) return;
    if (decision === 'bomb') {
      void useBomb(choice.month);
      return;
    }
    const candidateIds = getMatchingFloorCards(game.floorCards, choice.selectedCardId);
    if (candidateIds.length === 2) {
      setFloorCardChoice({ playedCardId: choice.selectedCardId, candidateIds, source: 'hand' });
      return;
    }
    void playHumanCard(choice.selectedCardId, source);
  };

  const declareHumanShake = async (month: number) => {
    if (!game || !profile || busy) return;
    turnUndo.clear();
    setBusy(true);
    try {
      const next = declareShake(game, 'human', month);
      playShakeSound();
      showDeclaration('shake', '흔들기!', `${month}월 세 장을 공개했습니다. 이제 셋 중 한 장을 내세요.`, 1200);
      setGame(next);
      await persist(next, profile, onlineSession);
    }
    finally { setBusy(false); }
  };

  const decideChongtong = async (decision: 'continue' | 'stop') => {
    if (!game || !profile || busy || game.pendingDecision !== 'human') return;
    setBusy(true);
    const next = chooseChongtong(game, 'human', decision);
    if (decision === 'continue') {
      playShakeSound();
      showDeclaration('shake', '흔들기!', '총통을 공개하고 계속합니다.', 1100);
    } else {
      playStopSound();
      showDeclaration('stop', '스톱!', '총통으로 7점 승리', 1200);
    }
    setGame(next); await persist(next, profile, onlineSession);
    setBusy(false);
  };

  const decideGookjin = async (asDoubleJunk: boolean) => {
    if (!game || !profile) return;
    setBusy(true);
    try {
      const next = setGookjinChoice(game, 'human', asDoubleJunk);
      setGame(next); setGookjinChoiceOpen(false); await persist(next, profile, onlineSession);
    }
    finally { setBusy(false); }
  };

  const start = async () => {
    await unlockAudio(); playStartSound(); setStarted(true);
    if (!game?.turnNumber) showDealAnimation();
  };
  const selectStartingPlayer = async (player: 'human' | 'computer') => {
    if (!game || !profile || busy || game.startingPlayerConfirmed !== false) return;
    setBusy(true);
    try {
      await unlockAudio();
      const next = chooseStartingPlayer(game, player);
      playStartSound();
      setGame(next);
      setStarted(true);
      showDealAnimation();
      await persist(next, profile, onlineSession);
    }
    finally { setBusy(false); }
  };
  const changeAudioSettings = (next: AudioSettings) => {
    setAudioSettings(next);
    applyAudioSettings(next);
    saveAudioSettings(next);
    if (!next.muted) unlockAudio().catch(() => undefined);
  };
  const createFreshRound = async (startingPlayer?: 'human' | 'computer') => {
    if (!profile) return;
    const currentBalance = moneyTransfer?.humanAfter ?? profile.virtualBalance;
    if (currentBalance <= 0) { navigate('/matgo'); return; }
    setBusy(true);
    if (declarationTimerRef.current !== null) window.clearTimeout(declarationTimerRef.current);
    setDeclaration(null);
    const state = createInitialGame(Date.now(), preferredDifficulty, preferredPointValue, startingPlayer, nextRoundMultiplier(game?.roundResult, game?.roundMultiplier));
    turnUndo.clear();
    setGame(state);
    setStarted(Boolean(startingPlayer) || state.phase === 'round-ended');
    setFloorCardChoice(null);
    setBombChoice(null);
    setShakeChoice(null);
    setGookjinChoiceOpen(false);
    setStakeSelectorOpen(false);
    setExitReserved(false);
    setAutoPlay(false);
    setMoneyTransfer(null);
    if (startingPlayer) {
      playStartSound();
      showDealAnimation();
    }
    try { await persist(state, profile, onlineSession); }
    finally { setBusy(false); }
  };
  const startFreshRound = () => createFreshRound(game?.startingPlayerConfirmed ? game.startingPlayer : undefined);
  const continueAfterRound = async () => {
    if (busy || exitReserved) return;
    const currentBalance = moneyTransfer?.humanAfter ?? profile?.virtualBalance ?? 0;
    if (currentBalance <= 0) { navigate('/matgo'); return; }
    await createFreshRound(game?.winner ?? game?.startingPlayer);
  };
  const selectDifficulty = async (difficulty: AiDifficulty) => {
    if (!game || !profile || busy) return;
    setPreferredDifficulty(difficulty);
    saveAiDifficulty(difficulty);
    const next = structuredClone(game);
    next.computerDifficulty = difficulty;
    setGame(next);
    await persist(next, profile, onlineSession);
  };
  const cycleDifficulty = () => {
    const current = game?.computerDifficulty ?? preferredDifficulty;
    const nextIndex = (AI_DIFFICULTY_ORDER.indexOf(current) + 1) % AI_DIFFICULTY_ORDER.length;
    void selectDifficulty(AI_DIFFICULTY_ORDER[nextIndex]);
  };
  const selectPointValue = async (pointValue: MatgoPointValue) => {
    if (!game || !profile || busy || game.phase === 'round-ended') return;
    setStakeSelectorOpen(false);
    setBusy(true);
    try {
      const next = setPointValue(game, pointValue);
      setPreferredPointValue(pointValue);
      savePointValue(pointValue);
      setGame(next);
      await persist(next, profile, onlineSession);
    }
    finally { setBusy(false); }
  };
  const newRound = async () => {
    if (!confirm('지금 판을 덮고 새 판을 시작할까요?')) return;
    await startFreshRound();
  };
  const reserveExit = () => {
    setExitDialogOpen(false);
    setExitReserved(true);
  };
  const leaveNow = () => {
    if (!game || !profile) return;
    setExitDialogOpen(false);
    void persist(game, profile, onlineSession);
    navigate('/matgo');
  };

  const toggleAutoPlay = () => {
    if (!started || !game || game.phase === 'round-ended') return;
    const next = !autoPlay;
    setAutoPlay(next);
    if (next) void unlockAudio();
  };

  useEffect(() => {
    if (!autoPlay || !started || !game || !profile || busy || dealing || declaration || exitDialogOpen || floorCardChoice || bombChoice || shakeChoice || game.phase === 'round-ended') return;
    autoPlayTimerRef.current = window.setTimeout(() => {
      if (gookjinChoiceOpen) {
        void decideGookjin(chooseAiGookjinAsDoubleJunk(game.humanCaptured));
        return;
      }
      if (game.phase === 'awaiting-go-stop' && game.pendingDecision === 'human') {
        void decideGoStop(chooseAiGoStop(structuredClone(game), 'human', 'hard'));
        return;
      }
      if (game.phase === 'awaiting-chongtong' && game.pendingDecision === 'human') {
        void decideChongtong(chooseAiChongtong(structuredClone(game), 'hard'));
        return;
      }
      if (game.phase !== 'playing' || game.currentPlayer !== 'human') return;
      const choice = chooseAiMove(structuredClone(game), 'human', 'hard');
      if (!choice.move) return;
      if (choice.move.kind === 'flip-only') {
        void playHumanBombSkip(true);
        return;
      }
      if (choice.move.kind === 'bomb') {
        void useBomb(choice.move.month, false);
        return;
      }
      if (choice.move.kind === 'shake') {
        void declareHumanShake(choice.move.month);
        return;
      }
      const source = humanHandRef.current?.querySelector<HTMLButtonElement>(`button[data-card-id="${choice.move.cardId}"]`);
      if (source) void playHumanCard(choice.move.cardId, source, choice.move.playedMatchId, true);
    }, 1200);
    return () => {
      if (autoPlayTimerRef.current !== null) window.clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    };
  }, [autoPlay, bombChoice, busy, dealing, declaration, exitDialogOpen, floorCardChoice, game, gookjinChoiceOpen, profile, shakeChoice, started]);

  useEffect(() => {
    if (game?.phase === 'round-ended') setAutoPlay(false);
  }, [game?.phase]);

  if (!game || !profile) return <Loading />;
  const humanScore = calculateCapturedScore(game.humanCaptured, { gookjinAsDoubleJunk: game.humanGookjinAsDoubleJunk }).total;
  const computerScore = calculateCapturedScore(game.computerCaptured, { gookjinAsDoubleJunk: game.computerGookjinAsDoubleJunk }).total;
  const computerDifficulty = game.computerDifficulty ?? preferredDifficulty;
  const opponentName = opponentNameForGame(game.gameUuid);
  const pointValue = normalizeMatgoPointValue(game.pointValue);
  const balanceEmpty = (moneyTransfer?.humanAfter ?? profile.virtualBalance) <= 0;
  const pendingStopSettlement = game.phase === 'awaiting-go-stop' && game.pendingDecision
    ? chooseStop(game, game.pendingDecision).settlement
    : null;
  const showPlayHints = started && !busy && !dealing && !floorCardChoice && !bombChoice && !shakeChoice && !gookjinChoiceOpen && game.phase === 'playing' && game.currentPlayer === 'human';
  return <div className={viewportFit.className} style={viewportFit.style}>
    <main className="game-table">
      <section className="game-field">
        {dealing && <DealAnimation />}
        <button
          type="button"
          className="game-stake"
          data-point-value={pointValue}
          aria-label={`점당 ${pointValue.toLocaleString('ko-KR')}냥${(game.roundMultiplier ?? 1) > 1 ? `, 나가리 이월 ${game.roundMultiplier}배` : ''}, 눌러서 변경`}
          aria-expanded={stakeSelectorOpen}
          disabled={busy || dealing || game.phase === 'round-ended'}
          onClick={() => setStakeSelectorOpen(open => !open)}
        ><b>점 {pointValue.toLocaleString('ko-KR')}냥{(game.roundMultiplier ?? 1) > 1 ? ` · 나가리 ×${game.roundMultiplier}` : ''}</b><span>변경 ▾</span></button>
        {stakeSelectorOpen && <StakeQuickSelector
          value={pointValue}
          disabled={busy || dealing}
          onChange={value => void selectPointValue(value)}
          onClose={() => setStakeSelectorOpen(false)}
        />}
        <UndoTurnButton
          remaining={remainingTurnUndos(game)}
          disabled={!turnUndo.canUndo(game) || busy || dealing || autoPlay || Boolean(floorCardChoice) || Boolean(bombChoice) || Boolean(shakeChoice)}
          onUndo={() => void undoLastTurn()}
        />
        <TableScoreBadge key={`computer-${computerScore}-${game.computerGoCount}-${game.computerShakeCount}`} owner="computer" score={computerScore} goCount={game.computerGoCount}
          shakeMultiplierCount={game.computerShakeCount ?? 0} bombCount={game.computerBombCount ?? 0} />
        <div className="computer-hand" ref={computerHandRef} aria-label={`컴퓨터 패 ${game.computerHand.length}장`}>
          {game.computerHand.map(card => <div className="card-back" key={card}><span>花</span></div>)}
          <b className="hand-count">{game.computerHand.length}</b>
        </div>
        <CapturedCardRack cardIds={game.computerCaptured} owner="opponent" gookjinAsDoubleJunk={game.computerGookjinAsDoubleJunk} />

        <section className={`floor-zone${floorCardChoice ? ' floor-choice-active' : ''}`}>
          <div className="draw-pile" ref={deckRef}><div className="card-back deck-back"><span>花</span></div><b>{game.drawPile.length}</b></div>
          <div ref={floorRef} className="floor-card-field"><FloorCardField
            cardIds={game.floorCards}
            choice={floorCardChoice}
            disabled={busy && floorCardChoice?.source !== 'draw'}
            onSelect={selectFloorCard}
            onCancel={() => setFloorCardChoice(null)}
          /></div>
        </section>
        {aiThinking && game.phase === 'playing' && <AiThinkingIndicator plan={aiThinking} placement="board" />}

        <TableScoreBadge key={`human-${humanScore}-${game.humanGoCount}-${game.humanShakeCount}`} owner="human" score={humanScore} goCount={game.humanGoCount}
          shakeMultiplierCount={game.humanShakeCount ?? 0} bombCount={game.humanBombCount ?? 0} />
        <CapturedCardRack
          cardIds={game.humanCaptured}
          owner="human"
          gookjinAsDoubleJunk={game.humanGookjinAsDoubleJunk}
          onToggleGookjin={() => setGookjinChoiceOpen(true)}
        />
        {bombChoice && <BombDecisionPanel
          month={bombChoice.month}
          kind={bombChoice.kind}
          handCardIds={bombChoice.handCardIds}
          floorCardIds={bombChoice.floorCardIds}
          selectedCardId={bombChoice.selectedCardId}
          disabled={busy || dealing}
          onDecision={decideHumanBomb}
        />}
        {shakeChoice && <ShakeDecisionPanel
          month={shakeChoice.month}
          cardIds={shakeChoice.cardIds}
          selectedCardId={shakeChoice.selectedCardId}
          disabled={busy || dealing}
          onDecision={decideHumanShake}
        />}
        {gookjinChoiceOpen && game.humanCaptured.includes('m09-01') && <GookjinDecisionPanel
          currentAsDoubleJunk={game.humanGookjinAsDoubleJunk}
          disabled={busy}
          onDecision={asDoubleJunk => void decideGookjin(asDoubleJunk)}
        />}
        {game.phase === 'awaiting-go-stop' && game.pendingDecision && <GoStopDecisionPanel
          owner={game.pendingDecision}
          score={game.pendingDecision === 'human' ? humanScore : computerScore}
          nextGoCount={(game.pendingDecision === 'human' ? game.humanGoCount : game.computerGoCount) + 1}
          stopScore={pendingStopSettlement?.finalScore ?? (game.pendingDecision === 'human' ? humanScore : computerScore)}
          stopAmount={pendingStopSettlement?.displayAmount ?? 0}
          opponentBalance={game.pendingDecision === 'human' ? computerBalance : undefined}
          disabled={busy}
          onDecision={game.pendingDecision === 'human' ? decision => void decideGoStop(decision) : undefined}
        />}
        {game.phase === 'awaiting-chongtong' && game.pendingDecision === 'human' && <ChongtongDecisionPanel
          cardIds={game.humanHand}
          month={game.chongtongMonth}
          disabled={busy}
          onDecision={decision => void decideChongtong(decision)}
        />}
      </section>

      <aside className="game-side-rail">
        <GamePlayerPanel name={opponentName} balance={computerBalance} active={game.currentPlayer === 'computer'} first={game.startingPlayerConfirmed !== false && game.startingPlayer === 'computer'} />
        {game.mission && <CardMissionPanel placement="side" mission={game.mission} humanCaptured={game.humanCaptured} computerCaptured={game.computerCaptured} />}
        <div className="rail-command-panel">
          <DifficultySelector compact value={computerDifficulty} disabled={busy || dealing} onChange={difficulty => void selectDifficulty(difficulty)} />
          <button type="button" className="mobile-difficulty-cycle" data-difficulty={computerDifficulty} aria-label={`컴퓨터 난이도 ${aiDifficultyLabel(computerDifficulty)}, 눌러서 바꾸기`} disabled={busy || dealing} onClick={cycleDifficulty}>
            <b>{aiDifficultyLabel(computerDifficulty)}</b><small>눌러서 바꾸기</small>
          </button>
          <div className="side-actions">
            <button type="button" disabled={busy || dealing} onClick={newRound}>새 판</button>
            <button type="button" className={exitReserved ? 'exit-reserved' : ''} disabled={busy || dealing || exitReserved} onClick={() => setExitDialogOpen(true)}>{exitReserved ? '나가기 예약됨' : '나가기'}</button>
          </div>
          <AudioControls compact settings={audioSettings} onChange={changeAudioSettings} />
        </div>
        <GamePlayerPanel name={profile.displayName} balance={profile.virtualBalance} human active={game.currentPlayer === 'human'} first={game.startingPlayerConfirmed !== false && game.startingPlayer !== 'computer'} profileImageUrl={profile.profileImageUrl} onProfileImageChange={profileImage.upload} profileImageUploading={profileImage.uploading} />
      </aside>

      <div className="human-play-dock">
        <HumanHandRow
          ref={humanHandRef}
          cardIds={game.humanHand}
          floorCardIds={game.floorCards}
          bombSkips={game.humanBombSkips ?? 0}
          shakenMonths={game.humanShakenMonths ?? []}
          requiredMonth={game.humanPendingShakeMonth ?? null}
          showHints={showPlayHints}
          disabled={!showPlayHints}
          flipOnlyDisabled={!showPlayHints || Boolean(game.humanPendingShakeMonth)}
          confirmTouchPlay={discardConfirmation}
          selectedCardId={bombChoice?.selectedCardId ?? shakeChoice?.selectedCardId ?? (floorCardChoice?.source === 'hand' ? floorCardChoice.playedCardId : null)}
          onPlay={requestHumanCard}
          onFlipOnly={() => void playHumanBombSkip()}
        />
        <div className="hand-auto-zone">
          <DiscardConfirmationToggle enabled={discardConfirmation} onChange={setDiscardConfirmation} />
          <AutoPlayButton
            active={autoPlay}
            disabled={!started || game.phase === 'round-ended' || (!autoPlay && (busy || dealing || Boolean(floorCardChoice)))}
            onToggle={toggleAutoPlay}
          />
        </div>
      </div>
    </main>
    {!started && game.startingPlayerConfirmed === false && game.phase !== 'round-ended' ? <div className="starting-player-overlay"><section>
      <p className="eyebrow">새 판 · 선 정하기</p>
      <h1>바닥의 패를 고르세요</h1>
      <p>한 장을 뒤집으면 선공과 후공이 정해집니다.</p>
      <div className="dealer-selection-layout">
        <div className="dealer-point-value"><PointValueSelector value={pointValue} disabled={busy} onChange={value => void selectPointValue(value)} /></div>
        <StartingPlayerChoice seed={game.randomSeed} disabled={busy} onSelect={player => void selectStartingPlayer(player)} onExit={() => navigate('/matgo')} />
        <div className="dealer-difficulty"><DifficultySelector value={computerDifficulty} onChange={difficulty => void selectDifficulty(difficulty)} /></div>
      </div>
    </section></div> : !started && <div className="start-overlay"><div><span className="start-logo">가족화투</span><>
      <p className="eyebrow">시원한 손맛 효과음 준비 완료</p>
      <h1>{game.turnNumber ? '이어서 칠까요?' : '패를 받고 시작하세요'}</h1>
      <p>게임 시작을 누르면 패 치는 소리와 미리 생성한 AI 선언 음성이 재생됩니다. 난이도는 이번 판에 저장됩니다.</p>
      <DifficultySelector value={computerDifficulty} onChange={difficulty => void selectDifficulty(difficulty)} />
      <button className="start-button" onClick={start}>게임 시작</button>
    </></div></div>}
    {started && game.phase === 'round-ended' && showRoundResult && <RoundResultOverlay game={game} opponentName={opponentName} exitReserved={exitReserved} moneyTransfer={moneyTransfer} balanceEmpty={balanceEmpty} disabled={busy} onContinue={() => void continueAfterRound()} onExit={leaveNow} onReturnHome={() => navigate('/matgo')} />}
    {exitDialogOpen && <ExitChoiceDialog onReserve={reserveExit} onImmediate={leaveNow} onCancel={() => setExitDialogOpen(false)} />}
    {declaration && <GameDeclarationOverlay key={declaration.id} effect={declaration} />}
  </div>;
}
