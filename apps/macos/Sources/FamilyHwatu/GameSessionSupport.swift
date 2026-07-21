import Foundation

extension GameSession {
    var nextRoundMultiplier: Int { winner == nil ? (mode == .matgo ? min(8, roundMultiplier * 2) : 2) : 1 }
    var nextStartingPlayer: PlayerID { winner ?? startingPlayer }

    func missionCaptureCount(for player: PlayerID) -> Int {
        let capturedIds = Set((captured[player] ?? []).map(\.id))
        return missionCards.filter { capturedIds.contains($0.id) }.count
    }

    func missionMultiplier(for player: PlayerID) -> Int {
        mode == .matgo ? 1 << missionCaptureCount(for: player) : 1
    }

    func cardPriority(_ card: HwatuCard) -> Int {
        switch card.kind {
        case .bright: 8
        case .animal: 5
        case .ribbon: 4
        case .doubleJunk: 3
        case .junk: 1
        }
    }

    func ids(_ cards: [HwatuCard]?) -> [String] { (cards ?? []).map(\.id) }

    func stringDictionary<T>(_ source: [PlayerID: T]) -> [String: T] {
        Dictionary(uniqueKeysWithValues: source.map { ($0.key.rawValue, $0.value) })
    }

    static func playerDictionary<T>(_ source: [String: T]?) -> [PlayerID: T] {
        Dictionary(uniqueKeysWithValues: (source ?? [:]).compactMap { key, value in
            PlayerID(rawValue: key).map { ($0, value) }
        })
    }

    static func makeMission(gameUuid: String) -> [HwatuCard] {
        let available = HwatuDeck.cards.filter { !$0.isBonus }
        var state = gameUuid.unicodeScalars.reduce(UInt64(0xcbf29ce484222325)) {
            ($0 ^ UInt64($1.value)) &* 0x100000001b3
        }
        var result: [HwatuCard] = []
        while result.count < 3 {
            state = state &* 6_364_136_223_846_793_005 &+ 1_442_695_040_888_963_407
            let card = available[Int(state % UInt64(available.count))]
            if !result.contains(card) { result.append(card) }
        }
        return result
    }
}
