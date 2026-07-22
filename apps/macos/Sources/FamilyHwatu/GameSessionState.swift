import Foundation

struct NativeStagedPair {
    let newCard: HwatuCard
    let floorCard: HwatuCard
    let player: PlayerID
}

struct NativePendingMatchState: Codable {
    let cardId: String
    let candidateIds: [String]
    let player: PlayerID
    let stage: PendingMatch.Stage
}

struct NativeStagedPairState: Codable {
    let newCardId: String
    let floorCardId: String
    let player: PlayerID
}

extension GamePhase {
    init(snapshotName: String, player: PlayerID?) {
        switch snapshotName {
        case "round-ended": self = .ended
        case "awaiting-go-stop": self = .awaitingGoStop(player ?? .human)
        case "awaiting-chongtong": self = .awaitingChongtong(player ?? .human)
        default: self = .playing
        }
    }

    var snapshotName: String {
        switch self { case .playing: "playing"; case .awaitingGoStop: "awaiting-go-stop"; case .awaitingChongtong: "awaiting-chongtong"; case .ended: "round-ended" }
    }

    var snapshotPlayer: PlayerID? {
        switch self { case let .awaitingGoStop(player), let .awaitingChongtong(player): player; default: nil }
    }
}

extension GameSession {
    var automaticPlayTaskStateKey: String {
        [
            String(turnNumber), phase.snapshotName, phase.snapshotPlayer?.rawValue ?? "",
            currentPlayer.rawValue, pendingMatch?.id.uuidString ?? "", pendingChongtong?.id ?? "",
            humanHand.map(\.id).joined(separator: ",")
        ].joined(separator: "|")
    }
}

struct NativeGameUndoState {
    let hands: [PlayerID: [HwatuCard]]
    let captured: [PlayerID: [HwatuCard]]
    let floorCards: [HwatuCard]
    let drawPile: [HwatuCard]
    let currentPlayer: PlayerID
    let phase: GamePhase
    let turnNumber: Int
    let lastAction: String
    let goCounts: [PlayerID: Int]
    let scoreAtLastGo: [PlayerID: Int]
    let winner: PlayerID?
    let settlement: NativeSettlement?
    let specialNotice: String?
    let shakeCounts: [PlayerID: Int]
    let bombCounts: [PlayerID: Int]
    let bombSkips: [PlayerID: Int]
    let gookjinAsPee: [PlayerID: Bool]
    let shakenMonths: [PlayerID: Set<Int>]
    let ppeokCounts: [PlayerID: Int]
    let ppeokOwners: [Int: PlayerID]
    let emptyCaptureStreaks: [PlayerID: Int]
    let turnCounts: [PlayerID: Int]
    let openingPpeokCounts: [PlayerID: Int]
    let openingPpeokTotals: [PlayerID: Int]
    let sweepCounts: [PlayerID: Int]
    let interimPointDeltas: [PlayerID: Int]
    let lastGoPlayer: PlayerID?
    let gookjinChoiceMade: [PlayerID: Bool]
    let lastDiscardedCardId: String?
    let lastDiscardedBy: PlayerID?
}
