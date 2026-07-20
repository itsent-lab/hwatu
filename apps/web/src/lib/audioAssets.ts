const configuredBackgroundMusic = import.meta.env.VITE_GAME_BGM_URL?.trim();

export const VOICE_AUDIO_ASSETS = Object.freeze({
  voicePlayerCapture: '/audio/voices/player-capture.wav',
  voiceOpponentCapture: '/audio/voices/opponent-capture.wav',
  voicePlayerBonusTwo: '/audio/voices/player-bonus-two.wav',
  voiceOpponentBonusTwo: '/audio/voices/opponent-bonus-two.wav',
  voicePlayerBonusThree: '/audio/voices/player-bonus-three.wav',
  voiceOpponentBonusThree: '/audio/voices/opponent-bonus-three.wav',
  voicePlayerPeeTransfer: '/audio/voices/player-pee-transfer.wav',
  voiceOpponentPeeTransfer: '/audio/voices/opponent-pee-transfer.wav',
  voicePlayerPpeok: '/audio/voices/player-ppeok.wav',
  voiceOpponentPpeok: '/audio/voices/opponent-ppeok.wav',
  voiceDoublePpeok: '/audio/voices/double-ppeok.wav',
  voiceTriplePpeok: '/audio/voices/triple-ppeok.wav',
  voicePlayerBomb: '/audio/voices/player-bomb.wav',
  voiceOpponentBomb: '/audio/voices/opponent-bomb.wav',
  voiceShake: '/audio/voices/shake.wav',
  voicePlayerJjok: '/audio/voices/player-jjok.wav',
  voiceOpponentJjok: '/audio/voices/opponent-jjok.wav',
  voicePlayerTtadak: '/audio/voices/player-ttadak.wav',
  voiceOpponentTtadak: '/audio/voices/opponent-ttadak.wav',
  voicePlayerSweep: '/audio/voices/player-sweep.wav',
  voiceOpponentSweep: '/audio/voices/opponent-sweep.wav',
  voicePlayerPpeokCapture: '/audio/voices/player-ppeok-capture.wav',
  voiceOpponentPpeokCapture: '/audio/voices/opponent-ppeok-capture.wav',
  voicePlayerSelfPpeok: '/audio/voices/player-self-ppeok.wav',
  voiceOpponentSelfPpeok: '/audio/voices/opponent-self-ppeok.wav',
  voicePlayerMission: '/audio/voices/player-mission.wav',
  voiceOpponentMission: '/audio/voices/opponent-mission.wav',
  voicePlayerScore: '/audio/voices/player-score.wav',
  voiceOpponentScore: '/audio/voices/opponent-score.wav',
  voicePlayerGo: '/audio/voices/player-go.wav',
  voiceOpponentGo: '/audio/voices/opponent-go.wav',
  voicePlayerStop: '/audio/voices/player-stop.wav',
  voiceOpponentStop: '/audio/voices/opponent-stop.wav',
  voiceWin: '/audio/voices/win.wav',
  voiceLose: '/audio/voices/lose.wav',
  voiceNagari: '/audio/voices/nagari.wav',
  voiceStart: '/audio/voices/start.wav'
} as const);

export const GAME_AUDIO_ASSETS = Object.freeze({
  background: configuredBackgroundMusic || '/audio/gugak-bgm-133.mp3',
  cardDeal: '/audio/card-deal.mp3',
  cardSlide: '/audio/card-slide.mp3',
  cardContact: '/audio/card-contact.mp3',
  woodBlock: '/audio/wood-block.mp3',
  ...VOICE_AUDIO_ASSETS
} as const);

export type GameAudioAssetKey = keyof typeof GAME_AUDIO_ASSETS;
export type VoiceAudioAssetKey = keyof typeof VOICE_AUDIO_ASSETS;

const EFFECT_ASSETS: readonly GameAudioAssetKey[] = [
  'cardDeal',
  'cardSlide',
  'cardContact',
  'woodBlock',
  ...Object.keys(VOICE_AUDIO_ASSETS) as VoiceAudioAssetKey[]
];
const decodedBuffers = new Map<GameAudioAssetKey, AudioBuffer | null>();
const pendingBuffers = new Map<GameAudioAssetKey, Promise<AudioBuffer | null>>();

export async function loadGameAudioAsset(context: AudioContext, key: GameAudioAssetKey): Promise<AudioBuffer | null> {
  if (decodedBuffers.has(key)) return decodedBuffers.get(key) ?? null;
  const pending = pendingBuffers.get(key);
  if (pending) return pending;

  const request = fetch(GAME_AUDIO_ASSETS[key])
    .then(response => {
      if (!response.ok) throw new Error(`오디오 자산을 불러오지 못했습니다: ${key}`);
      return response.arrayBuffer();
    })
    .then(data => context.decodeAudioData(data))
    .catch(() => null)
    .then(buffer => {
      decodedBuffers.set(key, buffer);
      pendingBuffers.delete(key);
      return buffer;
    });
  pendingBuffers.set(key, request);
  return request;
}

export function warmGameAudioEffects(context: AudioContext) {
  EFFECT_ASSETS.forEach(key => { void loadGameAudioAsset(context, key); });
}

export function playGameAudioAsset(
  context: AudioContext,
  destination: AudioNode,
  key: GameAudioAssetKey,
  gainValue = 1
): AudioBufferSourceNode | null {
  if (context.state !== 'running') return null;
  const buffer = decodedBuffers.get(key);
  if (!buffer) {
    void loadGameAudioAsset(context, key);
    return null;
  }
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = gainValue;
  source.connect(gain).connect(destination);
  source.start();
  return source;
}
