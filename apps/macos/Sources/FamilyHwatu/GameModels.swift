import Foundation

enum GameMode: String, Codable {
    case matgo
    case gostop

    var title: String { self == .matgo ? "맞고" : "고스톱" }
    var players: [PlayerID] { self == .matgo ? [.human, .computer] : [.human, .computerA, .computerB] }
    var handSize: Int { self == .matgo ? 10 : 7 }
    var floorSize: Int { self == .matgo ? 8 : 6 }
    var stopThreshold: Int { self == .matgo ? 7 : 3 }
}

enum AIDifficulty: String, Codable, CaseIterable, Identifiable {
    case easy
    case normal
    case hard
    case expert

    var id: String { rawValue }
    var title: String {
        switch self {
        case .easy: "쉬움"
        case .normal: "보통"
        case .hard: "어려움"
        case .expert: "초고수"
        }
    }
}

enum PlayerID: String, Codable, CaseIterable, Hashable {
    case human
    case computer
    case computerA
    case computerB

    var displayName: String {
        switch self {
        case .human: "나"
        case .computer: "조옥순"
        case .computerA: "정순이"
        case .computerB: "박영수"
        }
    }
}

enum CardKind: String, Codable {
    case bright
    case animal
    case ribbon
    case junk
    case doubleJunk

    var label: String {
        switch self {
        case .bright: "광"
        case .animal: "열끗"
        case .ribbon: "띠"
        case .junk: "피"
        case .doubleJunk: "쌍피"
        }
    }
}

struct HwatuCard: Codable, Identifiable, Hashable {
    let id: String
    let month: Int
    let kind: CardKind
    let name: String
    let tags: [String]

    var assetName: String {
        if id == "bonus-double" || id == "bonus-double-2" { return "bonus-double" }
        if id == "bonus-triple" { return "bonus-triple" }
        return "m" + String(format: "%02d", month) + "-" + String(format: "%02d", Int(id.suffix(2)) ?? 1)
    }
    var isBonus: Bool { month == 0 }
    var peeValue: Int {
        if id == "bonus-triple" { return 3 }
        return kind == .doubleJunk ? 2 : (kind == .junk ? 1 : 0)
    }
}

struct CapturedScore: Equatable {
    struct Line: Identifiable, Equatable {
        let id = UUID()
        let label: String
        let points: Int
    }
    let brightCount: Int
    let animalCount: Int
    let ribbonCount: Int
    let junkCount: Int
    let lines: [Line]
    var total: Int { lines.reduce(0) { $0 + $1.points } }
}

struct NativeSettlement: Codable {
    struct Step: Codable, Equatable {
        let label: String
        let formula: String
        let value: Int
    }

    struct LoserPayment: Codable, Equatable {
        let loser: PlayerID
        let payer: PlayerID
        let points: Int
        let baks: [String]
    }

    let finalScore: Int
    let pointValue: Int
    let displayAmount: Int64
    let baseScore: Int
    let goCount: Int
    let shakeMultiplier: Int?
    let bakMultiplier: Int?
    let baks: [String]?
    let missionMultiplier: Int?
    let goBonus: Int?
    let goMultiplier: Int?
    let roundMultiplier: Int?
    let paymentExempt: Bool?
    let paymentExemptReason: String?
    let steps: [Step]?
    let loserPayments: [LoserPayment]?
    let dokbakPlayer: PlayerID?
    let pointDeltas: [String: Int]?
}

struct NativeGameSnapshot: Codable {
    var stateVersion: Int
    let gameUuid: String
    let gameMode: String
    let turnNumber: Int
    let pointValue: Int
    let computerDifficulty: AIDifficulty?
    let phase: String
    let currentPlayer: PlayerID
    let humanHand: [String]
    let computerHand: [String]
    let computerAHand: [String]?
    let computerBHand: [String]?
    let floorCards: [String]
    let drawPile: [String]
    let humanCaptured: [String]
    let computerCaptured: [String]
    let computerACaptured: [String]?
    let computerBCaptured: [String]?
    let humanGoCount: Int
    let computerGoCount: Int
    let computerAGoCount: Int?
    let computerBGoCount: Int?
    let winner: PlayerID?
    let roundResult: String?
    let settlement: NativeSettlement?
    let lastAction: String
    let createdAt: String
    let shakeCounts: [String: Int]?
    let bombCounts: [String: Int]?
    let bombSkips: [String: Int]?
    let gookjinAsPee: [String: Bool]?
    let shakenMonths: [String: [Int]]?
    let missionCardIds: [String]?
    let ppeokCounts: [String: Int]?
    let ppeokOwners: [String: String]?
    var roundMultiplier: Int? = nil
    var lastDiscardedCardId: String? = nil
    var lastDiscardedBy: PlayerID? = nil
    var emptyCaptureStreaks: [String: Int]? = nil
    var turnCounts: [String: Int]? = nil
    var openingPpeokCounts: [String: Int]? = nil
    var interimPointDeltas: [String: Int]? = nil
    var lastGoPlayer: PlayerID? = nil
    var gookjinChoiceMade: [String: Bool]? = nil
    var startingPlayer: PlayerID? = nil
    var phasePlayer: PlayerID? = nil
    var pendingMatchState: NativePendingMatchState? = nil
    var stagedPairState: NativeStagedPairState? = nil
    var activePlayedCardId: String? = nil
    var pendingChongtongState: NativeChongtong? = nil
}

enum GameMoneySyncState: Equatable {
    case idle
    case syncing
    case synced
    case failed(String)

    var blocksRoundExit: Bool {
        if case .syncing = self { return true }
        return false
    }

    var message: String {
        switch self {
        case .idle: "게임머니 정산 대기"
        case .syncing: "서버와 게임머니를 동기화하는 중입니다."
        case .synced: "게임머니가 서버와 동기화되었습니다."
        case let .failed(message): "게임머니 동기화 실패: \(message)"
        }
    }
}

struct NativeMoneyTransfer: Equatable {
    let humanBefore: Int64
    let humanAfter: Int64
    let opponentBefore: Int64?
    let opponentAfter: Int64?
    let opponentRefillAfter: Int64?
    let amount: Int64
    let appliedNow: Bool
}

enum GamePhase: Equatable {
    case playing
    case awaitingGoStop(PlayerID)
    case awaitingChongtong(PlayerID)
    case ended
}

struct NativeChongtong: Identifiable, Equatable, Codable {
    let player: PlayerID
    let month: Int
    let cards: [HwatuCard]
    var id: String { "\(player.rawValue)-\(month)" }
}

struct NativeCardMotion: Identifiable, Equatable {
    enum Kind { case played, drawn, bomb, replacement }
    let id = UUID()
    let card: HwatuCard
    let player: PlayerID
    let kind: Kind
    let delayMilliseconds: Int

    init(card: HwatuCard, player: PlayerID, kind: Kind, delayMilliseconds: Int = 0) {
        self.card = card
        self.player = player
        self.kind = kind
        self.delayMilliseconds = delayMilliseconds
    }
}

struct NativeRuleEvent: Identifiable, Equatable {
    enum Kind: String, Codable {
        case bonus, ppeok, selfPpeok, ppeokCapture, jjok, ttadak, sweep, bomb, nuclearBomb, shake, chongtong, emptyCapture
    }

    let id = UUID()
    let kind: Kind
    let label: String
    let player: PlayerID
    let stolenPee: [HwatuCard]
}

struct PendingMatch: Identifiable {
    enum Stage: String, Codable { case played, drawn }
    let id = UUID()
    let card: HwatuCard
    let candidates: [HwatuCard]
    let player: PlayerID
    let stage: Stage
}
