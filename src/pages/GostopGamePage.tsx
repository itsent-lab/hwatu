import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AiThinkingIndicator from '../components/AiThinkingIndicator';
import AudioControls from '../components/AudioControls';
import AutoPlayButton from '../components/AutoPlayButton';
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
import type { AiDifficulty } from '../engine/ai/types';
import { getCard } from '../engine/cards';
import { applyGostopAutomaticGookjinChoice, chooseGostopAiCard, chooseGostopAiDecision } from '../games/gostop/aiStrategy';
import { getGostopTransitionEffect } from '../games/gostop/effects';
import { DEFAULT_GOSTOP_COMPUTER_BALANCE, settleGostopBalances } from '../games/gostop/money';
import { nextRoundMultiplier } from '../engine/rules/nagari';
import {
  chooseGostopAutomaticCard, chooseGostopAutomaticDecision, chooseGostopDecision, createGostopRoom,
  getGostopDrawFloorChoice, getGostopFloorChoice, getGostopMatchingFloorCards, playGostopTurn, scoreGostopPlayer, setGostopGookjinChoice,
  type GostopPlayerId, type GostopRoomState
} from '../games/gostop/gameState';
import { dashboard, settleGostopRound } from '../lib/api';
import {
  applyAudioSettings, pauseGameAudio, playBonusPeeSound, playCaptureSound, playCardSound, playFlipSound,
  playGoSound, playLoseSound, playNagariSound, playPpeokSound, playScoreSound, playSpecialMoveSound, playStartSound,
  playStopSound, playWinSound, unlockAudio
} from '../lib/audio';
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from '../lib/audioSettings';
import { animateCardFlight } from '../lib/effects';
import { loadGostopAiDifficulty, loadGostopPointValue, saveGostopAiDifficulty } from '../lib/gamePreferences';
import { useGameViewportFit } from '../lib/gameViewport';
import { saveProfile } from '../lib/localStore';
import type { UserProfile } from '../lib/types';

const COMPUTER_PLAYERS = {
  computerA: { name: '정순이', icon: '🐶' },
  computerB: { name: '박영수', icon: '🐯' }
} as const;
const COMPUTER_TURN_DELAY_MS = 1_700;
const AUTO_HUMAN_TURN_DELAY_MS = 1_300;
const formatMoney = (value: number) => new Intl.NumberFormat('ko-KR').format(value);

interface FloorChoice {
  stage: 'played' | 'drawn';
  cardId: string;
  candidates: string[];
  playedMatchId?: string;
  drawnCardId?: string;
}

function playerName(player: GostopPlayerId, user: UserProfile) {
  return player === 'human' ? user.displayName : COMPUTER_PLAYERS[player].name;
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [room, setRoom] = useState<GostopRoomState | null>(null);
  const [floorChoice, setFloorChoice] = useState<FloorChoice | null>(null);
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
  const drawPileRef = useRef<HTMLDivElement | null>(null);
  const floorCardsRef = useRef<HTMLDivElement | null>(null);
  const humanHandRef = useRef<HTMLDivElement | null>(null);
  const turnAnimationRef = useRef(false);
  const roundGameUuidRef = useRef(crypto.randomUUID());
  const settledRoundRef = useRef<string | null>(null);

  useEffect(() => {
    const openRoom = (profile: UserProfile) => {
      setUser(profile);
      setComputerBalances({
        computerA: profile.gostopComputerABalance ?? DEFAULT_GOSTOP_COMPUTER_BALANCE,
        computerB: profile.gostopComputerBBalance ?? DEFAULT_GOSTOP_COMPUTER_BALANCE
      });
      roundGameUuidRef.current = crypto.randomUUID();
      settledRoundRef.current = null;
      setRoom(createGostopRoom(Date.now(), loadGostopPointValue()));
      setDealing(true);
    };
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1') {
      openRoom({ id: 0, username: 'preview', displayName: '어머니', role: 'member', virtualBalance: 136000 });
      return;
    }
    dashboard().then(async result => {
      await saveProfile(result.user);
      openRoom(result.user);
    }).catch(() => navigate('/login', { replace: true }));
  }, [navigate]);

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
    const timer = window.setTimeout(() => setDealing(false), 1550);
    return () => window.clearTimeout(timer);
  }, [dealing, room?.randomSeed]);

  useEffect(() => {
    if (!room) return;
    const previousRoom = previousRoomRef.current;
    const effect = getGostopTransitionEffect(previousRoom, room);
    previousRoomRef.current = room;
    if (!effect) return;
    const opponent = effect.player !== null && effect.player !== 'human';
    if (previousRoom?.phase !== 'round-ended' && room.phase === 'round-ended') {
      if (room.roundResult === 'nagari') playNagariSound();
      else if (room.winner === 'human') playWinSound(room.finalScore, room.players.human.goCount);
      else playLoseSound();
    } else if (effect.kind === 'go' && effect.player) {
      playGoSound(room.players[effect.player].goCount, opponent);
    } else if (effect.kind === 'double-pee' || effect.kind === 'triple-pee') {
      playBonusPeeSound(effect.kind === 'triple-pee' ? 3 : 2, opponent);
    } else if (effect.kind === 'ppeok') {
      playPpeokSound(opponent);
    } else if (effect.kind === 'sweep' || effect.kind === 'ppeok-capture' || effect.kind === 'self-ppeok') {
      playSpecialMoveSound(effect.kind, opponent);
    } else if (effect.kind === 'score' && effect.player) {
      playScoreSound(effect.text.replace('!', ''), scoreGostopPlayer(room, effect.player).total, opponent);
    } else if (effect.kind === 'capture') {
      playCaptureSound(opponent);
    } else if (effect.kind === 'stop') {
      playStopSound(opponent);
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
    if (!user || !room || room.phase !== 'round-ended' || room.roundResult !== 'win' || !room.winner) return;
    const gameUuid = roundGameUuidRef.current;
    if (settledRoundRef.current === gameUuid) return;
    settledRoundRef.current = gameUuid;
    const optimistic = settleGostopBalances({
      human: user.virtualBalance,
      computerA: computerBalances.computerA,
      computerB: computerBalances.computerB
    }, room.winner, room.finalScore * room.pointValue);
    setUser(current => current ? { ...current, virtualBalance: optimistic.human } : current);
    setComputerBalances({ computerA: optimistic.computerA, computerB: optimistic.computerB });
    if (import.meta.env.DEV && user.id === 0) return;
    void settleGostopRound({
      gameUuid,
      winner: room.winner,
      finalScore: room.finalScore,
      pointValue: room.pointValue
    }).then(result => {
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
    }).catch(() => { /* 현재 판의 로컬 정산 금액은 유지합니다. */ });
  }, [computerBalances.computerA, computerBalances.computerB, room, user]);

  useEffect(() => {
    if (dealing || gookjinChoiceOpen || !room || room.phase === 'round-ended' || room.pendingDecision === 'human' || room.currentPlayer === 'human') return;
    const timer = window.setTimeout(async () => {
      if (room.phase === 'playing' && !turnAnimationRef.current) {
        turnAnimationRef.current = true;
        try {
          const computerPlayer = room.currentPlayer === 'computerA' ? 'computerA' : 'computerB';
          const seat = computerPlayer === 'computerA' ? computerAHandRef.current : computerBHandRef.current;
          const cardId = chooseGostopAiCard(room, computerPlayer, difficulty);
          const bonusMove = Boolean(cardId && getCard(cardId)?.tags.includes('bonus-pee'));
          const source = cardId ? seat?.querySelector(`.gostop-card-back[data-card-id="${cardId}"]`) ?? null : null;
          const playedTarget = cardId ? findPlayedCardTarget(floorCardsRef.current, room.floorCards, cardId) : null;
          playCardSound();
          await animateCardFlight(source, bonusMove ? seat?.querySelector('.gostop-score-summary') ?? null : playedTarget, -7, 280);
          await animateCardFlight(drawPileRef.current, bonusMove ? seat : floorCardsRef.current, 7, 230);
          playFlipSound();
        } finally { turnAnimationRef.current = false; }
      }
      setRoom(current => {
        if (!current || current.phase === 'round-ended' || current.pendingDecision === 'human' || current.currentPlayer === 'human') return current;
        const player = current.currentPlayer;
        if (current.phase === 'awaiting-go-stop') return chooseGostopDecision(current, player, chooseGostopAiDecision(current, player, difficulty));
        const cardId = chooseGostopAiCard(current, player, difficulty);
        if (!cardId) return current;
        const hadGookjin = current.players[player].captured.includes('m09-01');
        const next = playGostopTurn(current, player, cardId).state;
        return !hadGookjin && next.players[player].captured.includes('m09-01')
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
        const cardId = chooseGostopAutomaticCard(room, 'human');
        const bonusMove = Boolean(cardId && getCard(cardId)?.tags.includes('bonus-pee'));
        const source = cardId ? humanHandRef.current?.querySelector(`[data-card-id="${cardId}"]`) ?? null : null;
        const playedTarget = cardId ? findPlayedCardTarget(floorCardsRef.current, room.floorCards, cardId, getGostopFloorChoice(room, 'human', cardId)[0]) : null;
        turnAnimationRef.current = true;
        try {
          playCardSound();
          await animateCardFlight(source, bonusMove ? document.querySelector('.gostop-human-captured') : playedTarget, -7, 280);
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
        const cardId = chooseGostopAutomaticCard(current, 'human');
        if (!cardId) return current;
        const playedMatchId = getGostopFloorChoice(current, 'human', cardId)[0];
        const drawnMatchId = getGostopDrawFloorChoice(current, 'human', cardId, playedMatchId)?.candidates[0];
        const hadGookjin = current.players.human.captured.includes('m09-01');
        const next = playGostopTurn(current, 'human', cardId, playedMatchId, drawnMatchId).state;
        return !hadGookjin && next.players.human.captured.includes('m09-01')
          ? applyGostopAutomaticGookjinChoice(next, 'human')
          : next;
      });
    }, AUTO_HUMAN_TURN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoPlay, dealing, room]);

  if (!user || !room) return <Loading message="고스톱 게임방을 열고 있습니다" />;
  const money = formatMoney(user.virtualBalance);
  const humanTurn = !dealing && room.phase === 'playing' && room.currentPlayer === 'human';
  const computerThinking = room.phase === 'playing' && room.currentPlayer !== 'human';
  const humanScore = scoreGostopPlayer(room, 'human');
  const computerAScore = scoreGostopPlayer(room, 'computerA');
  const computerBScore = scoreGostopPlayer(room, 'computerB');
  const floorCardSplit = Math.ceil(room.floorCards.length / 2);
  const decidingPlayer = room.pendingDecision;
  const decidingScore = decidingPlayer ? scoreGostopPlayer(room, decidingPlayer) : null;

  const playHumanCard = async (cardId: string, preferredPlayedMatchId?: string, preferredDrawnMatchId?: string, sourceElement?: HTMLButtonElement) => {
    if (!humanTurn || gookjinChoiceOpen || turnAnimationRef.current) return;
    const candidates = getGostopFloorChoice(room, 'human', cardId);
    if (!preferredPlayedMatchId && candidates.length === 2) {
      setFloorChoice({ stage: 'played', cardId, candidates });
      return;
    }
    const drawChoice = getGostopDrawFloorChoice(room, 'human', cardId, preferredPlayedMatchId);
    if (!preferredDrawnMatchId && drawChoice) {
      setFloorChoice({ stage: 'drawn', cardId, candidates: drawChoice.candidates, playedMatchId: preferredPlayedMatchId, drawnCardId: drawChoice.drawnCardId });
      return;
    }
    setFloorChoice(null);
    turnAnimationRef.current = true;
    try {
      await unlockAudio();
      const bonusMove = Boolean(getCard(cardId)?.tags.includes('bonus-pee'));
      const source = sourceElement ?? humanHandRef.current?.querySelector(`[data-card-id="${cardId}"]`) ?? null;
      const playedTarget = findPlayedCardTarget(floorCardsRef.current, room.floorCards, cardId, preferredPlayedMatchId);
      playCardSound();
      await animateCardFlight(source, bonusMove ? document.querySelector('.gostop-human-captured') : playedTarget, -7, 280);
      await animateCardFlight(drawPileRef.current, bonusMove ? humanHandRef.current : floorCardsRef.current, 7, 230);
      playFlipSound();
    } finally { turnAnimationRef.current = false; }
    const result = playGostopTurn(room, 'human', cardId, preferredPlayedMatchId, preferredDrawnMatchId);
    setRoom(result.state);
    if (!room.players.human.captured.includes('m09-01') && result.state.players.human.captured.includes('m09-01')) setGookjinChoiceOpen(true);
  };
  const decide = (decision: 'go' | 'stop') => setRoom(chooseGostopDecision(room, 'human', decision));
  const newRound = () => {
    setFloorChoice(null);
    setAutoPlay(false);
    setGookjinChoiceOpen(false);
    setExitDialogOpen(false);
    setExitReserved(false);
    setDealing(true);
    roundGameUuidRef.current = crypto.randomUUID();
    settledRoundRef.current = null;
    setRoom(createGostopRoom(Date.now(), room.pointValue, nextRoundMultiplier(room.roundResult, room.roundMultiplier)));
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
    setAutoPlay(current => !current);
    void unlockAudio();
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
        <button type="button" onClick={newRound}>새 판</button>
      </nav>
      {dealing && <GostopDealAnimation />}
      <section ref={computerAHandRef} className={`gostop-seat opponent-a${room.currentPlayer === 'computerA' ? ' active' : ''}`}>
        <div className="gostop-player-summary"><span>{COMPUTER_PLAYERS.computerA.icon}</span><b>{COMPUTER_PLAYERS.computerA.name}</b><small>{formatMoney(computerBalances.computerA)}냥</small></div>
        <GostopHiddenHand cardIds={room.players.computerA.hand} />
        <GostopScoreSummary key={`${computerAScore.total}-${room.players.computerA.goCount}`} score={computerAScore} capturedCount={room.players.computerA.captured.length} goCount={room.players.computerA.goCount} />
        <GostopOpponentCaptured cardIds={room.players.computerA.captured} name={COMPUTER_PLAYERS.computerA.name} gookjinAsDoubleJunk={room.players.computerA.gookjinAsDoubleJunk} />
      </section>
      <section ref={computerBHandRef} className={`gostop-seat opponent-b${room.currentPlayer === 'computerB' ? ' active' : ''}`}>
        <div className="gostop-player-summary"><span>{COMPUTER_PLAYERS.computerB.icon}</span><b>{COMPUTER_PLAYERS.computerB.name}</b><small>{formatMoney(computerBalances.computerB)}냥</small></div>
        <GostopHiddenHand cardIds={room.players.computerB.hand} />
        <GostopScoreSummary key={`${computerBScore.total}-${room.players.computerB.goCount}`} score={computerBScore} capturedCount={room.players.computerB.captured.length} goCount={room.players.computerB.goCount} />
        <GostopOpponentCaptured cardIds={room.players.computerB.captured} name={COMPUTER_PLAYERS.computerB.name} gookjinAsDoubleJunk={room.players.computerB.gookjinAsDoubleJunk} />
      </section>
      <section className="gostop-floor" aria-label={`바닥패 ${room.floorCards.length}장`}>
        <div ref={floorCardsRef} className="gostop-floor-cards">
          <div className="gostop-floor-card-group left">{room.floorCards.slice(0, floorCardSplit).map(cardId => <HwatuCard key={cardId} cardId={cardId} />)}</div>
          <div ref={drawPileRef} className="gostop-draw-pile" aria-label={`더미 ${room.drawPile.length}장`}><span>花</span><b>{room.drawPile.length}</b></div>
          <div className="gostop-floor-card-group right">{room.floorCards.slice(floorCardSplit).map(cardId => <HwatuCard key={cardId} cardId={cardId} />)}</div>
        </div>
      </section>
      <div className="gostop-room-status" aria-live="polite"><strong>{room.phase === 'round-ended' ? '판 종료' : humanTurn ? '내 차례' : `${playerName(room.currentPlayer, user)} 차례`}</strong><span>{room.lastAction}</span></div>
      {computerThinking && <AiThinkingIndicator plan={{ durationMs: COMPUTER_TURN_DELAY_MS, endsAt: Date.now() + COMPUTER_TURN_DELAY_MS, label: `${playerName(room.currentPlayer, user)} 님이 낼 패를 고르는 중…` }} placement="board" />}
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
                onToggleGookjin={room.phase !== 'round-ended' ? () => setGookjinChoiceOpen(true) : undefined}
              />
            : <span>아직 획득한 패가 없습니다</span>}
        </div>
        <GostopHumanHand
          ref={humanHandRef}
          cardIds={room.players.human.hand}
          floorCardIds={room.floorCards}
          disabled={!humanTurn || gookjinChoiceOpen}
          showHints={humanTurn && !floorChoice && !gookjinChoiceOpen}
          selectedCardId={floorChoice?.stage === 'played' ? floorChoice.cardId : null}
          onPlay={(cardId, source) => void playHumanCard(cardId, undefined, undefined, source)}
        />
        <div className="gostop-auto-zone"><AutoPlayButton active={autoPlay} disabled={room.phase === 'round-ended'} onToggle={toggleAutoPlay} /></div>
      </section>
      {floorChoice && <div className="gostop-floor-choice" role="dialog" aria-label="먹을 바닥패 선택">
        <strong>{floorChoice.stage === 'drawn' ? `뒤집은 패로 어느 패를 먹을까요?` : '어느 패를 먹을까요?'}</strong>
        {floorChoice.drawnCardId && <span className="gostop-drawn-card"><HwatuCard cardId={floorChoice.drawnCardId} />뒤집은 패</span>}
        <div>{floorChoice.candidates.map(cardId => <HwatuCard key={cardId} cardId={cardId} onClick={() => floorChoice.stage === 'played'
          ? playHumanCard(floorChoice.cardId, cardId)
          : playHumanCard(floorChoice.cardId, floorChoice.playedMatchId, cardId)} />)}</div>
        <button type="button" onClick={() => setFloorChoice(null)}>다른 손패 고르기</button>
      </div>}
      {gookjinChoiceOpen && room.players.human.captured.includes('m09-01') && <GookjinDecisionPanel
        currentAsDoubleJunk={room.players.human.gookjinAsDoubleJunk}
        onDecision={decideGookjin}
      />}
      {!gookjinChoiceOpen && room.phase === 'awaiting-go-stop' && decidingPlayer && decidingScore && <GoStopDecisionPanel
        owner={decidingPlayer === 'human' ? 'human' : 'computer'}
        score={decidingScore.total}
        nextGoCount={room.players[decidingPlayer].goCount + 1}
        stopScore={(decidingScore.total + room.players[decidingPlayer].goCount) * room.roundMultiplier}
        stopAmount={(decidingScore.total + room.players[decidingPlayer].goCount) * room.roundMultiplier * room.pointValue}
        onDecision={decidingPlayer === 'human' ? decide : undefined}
      />}
    </main>
    {room.phase === 'round-ended' && <GostopRoundResult room={room} winnerName={room.winner ? playerName(room.winner, user) : ''} exitReserved={exitReserved} onContinue={newRound} onExit={leaveNow} />}
    {exitDialogOpen && <ExitChoiceDialog onReserve={reserveExit} onImmediate={leaveNow} onCancel={() => setExitDialogOpen(false)} guide="현재 판을 마친 뒤 나가거나, 지금 바로 나갈 수 있습니다." immediateDescription="현재 판을 중단하고 바로 나갑니다" />}
    {declaration && <GameDeclarationOverlay key={declaration.id} effect={declaration} />}
  </div>;
}
