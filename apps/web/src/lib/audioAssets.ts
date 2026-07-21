const configuredBackgroundMusic = import.meta.env.VITE_GAME_BGM_URL?.trim();

export const EFFECT_AUDIO_ASSETS = Object.freeze({
  cardDeal: '/audio/card-deal.mp3',
  cardSlide: '/audio/card-slide.mp3',
  cardContact: '/audio/card-contact.mp3',
  woodBlock: '/audio/wood-block.mp3',
  effectBonusTwo: '/audio/effects/bonus-two.wav',
  effectBonusThree: '/audio/effects/bonus-three.wav',
  effectPeeTransferTwo: '/audio/effects/pee-transfer-two.wav',
  effectPeeTransferThree: '/audio/effects/pee-transfer-three.wav',
  effectPpeok: '/audio/effects/ppeok.wav',
  effectDoublePpeok: '/audio/effects/double-ppeok.wav',
  effectTriplePpeok: '/audio/effects/triple-ppeok.wav',
  effectBomb: '/audio/effects/bomb.wav',
  effectShake: '/audio/effects/shake.wav',
  effectJjok: '/audio/effects/jjok.wav',
  effectTtadak: '/audio/effects/ttadak.wav',
  effectSweep: '/audio/effects/sweep.wav',
  effectPpeokCapture: '/audio/effects/ppeok-capture.wav',
  effectSelfPpeok: '/audio/effects/self-ppeok.wav',
  effectMission: '/audio/effects/mission.wav',
  effectScore: '/audio/effects/score.wav',
  effectGo: '/audio/effects/go.wav',
  effectGoHigh: '/audio/effects/go-high.wav',
  effectStop: '/audio/effects/stop.wav',
  effectWin: '/audio/effects/win.wav',
  effectLose: '/audio/effects/lose.wav',
  effectNagari: '/audio/effects/nagari.wav',
  effectMoneyWin: '/audio/effects/money-win.wav',
  effectMoneyLose: '/audio/effects/money-lose.wav',
  effectStart: '/audio/effects/start.wav',
  effectDeal: '/audio/effects/deal.wav',
  effectDecision: '/audio/effects/decision.wav',
  effectSelect: '/audio/effects/select.wav',
  effectCancel: '/audio/effects/cancel.wav',
  effectUndo: '/audio/effects/undo.wav',
  effectGookjinDouble: '/audio/effects/gookjin-double.wav',
  effectGookjinAnimal: '/audio/effects/gookjin-animal.wav',
  effectAutoPlayOn: '/audio/effects/autoplay-on.wav',
  effectAutoPlayOff: '/audio/effects/autoplay-off.wav',
  effectDealerHuman: '/audio/effects/dealer-human.wav',
  effectDealerOpponent: '/audio/effects/dealer-opponent.wav',
  effectChongtong: '/audio/effects/chongtong.wav'
} as const);

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
  voiceStart: '/audio/voices/start.wav',
  voicePlayerChongtong: '/audio/voices/player-chongtong.wav',
  voiceOpponentChongtong: '/audio/voices/opponent-chongtong.wav',
  voiceDealerHuman: '/audio/voices/dealer-human.wav',
  voiceDealerOpponent: '/audio/voices/dealer-opponent.wav',
  voiceGookjinDouble: '/audio/voices/gookjin-double.wav',
  voiceGookjinAnimal: '/audio/voices/gookjin-animal.wav',
  voiceUndo: '/audio/voices/undo.wav',
  voiceGostopComputerACapture: '/audio/voices/gostop-computer-a-capture.wav',
  voiceGostopComputerABonusTwo: '/audio/voices/gostop-computer-a-bonus-two.wav',
  voiceGostopComputerABonusThree: '/audio/voices/gostop-computer-a-bonus-three.wav',
  voiceGostopComputerAPpeok: '/audio/voices/gostop-computer-a-ppeok.wav',
  voiceGostopComputerASweep: '/audio/voices/gostop-computer-a-sweep.wav',
  voiceGostopComputerAPpeokCapture: '/audio/voices/gostop-computer-a-ppeok-capture.wav',
  voiceGostopComputerASelfPpeok: '/audio/voices/gostop-computer-a-self-ppeok.wav',
  voiceGostopComputerAScore: '/audio/voices/gostop-computer-a-score.wav',
  voiceGostopComputerAGo: '/audio/voices/gostop-computer-a-go.wav',
  voiceGostopComputerAStop: '/audio/voices/gostop-computer-a-stop.wav',
  voiceGostopComputerAWin: '/audio/voices/gostop-computer-a-win.wav',
  voiceMatgoFemaleCapture: '/audio/voices/matgo-female-capture.wav',
  voiceMatgoFemaleBonusTwo: '/audio/voices/matgo-female-bonus-two.wav',
  voiceMatgoFemaleBonusThree: '/audio/voices/matgo-female-bonus-three.wav',
  voiceMatgoFemalePpeok: '/audio/voices/matgo-female-ppeok.wav',
  voiceMatgoFemaleSweep: '/audio/voices/matgo-female-sweep.wav',
  voiceMatgoFemalePpeokCapture: '/audio/voices/matgo-female-ppeok-capture.wav',
  voiceMatgoFemaleSelfPpeok: '/audio/voices/matgo-female-self-ppeok.wav',
  voiceMatgoFemaleScore: '/audio/voices/matgo-female-score.wav',
  voiceMatgoFemaleGo: '/audio/voices/matgo-female-go.wav',
  voiceMatgoFemaleStop: '/audio/voices/matgo-female-stop.wav',
  voiceMatgoFemaleWin: '/audio/voices/matgo-female-win.wav',
  voiceGostopComputerBCapture: '/audio/voices/gostop-computer-b-capture.wav',
  voiceGostopComputerBBonusTwo: '/audio/voices/gostop-computer-b-bonus-two.wav',
  voiceGostopComputerBBonusThree: '/audio/voices/gostop-computer-b-bonus-three.wav',
  voiceGostopComputerBPpeok: '/audio/voices/gostop-computer-b-ppeok.wav',
  voiceGostopComputerBSweep: '/audio/voices/gostop-computer-b-sweep.wav',
  voiceGostopComputerBPpeokCapture: '/audio/voices/gostop-computer-b-ppeok-capture.wav',
  voiceGostopComputerBSelfPpeok: '/audio/voices/gostop-computer-b-self-ppeok.wav',
  voiceGostopComputerBScore: '/audio/voices/gostop-computer-b-score.wav',
  voiceGostopComputerBGo: '/audio/voices/gostop-computer-b-go.wav',
  voiceGostopComputerBStop: '/audio/voices/gostop-computer-b-stop.wav',
  voiceGostopComputerBWin: '/audio/voices/gostop-computer-b-win.wav',
  voiceGostopComputerCCapture: '/audio/voices/gostop-computer-c-capture.wav',
  voiceGostopComputerCBonusTwo: '/audio/voices/gostop-computer-c-bonus-two.wav',
  voiceGostopComputerCBonusThree: '/audio/voices/gostop-computer-c-bonus-three.wav',
  voiceGostopComputerCPpeok: '/audio/voices/gostop-computer-c-ppeok.wav',
  voiceGostopComputerCSweep: '/audio/voices/gostop-computer-c-sweep.wav',
  voiceGostopComputerCPpeokCapture: '/audio/voices/gostop-computer-c-ppeok-capture.wav',
  voiceGostopComputerCSelfPpeok: '/audio/voices/gostop-computer-c-self-ppeok.wav',
  voiceGostopComputerCScore: '/audio/voices/gostop-computer-c-score.wav',
  voiceGostopComputerCGo: '/audio/voices/gostop-computer-c-go.wav',
  voiceGostopComputerCStop: '/audio/voices/gostop-computer-c-stop.wav',
  voiceGostopComputerCWin: '/audio/voices/gostop-computer-c-win.wav',
  voiceGostopComputerDCapture: '/audio/voices/gostop-computer-d-capture.wav',
  voiceGostopComputerDBonusTwo: '/audio/voices/gostop-computer-d-bonus-two.wav',
  voiceGostopComputerDBonusThree: '/audio/voices/gostop-computer-d-bonus-three.wav',
  voiceGostopComputerDPpeok: '/audio/voices/gostop-computer-d-ppeok.wav',
  voiceGostopComputerDSweep: '/audio/voices/gostop-computer-d-sweep.wav',
  voiceGostopComputerDPpeokCapture: '/audio/voices/gostop-computer-d-ppeok-capture.wav',
  voiceGostopComputerDSelfPpeok: '/audio/voices/gostop-computer-d-self-ppeok.wav',
  voiceGostopComputerDScore: '/audio/voices/gostop-computer-d-score.wav',
  voiceGostopComputerDGo: '/audio/voices/gostop-computer-d-go.wav',
  voiceGostopComputerDStop: '/audio/voices/gostop-computer-d-stop.wav',
  voiceGostopComputerDWin: '/audio/voices/gostop-computer-d-win.wav'
} as const);

export const GAME_AUDIO_ASSETS = Object.freeze({
  background: configuredBackgroundMusic || '/audio/gugak-bgm-133.mp3',
  ...EFFECT_AUDIO_ASSETS,
  ...VOICE_AUDIO_ASSETS
} as const);

export type GameAudioAssetKey = keyof typeof GAME_AUDIO_ASSETS;
export type EffectAudioAssetKey = keyof typeof EFFECT_AUDIO_ASSETS;
export type VoiceAudioAssetKey = keyof typeof VOICE_AUDIO_ASSETS;

const EFFECT_ASSETS: readonly GameAudioAssetKey[] = [
  ...Object.keys(EFFECT_AUDIO_ASSETS) as EffectAudioAssetKey[],
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
