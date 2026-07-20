import { DEFAULT_AUDIO_SETTINGS, type AudioSettings, normalizeAudioSettings } from './audioSettings';
import { loadGameAudioAsset, playGameAudioAsset, warmGameAudioEffects, type GameAudioAssetKey, type VoiceAudioAssetKey } from './audioAssets';
import { voiceLines, type SpecialVoiceKind } from './voiceLines';
import { VOICE_STYLE_SETTINGS, type VoiceStyle } from './voiceStyle';

interface AudioGraph {
  context: AudioContext;
  master: GainNode;
  effects: GainNode;
  music: GainNode;
  compressor: DynamicsCompressorNode;
}

let graph: AudioGraph | null = null;
let settings: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS };
let musicTimer: number | null = null;
let musicPhraseIndex = 0;
let musicSource: AudioBufferSourceNode | null = null;
let voiceSource: AudioBufferSourceNode | null = null;
let musicLoadPending = false;
let musicLoadVersion = 0;
const speechTimers = new Set<number>();
const specialVoiceAssets: Record<SpecialVoiceKind, readonly [VoiceAudioAssetKey, VoiceAudioAssetKey]> = {
  jjok: ['voicePlayerJjok', 'voiceOpponentJjok'],
  ttadak: ['voicePlayerTtadak', 'voiceOpponentTtadak'],
  sweep: ['voicePlayerSweep', 'voiceOpponentSweep'],
  'ppeok-capture': ['voicePlayerPpeokCapture', 'voiceOpponentPpeokCapture'],
  'self-ppeok': ['voicePlayerSelfPpeok', 'voiceOpponentSelfPpeok']
};

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

function scheduleTone(frequency: number, delay: number, duration: number, gainValue: number, type: OscillatorType, endFrequency = frequency, music = false) {
  const current = getGraph();
  if (!current || current.context.state !== 'running' || settings.muted) return;
  const start = current.context.currentTime + delay;
  const oscillator = current.context.createOscillator();
  const envelope = current.context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(30, frequency), start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + duration);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gainValue, start + Math.min(0.018, duration / 3));
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope).connect(music ? current.music : current.effects);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function scheduleNoise(delay: number, duration: number, gainValue: number, cutoff: number, filterType: BiquadFilterType = 'lowpass', music = false) {
  const current = getGraph();
  if (!current || current.context.state !== 'running' || settings.muted) return;
  const length = Math.max(1, Math.floor(current.context.sampleRate * duration));
  const buffer = current.context.createBuffer(1, length, current.context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) channel[index] = Math.random() * 2 - 1;
  const source = current.context.createBufferSource();
  const filter = current.context.createBiquadFilter();
  const envelope = current.context.createGain();
  const start = current.context.currentTime + delay;
  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.value = cutoff;
  envelope.gain.setValueAtTime(gainValue, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(envelope).connect(music ? current.music : current.effects);
  source.start(start);
}

function scheduleSlap(delay = 0, intensity = 1) {
  scheduleNoise(delay, 0.025, 0.42 * intensity, 4800, 'highpass');
  scheduleNoise(delay, 0.085, 0.64 * intensity, 1150);
  scheduleTone(185, delay, 0.095, 0.42 * intensity, 'triangle', 62);
  scheduleTone(760, delay + 0.006, 0.038, 0.13 * intensity, 'square', 510);
}

function scheduleWoodBlock(frequency: number, delay: number, gainValue: number) {
  scheduleTone(frequency, delay, 0.075, gainValue, 'square', frequency * 0.72);
  scheduleTone(frequency * 2.08, delay + 0.002, 0.042, gainValue * 0.32, 'triangle', frequency * 1.42);
  scheduleNoise(delay, 0.032, gainValue * 0.24, 1800, 'bandpass');
}

function scheduleMetallicHit(frequency: number, delay: number, gainValue: number, duration = 0.32) {
  [1, 1.41, 1.93, 2.71].forEach((ratio, index) => {
    scheduleTone(frequency * ratio, delay + index * 0.003, duration * (1 - index * 0.1), gainValue / (1 + index * 0.65), index === 0 ? 'triangle' : 'sine', frequency * ratio * 0.985);
  });
}

function scheduleCardRoll(delay: number, count: number, spacing: number, intensity = 1) {
  for (let index = 0; index < count; index += 1) {
    scheduleSlap(delay + index * spacing, intensity * (0.58 + index / Math.max(1, count - 1) * 0.42));
  }
}

function playRecordedEffect(key: GameAudioAssetKey, gainValue: number) {
  const current = getGraph();
  if (!current || settings.muted) return;
  playGameAudioAsset(current.context, current.effects, key, gainValue);
}

function speak(message: string, delay = 0, style: VoiceStyle = 'normal') {
  if (settings.muted || settings.volume <= 0 || !('speechSynthesis' in window)) return;
  const timer = window.setTimeout(() => {
    speechTimers.delete(timer);
    if (settings.muted || settings.volume <= 0) return;
    if (voiceSource) {
      try { voiceSource.stop(); }
      catch { /* 이미 종료된 음성은 무시 */ }
      voiceSource = null;
    }
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'ko-KR';
    const voiceStyle = VOICE_STYLE_SETTINGS[style];
    utterance.rate = voiceStyle.rate;
    utterance.pitch = voiceStyle.pitch;
    utterance.volume = Math.min(1, settings.volume * voiceStyle.volumeMultiplier);
    const koreanVoice = window.speechSynthesis.getVoices().find(voice => voice.lang.toLowerCase().startsWith('ko'));
    if (koreanVoice) utterance.voice = koreanVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, delay);
  speechTimers.add(timer);
}

function playRecordedVoice(key: VoiceAudioAssetKey, fallbackMessage: string, delay = 0, style: VoiceStyle = 'normal') {
  if (settings.muted || settings.volume <= 0) return;
  const timer = window.setTimeout(() => {
    speechTimers.delete(timer);
    if (settings.muted || settings.volume <= 0) return;
    const current = getGraph();
    if (!current || current.context.state !== 'running') {
      speak(fallbackMessage, 0, style);
      return;
    }
    void loadGameAudioAsset(current.context, key).then(buffer => {
      if (settings.muted || settings.volume <= 0) return;
      if (!buffer) {
        speak(fallbackMessage, 0, style);
        return;
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (voiceSource) {
        try { voiceSource.stop(); }
        catch { /* 이미 종료된 음성은 무시 */ }
      }
      const source = playGameAudioAsset(current.context, current.effects, key, 0.92);
      voiceSource = source;
      if (source) source.onended = () => { if (voiceSource === source) voiceSource = null; };
    });
  }, delay);
  speechTimers.add(timer);
}

function stopBackgroundMusic() {
  musicLoadVersion += 1;
  musicLoadPending = false;
  if (musicTimer !== null) window.clearTimeout(musicTimer);
  musicTimer = null;
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

function scheduleBackgroundPhrase() {
  const current = getGraph();
  if (!current || current.context.state !== 'running' || settings.muted || !settings.backgroundMusic) return;
  const melodies = [
    [392, 440, 523, 587, 523, 440, 392, 330, 392, 523, 587, 659, 587, 523, 440, 392],
    [392, 523, 587, 523, 440, 392, 330, 392, 440, 523, 659, 587, 523, 440, 392, 330]
  ];
  const melody = melodies[musicPhraseIndex % melodies.length];
  const step = 60 / 136 / 2;
  const phraseDuration = melody.length * step;
  musicPhraseIndex += 1;
  current.music.gain.cancelScheduledValues(current.context.currentTime);
  current.music.gain.setTargetAtTime(0.18, current.context.currentTime, 0.04);
  melody.forEach((frequency, index) => {
    const delay = index * step;
    const accent = index % 4 === 0 ? 1.18 : index % 2 === 0 ? 1.06 : 0.88;
    scheduleTone(frequency, delay, index % 4 === 3 ? 0.2 : 0.14, 0.17 * accent, 'triangle', frequency * 1.006, true);
    scheduleTone(frequency * 2, delay + 0.012, 0.075, 0.035 * accent, 'sine', frequency * 2.015, true);
  });
  [196, 220, 165, 196].forEach((frequency, index) => {
    const delay = index * step * 4;
    scheduleTone(frequency, delay, step * 2.7, 0.075, 'sine', frequency * 0.995, true);
  });
  for (let index = 0; index < melody.length; index += 2) {
    const delay = index * step;
    const strong = index % 4 === 0;
    scheduleTone(strong ? 118 : 190, delay, strong ? 0.13 : 0.07, strong ? 0.19 : 0.1, 'sine', strong ? 58 : 126, true);
    scheduleNoise(delay, strong ? 0.075 : 0.04, strong ? 0.09 : 0.045, strong ? 920 : 2500, strong ? 'lowpass' : 'bandpass', true);
    if (!strong) scheduleTone(820, delay + 0.012, 0.045, 0.055, 'square', 610, true);
  }
  musicTimer = window.setTimeout(scheduleBackgroundPhrase, phraseDuration * 1000);
}

function startBackgroundMusic() {
  if (musicTimer !== null || musicSource || musicLoadPending || settings.muted || !settings.backgroundMusic) return;
  const current = getGraph();
  if (!current || current.context.state !== 'running') return;
  const version = ++musicLoadVersion;
  musicLoadPending = true;
  void loadGameAudioAsset(current.context, 'background').then(buffer => {
    if (version !== musicLoadVersion || settings.muted || !settings.backgroundMusic) return;
    if (!buffer) {
      scheduleBackgroundPhrase();
      return;
    }
    const source = current.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(current.music);
    current.music.gain.cancelScheduledValues(current.context.currentTime);
    current.music.gain.setTargetAtTime(0.14, current.context.currentTime, 0.08);
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
  speechTimers.forEach(timer => window.clearTimeout(timer));
  speechTimers.clear();
  if (voiceSource) {
    try { voiceSource.stop(); }
    catch { /* 이미 종료된 음성은 무시 */ }
    voiceSource = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (graph?.context.state === 'running') graph.context.suspend().catch(() => undefined);
}

export function playCardSound() {
  playRecordedEffect('cardDeal', 0.72);
  scheduleSlap(0, 0.46);
  scheduleWoodBlock(225, 0.012, 0.1);
}

export function playFlipSound() {
  playRecordedEffect('cardSlide', 0.62);
  scheduleNoise(0, 0.085, 0.16, 3600, 'highpass');
  scheduleTone(520, 0.008, 0.055, 0.18, 'square', 980);
  scheduleTone(880, 0.047, 0.06, 0.16, 'triangle', 1320);
  scheduleNoise(0.052, 0.026, 0.12, 5400, 'highpass');
}

export function playCaptureSound(opponent = false) {
  playRecordedEffect('cardContact', 0.8);
  scheduleSlap(0, 0.48);
  scheduleMetallicHit(690, 0.035, 0.28, 0.3);
  scheduleTone(520, 0.025, 0.16, 0.21, 'triangle', 790);
  scheduleTone(1040, 0.095, 0.2, 0.13, 'sine', 1320);
  playRecordedVoice(opponent ? 'voiceOpponentCapture' : 'voicePlayerCapture', voiceLines.capture(opponent), 80, opponent ? 'taunt' : 'shout');
}

export function playBonusPeeSound(value: 2 | 3, opponent = false, chainCount = 1) {
  scheduleCardRoll(0, Math.max(2, chainCount + 1), 0.045, 0.82);
  scheduleSlap(0.08, 0.8);
  scheduleNoise(0.06, 0.28, value === 3 ? 0.34 : 0.26, 4300, 'highpass');
  [523, 659, 784, value === 3 ? 1175 : 988].forEach((frequency, index) => {
    scheduleMetallicHit(frequency, 0.07 + index * 0.055, 0.18, 0.28);
    scheduleTone(frequency, 0.08 + index * 0.06, 0.24, 0.16, 'triangle', frequency * 1.12);
  });
  const key = value === 3
    ? opponent ? 'voiceOpponentBonusThree' : 'voicePlayerBonusThree'
    : opponent ? 'voiceOpponentBonusTwo' : 'voicePlayerBonusTwo';
  playRecordedVoice(key, voiceLines.bonusPee(value === 3 ? '쓰리피' : '쌍피', opponent), 190, opponent ? 'taunt' : 'shout');
}

export function playPeeTransferSound(value: 2 | 3, stolenByOpponent = false) {
  scheduleCardRoll(0, value === 3 ? 4 : 3, 0.042, 0.72);
  scheduleSlap(0.08, 0.82);
  scheduleMetallicHit(value === 3 ? 760 : 620, 0.12, 0.24, 0.56);
  scheduleNoise(0.09, 0.28, 0.22, 3900, 'highpass');
  const name = value === 3 ? '쓰리피' : '쌍피';
  playRecordedVoice(stolenByOpponent ? 'voiceOpponentPeeTransfer' : 'voicePlayerPeeTransfer', voiceLines.peeTransfer(name, stolenByOpponent), 170, stolenByOpponent ? 'taunt' : 'shout');
}

export function playPpeokSound(opponent = false, count = 1) {
  const chain = Math.max(1, Math.min(3, count));
  scheduleCardRoll(0, chain, 0.085, 0.72 + chain * 0.09);
  scheduleWoodBlock(175 + chain * 24, 0.035, 0.3 + chain * 0.08);
  scheduleTone(250, 0.045, 0.34 + chain * 0.05, 0.32 + chain * 0.07, 'sawtooth', 72);
  scheduleTone(145, 0.13, 0.38 + chain * 0.06, 0.22 + chain * 0.06, 'sine', 58);
  scheduleNoise(0.12, 0.18 + chain * 0.04, 0.13 + chain * 0.07, 540);
  if (chain >= 2) scheduleMetallicHit(chain === 3 ? 690 : 520, 0.2, 0.25 + chain * 0.06, 0.4);
  const key: VoiceAudioAssetKey = chain >= 3
    ? 'voiceTriplePpeok'
    : chain === 2
      ? 'voiceDoublePpeok'
      : opponent ? 'voiceOpponentPpeok' : 'voicePlayerPpeok';
  playRecordedVoice(key, voiceLines.ppeok(opponent, chain), 110 + chain * 25, chain >= 2 ? 'shout' : opponent ? 'taunt' : 'low');
}

export function playBombSound(opponent = false) {
  scheduleCardRoll(0, 3, 0.055, 0.9);
  scheduleNoise(0.11, 0.3, 0.72, 760);
  scheduleTone(108, 0.09, 0.44, 0.58, 'sawtooth', 42);
  scheduleMetallicHit(360, 0.15, 0.25, 0.42);
  [392, 523, 784].forEach((frequency, index) => scheduleTone(frequency, 0.15 + index * 0.055, 0.19, 0.16, 'square', frequency * 1.08));
  playRecordedVoice(opponent ? 'voiceOpponentBomb' : 'voicePlayerBomb', voiceLines.bomb(opponent), 135, opponent ? 'taunt' : 'shout');
}

export function playShakeSound(opponent = false) {
  [0, 0.055, 0.11, 0.165].forEach((delay, index) => {
    scheduleNoise(delay, 0.045, 0.26 + index * 0.035, 2200, 'bandpass');
    scheduleWoodBlock(260 + index * 32, delay, 0.12 + index * 0.018);
  });
  scheduleSlap(0.22, 0.75);
  scheduleMetallicHit(510, 0.225, 0.2, 0.34);
  [330, 440, 587].forEach((frequency, index) => scheduleTone(frequency, 0.18 + index * 0.065, 0.24, 0.16, 'triangle', frequency * 1.12));
  playRecordedVoice('voiceShake', voiceLines.shake, 150, opponent ? 'taunt' : 'shout');
}

export function playSpecialMoveSound(kind: SpecialVoiceKind, opponent = false) {
  const emphasis = kind === 'self-ppeok' || kind === 'ttadak' ? 1 : 0.78;
  scheduleCardRoll(0, kind === 'ttadak' ? 4 : 2, 0.045, 0.6 * emphasis);
  scheduleSlap(kind === 'sweep' ? 0.08 : 0.02, 0.68 * emphasis);
  scheduleMetallicHit(kind === 'self-ppeok' ? 430 : 620, 0.09, 0.25, 0.42 * emphasis);
  [392, 523, kind === 'sweep' ? 988 : 784].forEach((frequency, index) =>
    scheduleTone(frequency, 0.08 + index * 0.065, 0.22, 0.18 * emphasis, 'triangle', frequency * 1.08));
  if (kind === 'sweep') scheduleNoise(0.06, 0.25, 0.14, 4200, 'highpass');
  playRecordedVoice(specialVoiceAssets[kind][opponent ? 1 : 0], voiceLines.special(kind, opponent), 115, opponent ? 'taunt' : 'shout');
}

export function playMissionSound(multiplier: number, opponent = false) {
  [523, 659, 784, 1047].forEach((frequency, index) => {
    scheduleMetallicHit(frequency, index * 0.055, 0.16, 0.2);
    scheduleTone(frequency, index * 0.07, 0.26, 0.18, 'triangle', frequency * 1.1);
  });
  scheduleNoise(0.1, 0.24, 0.12, 4600, 'highpass');
  playRecordedVoice(opponent ? 'voiceOpponentMission' : 'voicePlayerMission', voiceLines.mission(multiplier, opponent), 190, opponent ? 'taunt' : 'shout');
}

export function playScoreSound(label: string, score: number, opponent = false) {
  scheduleSlap(0, 0.62);
  [392, 523, 659, 784].forEach((frequency, index) => {
    scheduleMetallicHit(frequency, 0.035 + index * 0.055, 0.16, 0.25);
    scheduleTone(frequency, 0.045 + index * 0.06, 0.22, 0.18, 'triangle', frequency * 1.08);
  });
  scheduleNoise(0.09, 0.22, 0.12, 4400, 'highpass');
  playRecordedVoice(opponent ? 'voiceOpponentScore' : 'voicePlayerScore', voiceLines.score(label, score, opponent), 150, opponent ? 'taunt' : 'shout');
}

export function playGoSound(goCount: number, opponent = false) {
  if (goCount >= 5) {
    scheduleSlap(0, 0.9);
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((frequency, index) => {
      const delay = 0.04 + index * 0.09;
      scheduleTone(frequency, delay, 0.3, 0.24, 'sawtooth', frequency * 1.025);
      scheduleTone(frequency / 2, delay, 0.34, 0.18, 'triangle', frequency / 2 * 1.015);
    });
    [0.1, 0.34, 0.58].forEach((delay, index) => {
      scheduleMetallicHit(620 + index * 180, delay, 0.28, 0.52);
      scheduleNoise(delay, 0.16, 0.18, 4200, 'highpass');
    });
    playRecordedVoice(opponent ? 'voiceOpponentGo' : 'voicePlayerGo', voiceLines.go(goCount), 240, opponent ? 'taunt' : 'shout');
    return;
  }
  const notes = goCount >= 3 ? [392, 523, 659, 784, 1047] : [392, 523, 659];
  scheduleSlap(0, 0.62);
  scheduleMetallicHit(goCount >= 3 ? 390 : 520, 0.035, goCount >= 3 ? 0.25 : 0.18, 0.4);
  notes.forEach((frequency, index) => scheduleTone(frequency, 0.045 + index * 0.07, 0.25, 0.21, 'triangle', frequency * 1.06));
  if (goCount >= 3) scheduleNoise(0.08, 0.3, 0.16, 3800, 'highpass');
  playRecordedVoice(opponent ? 'voiceOpponentGo' : 'voicePlayerGo', voiceLines.go(goCount), 85, opponent ? 'taunt' : 'shout');
}

export function playStopSound(opponent = false) {
  scheduleSlap(0, 0.88);
  scheduleMetallicHit(330, 0.025, 0.24, 0.44);
  [659, 523, 392, 262].forEach((frequency, index) => scheduleTone(frequency, 0.035 + index * 0.065, 0.3, 0.24, 'triangle', frequency * 0.88));
  scheduleTone(98, 0.18, 0.42, 0.3, 'sine', 65);
  playRecordedVoice(opponent ? 'voiceOpponentStop' : 'voicePlayerStop', voiceLines.stop, 70, opponent ? 'taunt' : 'low');
}

export function playWinSound(finalScore: number, goCount: number) {
  const notes = goCount >= 3 ? [392, 523, 659, 784, 988, 1175] : [392, 494, 587, 784, 988];
  scheduleCardRoll(0, 4, 0.06, 0.52);
  notes.forEach((frequency, index) => scheduleTone(frequency, 0.12 + index * 0.085, 0.38, 0.24, index % 2 ? 'sine' : 'triangle', frequency * 1.04));
  scheduleMetallicHit(620, 0.34, 0.25, 0.62);
  scheduleNoise(0.28, 0.4, 0.25, 4200, 'highpass');
  playRecordedVoice('voiceWin', voiceLines.win(finalScore), 400, 'shout');
}

export function playLoseSound(bakLabels: string[] = []) {
  scheduleWoodBlock(190, 0, 0.28);
  [330, 277, 220, 165].forEach((frequency, index) => scheduleTone(frequency, index * 0.12, 0.34, 0.26, 'triangle', frequency * 0.82));
  playRecordedVoice('voiceLose', voiceLines.lose(bakLabels), 360, 'taunt');
}

export function playNagariSound() {
  [0, 0.14, 0.28].forEach((delay, index) => scheduleWoodBlock(index === 1 ? 190 : 235, delay, 0.2));
  [294, 247, 294].forEach((frequency, index) => scheduleTone(frequency, index * 0.13, 0.28, 0.15, 'sine', frequency));
  playRecordedVoice('voiceNagari', voiceLines.nagari, 260, 'taunt');
}

export function playMoneySound(won: boolean) {
  if (won) {
    [988, 1319, 1175, 1568, 1760, 2093].forEach((frequency, index) => {
      scheduleMetallicHit(frequency, index * 0.055, 0.1, 0.16);
      scheduleTone(frequency, index * 0.065, 0.18, 0.13, 'sine', frequency * 1.03);
    });
    scheduleNoise(0.1, 0.24, 0.08, 5200, 'highpass');
    return;
  }
  [440, 370, 311].forEach((frequency, index) =>
    scheduleTone(frequency, index * 0.09, 0.22, 0.2, 'triangle', frequency * 0.86));
}

export function playStartSound() {
  playRecordedEffect('woodBlock', 0.48);
  scheduleWoodBlock(245, 0, 0.2);
  [262, 330, 392, 523].forEach((frequency, index) => scheduleTone(frequency, 0.035 + index * 0.075, 0.22, 0.19, 'sine', frequency * 1.03));
  scheduleMetallicHit(520, 0.26, 0.12, 0.28);
  playRecordedVoice('voiceStart', voiceLines.start, 150, 'shout');
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
