import { DEFAULT_AUDIO_SETTINGS, type AudioSettings, normalizeAudioSettings } from './audioSettings';
import {
  loadGameAudioAsset,
  playGameAudioAsset,
  warmGameAudioEffects,
  type EffectAudioAssetKey,
  type VoiceAudioAssetKey
} from './audioAssets';
import {
  escalateGameMusicMood,
  gameMusicMoodForGoCount,
  gameMusicMoodForScore,
  getGameMusicProfile,
  type GameMusicMood
} from './gameMusic';

type SpecialVoiceKind = 'jjok' | 'ttadak' | 'sweep' | 'ppeok-capture' | 'self-ppeok';
export type VoiceActor = 'player' | 'opponent' | 'matgoFemale' | 'gostopComputerA' | 'gostopComputerB' | 'gostopComputerC' | 'gostopComputerD';
type VoiceActorInput = VoiceActor | boolean;

interface AudioGraph {
  context: AudioContext;
  master: GainNode;
  effects: GainNode;
  music: GainNode;
  compressor: DynamicsCompressorNode;
}

let graph: AudioGraph | null = null;
let settings: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS };
let musicSource: AudioBufferSourceNode | null = null;
let musicMood: GameMusicMood = 'calm';
let voiceSource: AudioBufferSourceNode | null = null;
let musicLoadPending = false;
let musicLoadVersion = 0;
const voiceTimers = new Set<number>();

const specialVoiceAssets: Record<SpecialVoiceKind, readonly [VoiceAudioAssetKey, VoiceAudioAssetKey]> = {
  jjok: ['voicePlayerJjok', 'voiceOpponentJjok'],
  ttadak: ['voicePlayerTtadak', 'voiceOpponentTtadak'],
  sweep: ['voicePlayerSweep', 'voiceOpponentSweep'],
  'ppeok-capture': ['voicePlayerPpeokCapture', 'voiceOpponentPpeokCapture'],
  'self-ppeok': ['voicePlayerSelfPpeok', 'voiceOpponentSelfPpeok']
};

const gostopComputerASpecialVoiceAssets: Partial<Record<SpecialVoiceKind, VoiceAudioAssetKey>> = {
  sweep: 'voiceGostopComputerASweep',
  'ppeok-capture': 'voiceGostopComputerAPpeokCapture',
  'self-ppeok': 'voiceGostopComputerASelfPpeok'
};

const matgoFemaleSpecialVoiceAssets: Partial<Record<SpecialVoiceKind, VoiceAudioAssetKey>> = {
  sweep: 'voiceMatgoFemaleSweep',
  'ppeok-capture': 'voiceMatgoFemalePpeokCapture',
  'self-ppeok': 'voiceMatgoFemaleSelfPpeok'
};

const gostopComputerBSpecialVoiceAssets: Partial<Record<SpecialVoiceKind, VoiceAudioAssetKey>> = {
  sweep: 'voiceGostopComputerBSweep',
  'ppeok-capture': 'voiceGostopComputerBPpeokCapture',
  'self-ppeok': 'voiceGostopComputerBSelfPpeok'
};

const gostopComputerCSpecialVoiceAssets: Partial<Record<SpecialVoiceKind, VoiceAudioAssetKey>> = {
  sweep: 'voiceGostopComputerCSweep',
  'ppeok-capture': 'voiceGostopComputerCPpeokCapture',
  'self-ppeok': 'voiceGostopComputerCSelfPpeok'
};

const gostopComputerDSpecialVoiceAssets: Partial<Record<SpecialVoiceKind, VoiceAudioAssetKey>> = {
  sweep: 'voiceGostopComputerDSweep',
  'ppeok-capture': 'voiceGostopComputerDPpeokCapture',
  'self-ppeok': 'voiceGostopComputerDSelfPpeok'
};

const specialEffectAssets: Record<SpecialVoiceKind, EffectAudioAssetKey> = {
  jjok: 'effectJjok',
  ttadak: 'effectTtadak',
  sweep: 'effectSweep',
  'ppeok-capture': 'effectPpeokCapture',
  'self-ppeok': 'effectSelfPpeok'
};

function resolveVoiceActor(actor: VoiceActorInput): VoiceActor {
  if (typeof actor === 'boolean') return actor ? 'opponent' : 'player';
  return actor;
}

function selectVoiceAsset(
  actor: VoiceActorInput,
  player: VoiceAudioAssetKey,
  opponent: VoiceAudioAssetKey,
  matgoFemale: VoiceAudioAssetKey,
  gostopComputerA: VoiceAudioAssetKey,
  gostopComputerB: VoiceAudioAssetKey,
  gostopComputerC: VoiceAudioAssetKey = opponent,
  gostopComputerD: VoiceAudioAssetKey = opponent
): VoiceAudioAssetKey {
  const resolved = resolveVoiceActor(actor);
  if (resolved === 'matgoFemale') return matgoFemale;
  if (resolved === 'gostopComputerA') return gostopComputerA;
  if (resolved === 'gostopComputerB') return gostopComputerB;
  if (resolved === 'gostopComputerC') return gostopComputerC;
  if (resolved === 'gostopComputerD') return gostopComputerD;
  return resolved === 'opponent' ? opponent : player;
}

function getGraph(): AudioGraph | null {
  if (graph) return graph;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return null;
  const context = new AudioContextClass();
  const master = context.createGain();
  const effects = context.createGain();
  const music = context.createGain();
  const compressor = context.createDynamicsCompressor();
  effects.gain.value = 1;
  music.gain.value = 0.18;
  master.gain.value = settings.muted ? 0 : settings.volume;
  compressor.threshold.value = -18;
  compressor.knee.value = 14;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.14;
  effects.connect(compressor);
  music.connect(compressor);
  compressor.connect(master);
  master.connect(context.destination);
  graph = { context, master, effects, music, compressor };
  return graph;
}

function setMasterVolume() {
  if (!graph) return;
  const now = graph.context.currentTime;
  graph.master.gain.cancelScheduledValues(now);
  graph.master.gain.setTargetAtTime(settings.muted ? 0 : settings.volume, now, 0.025);
}

function applyGameMusicMood() {
  if (!graph) return;
  const profile = getGameMusicProfile(musicMood);
  const now = graph.context.currentTime;
  graph.music.gain.cancelScheduledValues(now);
  graph.music.gain.setTargetAtTime(profile.gain, now, Math.max(0.05, profile.transitionSeconds / 3));
  if (!musicSource) return;
  musicSource.playbackRate.cancelScheduledValues(now);
  musicSource.playbackRate.setTargetAtTime(profile.playbackRate, now, Math.max(0.05, profile.transitionSeconds / 3));
}

function setGameMusicMood(mood: GameMusicMood) {
  musicMood = mood;
  applyGameMusicMood();
}

function raiseGameMusicMood(mood: GameMusicMood) {
  setGameMusicMood(escalateGameMusicMood(musicMood, mood));
}

function playRecordedEffect(key: EffectAudioAssetKey, gainValue: number) {
  const current = getGraph();
  if (!current || current.context.state !== 'running' || settings.muted) return;
  if (playGameAudioAsset(current.context, current.effects, key, gainValue)) return;
  void loadGameAudioAsset(current.context, key).then(buffer => {
    if (!buffer || settings.muted || current.context.state !== 'running') return;
    playGameAudioAsset(current.context, current.effects, key, gainValue);
  });
}

function playRecordedVoice(key: VoiceAudioAssetKey, delay = 0) {
  if (settings.muted || settings.volume <= 0) return;
  const timer = window.setTimeout(() => {
    voiceTimers.delete(timer);
    if (settings.muted || settings.volume <= 0) return;
    const current = getGraph();
    if (!current || current.context.state !== 'running') return;
    void loadGameAudioAsset(current.context, key).then(buffer => {
      if (!buffer || settings.muted || settings.volume <= 0 || current.context.state !== 'running') return;
      if (voiceSource) {
        try { voiceSource.stop(); }
        catch { /* 이미 종료된 음성은 무시 */ }
      }
      const source = playGameAudioAsset(current.context, current.effects, key, 0.92);
      voiceSource = source;
      if (source) source.onended = () => { if (voiceSource === source) voiceSource = null; };
    });
  }, delay);
  voiceTimers.add(timer);
}

function stopBackgroundMusic() {
  musicLoadVersion += 1;
  musicLoadPending = false;
  if (musicSource) {
    try { musicSource.stop(); }
    catch { /* 이미 종료된 소스는 무시 */ }
    musicSource = null;
  }
  if (!graph) return;
  const now = graph.context.currentTime;
  graph.music.gain.cancelScheduledValues(now);
  graph.music.gain.setTargetAtTime(0.0001, now, 0.08);
}

function startBackgroundMusic() {
  if (musicSource || musicLoadPending || settings.muted || !settings.backgroundMusic) return;
  const current = getGraph();
  if (!current || current.context.state !== 'running') return;
  const version = ++musicLoadVersion;
  musicLoadPending = true;
  void loadGameAudioAsset(current.context, 'background').then(buffer => {
    if (!buffer || version !== musicLoadVersion || settings.muted || !settings.backgroundMusic) return;
    const source = current.context.createBufferSource();
    const profile = getGameMusicProfile(musicMood);
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = profile.playbackRate;
    source.connect(current.music);
    current.music.gain.cancelScheduledValues(current.context.currentTime);
    current.music.gain.setTargetAtTime(profile.gain, current.context.currentTime, 0.08);
    source.onended = () => { if (musicSource === source) musicSource = null; };
    source.start();
    musicSource = source;
  }).finally(() => {
    if (version === musicLoadVersion) musicLoadPending = false;
  });
}

export function applyAudioSettings(next: AudioSettings) {
  settings = normalizeAudioSettings(next);
  setMasterVolume();
  if (settings.muted || !settings.backgroundMusic) stopBackgroundMusic();
  else if (graph?.context.state === 'running') startBackgroundMusic();
}

export async function unlockAudio() {
  const current = getGraph();
  if (current?.context.state === 'suspended') await current.context.resume();
  if (current) warmGameAudioEffects(current.context);
  setMasterVolume();
  startBackgroundMusic();
}

export function pauseGameAudio() {
  stopBackgroundMusic();
  voiceTimers.forEach(timer => window.clearTimeout(timer));
  voiceTimers.clear();
  if (voiceSource) {
    try { voiceSource.stop(); }
    catch { /* 이미 종료된 음성은 무시 */ }
    voiceSource = null;
  }
  if (graph?.context.state === 'running') graph.context.suspend().catch(() => undefined);
}

export function playCardSound() {
  playRecordedEffect('cardDeal', 0.78);
}

export function playDealSound() {
  setGameMusicMood('calm');
  playRecordedEffect('effectDeal', 0.88);
}

export function playDecisionSound() {
  raiseGameMusicMood('tense');
  playRecordedEffect('effectDecision', 0.72);
}

export function playSelectSound() {
  playRecordedEffect('effectSelect', 0.52);
}

export function playCancelSound() {
  playRecordedEffect('effectCancel', 0.58);
}

export function playFlipSound() {
  playRecordedEffect('cardSlide', 0.72);
}

export function playCaptureSound(actor: VoiceActorInput = false) {
  raiseGameMusicMood('active');
  playRecordedEffect('cardContact', 0.86);
  playRecordedVoice(selectVoiceAsset(actor, 'voicePlayerCapture', 'voiceOpponentCapture', 'voiceMatgoFemaleCapture', 'voiceGostopComputerACapture', 'voiceGostopComputerBCapture', 'voiceGostopComputerCCapture', 'voiceGostopComputerDCapture'), 80);
}

export function playBonusPeeSound(value: 2 | 3, actor: VoiceActorInput = false, chainCount = 1) {
  raiseGameMusicMood(value === 3 ? 'tense' : 'active');
  playRecordedEffect(value === 3 ? 'effectBonusThree' : 'effectBonusTwo', Math.min(1, 0.8 + chainCount * 0.04));
  const key = value === 3
    ? selectVoiceAsset(actor, 'voicePlayerBonusThree', 'voiceOpponentBonusThree', 'voiceMatgoFemaleBonusThree', 'voiceGostopComputerABonusThree', 'voiceGostopComputerBBonusThree', 'voiceGostopComputerCBonusThree', 'voiceGostopComputerDBonusThree')
    : selectVoiceAsset(actor, 'voicePlayerBonusTwo', 'voiceOpponentBonusTwo', 'voiceMatgoFemaleBonusTwo', 'voiceGostopComputerABonusTwo', 'voiceGostopComputerBBonusTwo', 'voiceGostopComputerCBonusTwo', 'voiceGostopComputerDBonusTwo');
  playRecordedVoice(key, 150);
}

export function playPeeTransferSound(value: 2 | 3, actor: VoiceActorInput = false) {
  raiseGameMusicMood(value === 3 ? 'climax' : 'tense');
  playRecordedEffect(value === 3 ? 'effectPeeTransferThree' : 'effectPeeTransferTwo', 0.92);
  playRecordedVoice(selectVoiceAsset(actor, 'voicePlayerPeeTransfer', 'voiceOpponentPeeTransfer', 'voicePlayerPeeTransfer', 'voicePlayerPeeTransfer', 'voiceOpponentPeeTransfer'), 140);
}

export function playPpeokSound(actor: VoiceActorInput = false, count = 1) {
  const chain = Math.max(1, Math.min(3, count));
  const effectKey: EffectAudioAssetKey = chain >= 3
    ? 'effectTriplePpeok'
    : chain === 2 ? 'effectDoublePpeok' : 'effectPpeok';
  const voiceKey: VoiceAudioAssetKey = chain >= 3
    ? 'voiceTriplePpeok'
    : chain === 2 ? 'voiceDoublePpeok' : selectVoiceAsset(actor, 'voicePlayerPpeok', 'voiceOpponentPpeok', 'voiceMatgoFemalePpeok', 'voiceGostopComputerAPpeok', 'voiceGostopComputerBPpeok', 'voiceGostopComputerCPpeok', 'voiceGostopComputerDPpeok');
  raiseGameMusicMood(chain >= 2 ? 'climax' : 'tense');
  playRecordedEffect(effectKey, 0.96);
  playRecordedVoice(voiceKey, 120);
}

export function playBombSound(actor: VoiceActorInput = false) {
  raiseGameMusicMood('climax');
  playRecordedEffect('effectBomb', 1);
  playRecordedVoice(selectVoiceAsset(actor, 'voicePlayerBomb', 'voiceOpponentBomb', 'voicePlayerBomb', 'voicePlayerBomb', 'voiceOpponentBomb'), 120);
}

export function playShakeSound(actor: VoiceActorInput = false) {
  const opponent = resolveVoiceActor(actor) !== 'player';
  raiseGameMusicMood('tense');
  playRecordedEffect('effectShake', 0.9);
  playRecordedVoice('voiceShake', opponent ? 170 : 140);
}

export function playChongtongSound(actor: VoiceActorInput = false) {
  raiseGameMusicMood('climax');
  playRecordedEffect('effectChongtong', 0.96);
  playRecordedVoice(selectVoiceAsset(actor, 'voicePlayerChongtong', 'voiceOpponentChongtong', 'voicePlayerChongtong', 'voicePlayerChongtong', 'voiceOpponentChongtong'), 130);
}

export function playDealerResultSound(actor: VoiceActorInput) {
  const resolved = resolveVoiceActor(actor);
  const player = resolved === 'player' || resolved === 'matgoFemale' || resolved === 'gostopComputerA' || resolved === 'gostopComputerD';
  raiseGameMusicMood('active');
  playRecordedEffect(player ? 'effectDealerHuman' : 'effectDealerOpponent', 0.78);
  playRecordedVoice(player ? 'voiceDealerHuman' : 'voiceDealerOpponent', 90);
}

export function playGookjinSound(asDoubleJunk: boolean) {
  raiseGameMusicMood('tense');
  playRecordedEffect(asDoubleJunk ? 'effectGookjinDouble' : 'effectGookjinAnimal', 0.72);
  playRecordedVoice(asDoubleJunk ? 'voiceGookjinDouble' : 'voiceGookjinAnimal', 100);
}

export function playUndoSound() {
  playRecordedEffect('effectUndo', 0.68);
  playRecordedVoice('voiceUndo', 70);
}

export function playAutoPlaySound(enabled: boolean) {
  playRecordedEffect(enabled ? 'effectAutoPlayOn' : 'effectAutoPlayOff', 0.62);
}

export function playSpecialMoveSound(kind: SpecialVoiceKind, actor: VoiceActorInput = false) {
  raiseGameMusicMood('tense');
  playRecordedEffect(specialEffectAssets[kind], 0.92);
  const resolved = resolveVoiceActor(actor);
  const voice = resolved === 'gostopComputerA'
    ? gostopComputerASpecialVoiceAssets[kind] ?? specialVoiceAssets[kind][0]
    : resolved === 'matgoFemale'
      ? matgoFemaleSpecialVoiceAssets[kind] ?? specialVoiceAssets[kind][0]
    : resolved === 'gostopComputerB'
      ? gostopComputerBSpecialVoiceAssets[kind] ?? specialVoiceAssets[kind][1]
    : resolved === 'gostopComputerC'
      ? gostopComputerCSpecialVoiceAssets[kind] ?? specialVoiceAssets[kind][1]
    : resolved === 'gostopComputerD'
      ? gostopComputerDSpecialVoiceAssets[kind] ?? specialVoiceAssets[kind][0]
    : specialVoiceAssets[kind][resolved === 'opponent' ? 1 : 0];
  playRecordedVoice(voice, 110);
}

export function playMissionSound(multiplier: number, actor: VoiceActorInput = false) {
  raiseGameMusicMood(multiplier >= 4 ? 'climax' : 'tense');
  playRecordedEffect('effectMission', multiplier >= 4 ? 1 : 0.9);
  playRecordedVoice(selectVoiceAsset(actor, 'voicePlayerMission', 'voiceOpponentMission', 'voicePlayerMission', 'voicePlayerMission', 'voiceOpponentMission'), 170);
}

export function playScoreSound(label: string, score: number, actor: VoiceActorInput = false) {
  raiseGameMusicMood(gameMusicMoodForScore(score));
  playRecordedEffect('effectScore', label.length > 0 || score >= 10 ? 0.94 : 0.86);
  playRecordedVoice(selectVoiceAsset(actor, 'voicePlayerScore', 'voiceOpponentScore', 'voiceMatgoFemaleScore', 'voiceGostopComputerAScore', 'voiceGostopComputerBScore', 'voiceGostopComputerCScore', 'voiceGostopComputerDScore'), 140);
}

export function playGoSound(goCount: number, actor: VoiceActorInput = false) {
  raiseGameMusicMood(gameMusicMoodForGoCount(goCount));
  playRecordedEffect(goCount >= 5 ? 'effectGoHigh' : 'effectGo', goCount >= 3 ? 1 : 0.9);
  playRecordedVoice(selectVoiceAsset(actor, 'voicePlayerGo', 'voiceOpponentGo', 'voiceMatgoFemaleGo', 'voiceGostopComputerAGo', 'voiceGostopComputerBGo', 'voiceGostopComputerCGo', 'voiceGostopComputerDGo'), goCount >= 5 ? 220 : 90);
}

export function playStopSound(actor: VoiceActorInput = false) {
  setGameMusicMood('result');
  playRecordedEffect('effectStop', 0.96);
  playRecordedVoice(selectVoiceAsset(actor, 'voicePlayerStop', 'voiceOpponentStop', 'voiceMatgoFemaleStop', 'voiceGostopComputerAStop', 'voiceGostopComputerBStop', 'voiceGostopComputerCStop', 'voiceGostopComputerDStop'), 70);
}

export function playWinSound(finalScore: number, goCount: number) {
  setGameMusicMood('result');
  playRecordedEffect('effectWin', finalScore >= 20 || goCount >= 3 ? 1 : 0.92);
  playRecordedVoice('voiceWin', 320);
}

export function playLoseSound(bakLabels: string[] = [], actor: VoiceActorInput = true) {
  setGameMusicMood('result');
  playRecordedEffect('effectLose', bakLabels.length ? 1 : 0.9);
  const resolved = resolveVoiceActor(actor);
  const voice = resolved === 'gostopComputerA'
    ? 'voiceGostopComputerAWin'
    : resolved === 'matgoFemale' ? 'voiceMatgoFemaleWin'
    : resolved === 'gostopComputerB' ? 'voiceGostopComputerBWin'
    : resolved === 'gostopComputerC' ? 'voiceGostopComputerCWin'
    : resolved === 'gostopComputerD' ? 'voiceGostopComputerDWin' : 'voiceLose';
  playRecordedVoice(voice, 300);
}

export function playNagariSound() {
  setGameMusicMood('result');
  playRecordedEffect('effectNagari', 0.9);
  playRecordedVoice('voiceNagari', 230);
}

export function playMoneySound(won: boolean) {
  playRecordedEffect(won ? 'effectMoneyWin' : 'effectMoneyLose', won ? 0.94 : 0.86);
}

export function playStartSound() {
  raiseGameMusicMood('active');
  playRecordedEffect('woodBlock', 0.4);
  playRecordedEffect('effectStart', 0.9);
  playRecordedVoice('voiceStart', 140);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    stopBackgroundMusic();
    graph?.context.suspend().catch(() => undefined);
    return;
  }
  if (graph?.context.state === 'suspended') {
    graph.context.resume().then(startBackgroundMusic).catch(() => undefined);
  }
});
