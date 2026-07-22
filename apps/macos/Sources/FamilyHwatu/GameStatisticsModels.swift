import Foundation

struct MatchStatistics: Codable, Equatable {
    let version: Int
    let goCount: Int
    let sweepCount: Int
    let bombCount: Int
    let shakeCount: Int
    let ppeokCount: Int
    let openingPpeokCount: Int
    let threePpeokWin: Bool
    let piBakWin: Bool
    let gwangBakWin: Bool
}

struct GameModeStatistics: Decodable, Equatable {
    let gameMode: String
    let totalGames: Int
    let wins: Int
    let losses: Int
    let nagari: Int
    let winRate: Double
    let highestScore: Int
    let longestWinStreak: Int
    let currentWinStreak: Int
    let totalSettlement: Int64
    let biggestWinAmount: Int64
    let recentResults: [String]
    let specialStatsTrackedGames: Int
    let totalGoCount: Int
    let highestWinningGoCount: Int
    let totalSweepCount: Int
    let maxSweepCount: Int
    let totalBombCount: Int
    let maxBombCount: Int
    let totalShakeCount: Int
    let maxShakeCount: Int
    let totalPpeokCount: Int
    let maxPpeokCount: Int
    let openingPpeokCount: Int
    let threePpeokWins: Int
    let piBakWins: Int
    let gwangBakWins: Int
}

struct PlayerGameStatistics: Decodable, Equatable {
    let matgo: GameModeStatistics
    let gostop: GameModeStatistics

    func statistics(for mode: GameMode) -> GameModeStatistics {
        mode == .matgo ? matgo : gostop
    }
}

extension GameSession {
    var humanMatchStatistics: MatchStatistics {
        let humanWon = winner == .human
        let baks = humanWon
            ? (settlement?.loserPayments?.flatMap(\.baks) ?? settlement?.baks ?? [])
            : []
        return MatchStatistics(
            version: 1,
            goCount: goCounts[.human] ?? 0,
            sweepCount: sweepCounts[.human] ?? 0,
            bombCount: bombCounts[.human] ?? 0,
            shakeCount: shakeCounts[.human] ?? 0,
            ppeokCount: ppeokCounts[.human] ?? 0,
            openingPpeokCount: openingPpeokTotals[.human] ?? 0,
            threePpeokWin: humanWon && (ppeokCounts[.human] ?? 0) >= 3,
            piBakWin: baks.contains("피박"),
            gwangBakWin: baks.contains("광박")
        )
    }
}
