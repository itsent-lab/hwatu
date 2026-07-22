import XCTest
@testable import FamilyHwatu

final class GameStatisticsTests: XCTestCase {
    func testDashboardDecodesModeStatisticsFromServer() throws {
        let modeStatistics = """
        {
          "gameMode":"matgo","totalGames":42,"wins":26,"losses":13,"nagari":3,"winRate":66.7,
          "highestScore":128,"longestWinStreak":5,"currentWinStreak":2,
          "totalSettlement":45600,"biggestWinAmount":12800,"recentResults":["win","loss","nagari"],
          "specialStatsTrackedGames":9,"totalGoCount":12,"highestWinningGoCount":3,
          "totalSweepCount":4,"maxSweepCount":2,"totalBombCount":3,"maxBombCount":1,
          "totalShakeCount":5,"maxShakeCount":2,"totalPpeokCount":6,"maxPpeokCount":2,
          "openingPpeokCount":2,"threePpeokWins":1,"piBakWins":3,"gwangBakWins":2
        }
        """
        let gostopStatistics = modeStatistics.replacingOccurrences(of: "\"matgo\"", with: "\"gostop\"")
        let json = """
        {
          "user":{"id":7,"username":"tester","displayName":"테스터","role":"member","virtualBalance":500000},
          "activeSave":null,"today":{"games":2,"wins":1,"settlement":300},
          "gameStats":{"matgo":\(modeStatistics),"gostop":\(gostopStatistics)}
        }
        """

        let dashboard = try JSONDecoder().decode(DashboardData.self, from: Data(json.utf8))

        XCTAssertEqual(dashboard.gameStats?.matgo.winRate, 66.7)
        XCTAssertEqual(dashboard.gameStats?.matgo.recentResults, ["win", "loss", "nagari"])
        XCTAssertEqual(dashboard.gameStats?.statistics(for: .gostop).specialStatsTrackedGames, 9)
    }

    func testGostopSettlementKeepsVersionedStatisticsAndReadsLegacyQueueEntries() throws {
        let statistics = MatchStatistics(
            version: 1, goCount: 2, sweepCount: 1, bombCount: 1, shakeCount: 0,
            ppeokCount: 2, openingPpeokCount: 1, threePpeokWin: false,
            piBakWin: true, gwangBakWin: false
        )
        let request = GostopSettlementRequest(
            gameUuid: UUID().uuidString, winner: "human", finalScore: 6, pointValue: 100,
            roundResult: "win", humanPoints: 12, computerAPoints: -6, computerBPoints: -6,
            statistics: statistics
        )
        let restored = try JSONDecoder().decode(
            GostopSettlementRequest.self,
            from: JSONEncoder().encode(request)
        )
        XCTAssertEqual(restored.statistics, statistics)

        let legacy = """
        {"gameUuid":"\(UUID().uuidString)","winner":null,"finalScore":0,"pointValue":100,
         "roundResult":"nagari","humanPoints":0,"computerAPoints":0,"computerBPoints":0}
        """
        XCTAssertNil(try JSONDecoder().decode(GostopSettlementRequest.self, from: Data(legacy.utf8)).statistics)
    }
}
