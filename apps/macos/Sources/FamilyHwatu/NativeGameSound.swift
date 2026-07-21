import AppKit
import AVFoundation

enum NativeAudioDefaults {
    static let soundEnabled = true
    static let voiceEnabled = true
    static let backgroundMusicEnabled = false
    static let volume = 0.28
}

@MainActor
enum NativeGameSound {
    enum Effect: String {
        case deal, decision, select, cancel, undo, bomb, shake, chongtong
        case jjok, ttadak, sweep, ppeok, ppeokCapture = "ppeok-capture", selfPpeok = "self-ppeok"
        case doublePpeok = "double-ppeok", triplePpeok = "triple-ppeok"
        case mission, score, go, goHigh = "go-high", stop, win, lose, nagari
        case peeTransferTwo = "pee-transfer-two", peeTransferThree = "pee-transfer-three"
        case bonusTwo = "bonus-two", bonusThree = "bonus-three"
        case gookjinDouble = "gookjin-double", gookjinAnimal = "gookjin-animal"
        case autoplayOn = "autoplay-on", autoplayOff = "autoplay-off"
        case cardContact = "card-contact"
    }

    enum MusicStage: Int, Comparable {
        case calm, active, tense, climax, result

        static func < (lhs: MusicStage, rhs: MusicStage) -> Bool { lhs.rawValue < rhs.rawValue }

        var playbackRate: Float {
            switch self { case .calm: 1; case .active: 1.025; case .tense: 1.06; case .climax: 1.095; case .result: 0.96 }
        }

        var gain: Double {
            switch self { case .calm: 0.13; case .active: 0.14; case .tense: 0.152; case .climax: 0.162; case .result: 0.115 }
        }

        static func game(score: Int, goCount: Int, ended: Bool) -> MusicStage {
            if ended { return .result }
            if score >= 10 || goCount >= 3 { return .climax }
            if score >= 5 || goCount >= 1 { return .tense }
            return score > 0 ? .active : .calm
        }
    }

    struct NoticePlan: Equatable {
        let effect: Effect
        let voice: String?
        let voiceDelayMilliseconds: Int
    }

    private static var effectPlayer: NSSound?
    private static var voicePlayer: NSSound?
    private static var auxiliaryPlayer: NSSound?
    private static var musicPlayer: AVAudioPlayer?
    private static var voiceTask: Task<Void, Never>?
    private static var consumedEventIDs: Set<String> = []
    private static var musicStage: MusicStage = .calm

    static func play(_ effect: Effect, volume: Double) {
        let subdirectory = effect == .cardContact ? "audio" : "audio/effects"
        let fileExtension = effect == .cardContact ? "mp3" : "wav"
        effectPlayer = sound(named: effect.rawValue, extension: fileExtension, subdirectory: subdirectory)
        effectPlayer?.volume = Float(max(0, min(1, volume)))
        effectPlayer?.play()
    }

    static func noticePlan(_ notice: String, player: PlayerID) -> NoticePlan {
        let effect: Effect
        let voice: String?
        if notice.contains("총통") { effect = .chongtong; voice = player == .human ? "player-chongtong" : "opponent-chongtong" }
        else if notice.contains("흔들") { effect = .shake; voice = "shake" }
        else if notice.contains("폭탄") { effect = .bomb; voice = player == .human ? "player-bomb" : "opponent-bomb" }
        else if notice.contains("따닥") { effect = .ttadak; voice = player == .human ? "player-ttadak" : "opponent-ttadak" }
        else if notice.contains("싹쓸이") { effect = .sweep; voice = player == .human ? "player-sweep" : "opponent-sweep" }
        else if notice.contains("쪽") { effect = .jjok; voice = player == .human ? "player-jjok" : "opponent-jjok" }
        else if notice.contains("삼연뻑") { effect = .triplePpeok; voice = "triple-ppeok" }
        else if notice.contains("연속뻑") { effect = .doublePpeok; voice = "double-ppeok" }
        else if notice.contains("자뻑") { effect = .selfPpeok; voice = player == .human ? "player-self-ppeok" : "opponent-self-ppeok" }
        else if notice.contains("싼 패") { effect = .ppeokCapture; voice = player == .human ? "player-ppeok-capture" : "opponent-ppeok-capture" }
        else if notice.contains("뻑") { effect = .ppeok; voice = player == .human ? "player-ppeok" : "opponent-ppeok" }
        else if notice.contains("국진") && notice.contains("쌍피") { effect = .gookjinDouble; voice = "gookjin-double" }
        else if notice.contains("국진") { effect = .gookjinAnimal; voice = "gookjin-animal" }
        else if notice.contains("쓰리피") || notice.contains("삼피") { effect = .bonusThree; voice = player == .human ? "player-bonus-three" : "opponent-bonus-three" }
        else if notice.contains("쌍피") || notice.contains("보너스") { effect = .bonusTwo; voice = player == .human ? "player-bonus-two" : "opponent-bonus-two" }
        else if notice.contains("미션") { effect = .mission; voice = player == .human ? "player-mission" : "opponent-mission" }
        else if notice.contains("오고") { effect = .goHigh; voice = player == .human ? "player-go" : "opponent-go" }
        else if notice.contains("고!") { effect = .go; voice = player == .human ? "player-go" : "opponent-go" }
        else if notice.hasPrefix("스톱!") { effect = .stop; voice = player == .human ? "player-stop" : "opponent-stop" }
        else if notice.contains("짝") { effect = .cardContact; voice = nil }
        else if notice.contains("점수") { effect = .score; voice = player == .human ? "player-score" : "opponent-score" }
        else { effect = .score; voice = nil }
        return NoticePlan(effect: effect, voice: voice, voiceDelayMilliseconds: voiceDelay(for: effect, player: player))
    }

    static func playNotice(_ notice: String, player: PlayerID, volume: Double, voiceEnabled: Bool, eventID: String? = nil) {
        if let eventID {
            guard consumedEventIDs.insert(eventID).inserted else { return }
            if consumedEventIDs.count > 256 { consumedEventIDs = [eventID] }
        }
        let plan = noticePlan(notice, player: player)
        play(plan.effect, volume: volume)
        guard voiceEnabled, let voice = plan.voice else { return }
        voiceTask?.cancel()
        voiceTask = Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(plan.voiceDelayMilliseconds))
            guard !Task.isCancelled else { return }
            voicePlayer = sound(named: voice, extension: "wav", subdirectory: "audio/voices")
            voicePlayer?.volume = Float(max(0, min(1, volume * 0.9)))
            voicePlayer?.play()
        }
    }

    private static func voiceDelay(for effect: Effect, player: PlayerID) -> Int {
        switch effect {
        case .bonusTwo, .bonusThree: 150
        case .peeTransferTwo, .peeTransferThree: 140
        case .ppeok, .ppeokCapture, .selfPpeok, .doublePpeok, .triplePpeok, .bomb: 120
        case .shake: player == .human ? 140 : 170
        case .chongtong: 130
        case .gookjinDouble, .gookjinAnimal: 100
        case .jjok, .ttadak, .sweep: 110
        case .mission: 170
        case .score: 140
        case .go: 90
        case .goHigh: 220
        case .stop: 70
        case .win: 320
        case .lose: 300
        case .nagari: 230
        default: 80
        }
    }

    static func playPeeTransfer(for events: [NativeRuleEvent], volume: Double) {
        let value = events.flatMap(\.stolenPee).map(\.peeValue).max() ?? 0
        guard value >= 2 else { return }
        let effect: Effect = value >= 3 ? .peeTransferThree : .peeTransferTwo
        auxiliaryPlayer = sound(named: effect.rawValue, extension: "wav", subdirectory: "audio/effects")
        auxiliaryPlayer?.volume = Float(max(0, min(1, volume * 0.92)))
        auxiliaryPlayer?.play()
    }

    static func setBackgroundMusic(enabled: Bool, volume: Double, stage requestedStage: MusicStage = .calm) {
        guard enabled else { musicPlayer?.stop(); musicPlayer = nil; musicStage = .calm; return }
        if musicPlayer == nil {
            if let url = resourceURL(named: "gugak-bgm-133", extension: "mp3", subdirectory: "audio") {
                musicPlayer = try? AVAudioPlayer(contentsOf: url)
                musicPlayer?.numberOfLoops = -1
                musicPlayer?.enableRate = true
            }
        }
        musicStage = requestedStage == .result ? .result : max(musicStage, requestedStage)
        musicPlayer?.rate = musicStage.playbackRate
        musicPlayer?.volume = Float(max(0, min(1, volume * musicStage.gain)))
        if musicPlayer?.isPlaying == false { musicPlayer?.play() }
    }

    static func musicStage(for session: GameSession) -> MusicStage {
        let score = session.mode.players.map { session.score(for: $0).total }.max() ?? 0
        let goCount = session.mode.players.map { session.goCounts[$0] ?? 0 }.max() ?? 0
        return .game(score: score, goCount: goCount, ended: session.isEnded)
    }

    static func suspend() {
        voiceTask?.cancel()
        voiceTask = nil
        effectPlayer?.stop()
        voicePlayer?.stop()
        auxiliaryPlayer?.stop()
        musicPlayer?.pause()
    }

    static func resetEventHistory() {
        consumedEventIDs.removeAll()
    }

    private static func sound(named name: String, extension fileExtension: String, subdirectory: String) -> NSSound? {
        resourceURL(named: name, extension: fileExtension, subdirectory: subdirectory).flatMap { NSSound(contentsOf: $0, byReference: false) }
    }

    static func resourceURL(named name: String, extension fileExtension: String, subdirectory: String) -> URL? {
        let embeddedBundle = Bundle.main.resourceURL.map { $0.appendingPathComponent("FamilyHwatuMac_FamilyHwatu.bundle") }.flatMap(Bundle.init(url:))
        return embeddedBundle?.url(forResource: name, withExtension: fileExtension, subdirectory: subdirectory)
            ?? Bundle.module.url(forResource: name, withExtension: fileExtension, subdirectory: subdirectory)
    }
}
