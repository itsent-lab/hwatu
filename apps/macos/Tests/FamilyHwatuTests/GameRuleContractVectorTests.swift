import XCTest
@testable import FamilyHwatu

final class GameRuleContractVectorTests: XCTestCase {
    func testEverySharedGameRuleVectorThroughNativeRuleModules() throws {
        let data = try Data(contentsOf: contractURL())
        let document = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(document["contract"] as? String, "family-hwatu-game-rule-vectors")
        XCTAssertEqual(number(document["version"]), 1)
        let cases = try XCTUnwrap(document["cases"] as? [[String: Any]])
        XCTAssertFalse(cases.isEmpty)

        for vector in cases {
            let identifier = vector["id"] as? String ?? "unknown"
            try XCTContext.runActivity(named: identifier) { _ in
                let actual = try run(vector)
                let expected = try dictionary(vector["expected"])
                assertSubset(actual: actual, expected: expected, path: identifier)
            }
        }
    }

    private func run(_ vector: [String: Any]) throws -> [String: Any] {
        let operation = try XCTUnwrap(vector["operation"] as? String)
        let input = try dictionary(vector["input"])
        switch operation {
        case "captured-score": return try capturedScore(input)
        case "matgo-settlement": return try matgoSettlement(input)
        case "gostop-settlement": return try gostopSettlement(input)
        case "gostop-balance": return try gostopBalance(input)
        default:
            XCTFail("지원하지 않는 공통 규칙 연산입니다: \(operation)")
            return [:]
        }
    }

    private func capturedScore(_ input: [String: Any]) throws -> [String: Any] {
        let identifiers = try XCTUnwrap(input["cards"] as? [String])
        let cards = identifiers.compactMap { HwatuDeck.byID[$0] }
        XCTAssertEqual(cards.count, identifiers.count)
        let gookjin = boolean(input["gookjinAsDoubleJunk"])
        let score = HwatuScoring.score(cards, gookjinAsPee: gookjin)
        return [
            "total": score.total,
            "brightCount": score.brightCount,
            "animalCount": score.animalCount,
            "ribbonCount": score.ribbonCount,
            "junkCount": score.junkCount,
            "hasRainBright": cards.contains { $0.kind == .bright && $0.tags.contains("rain") },
            "gookjinAsDoubleJunk": gookjin,
            "lines": score.lines.map { ["code": lineCode($0.label), "points": $0.points] }
        ]
    }

    private func matgoSettlement(_ input: [String: Any]) throws -> [String: Any] {
        let winnerCards = try XCTUnwrap(input["winnerCards"] as? [String]).compactMap { HwatuDeck.byID[$0] }
        let loserIdentifiers = try XCTUnwrap(input["loserCards"] as? [String])
        let loserCards = loserIdentifiers.compactMap { HwatuDeck.byID[$0] }
        let result = NativeSpecialRules.settlement(
            winnerScore: HwatuScoring.score(winnerCards),
            loserScores: [HwatuScoring.score(loserCards)],
            goCount: number(input["winnerGoCount"]),
            loserGoCounts: [number(input["loserGoCount"])],
            shakeCount: number(input["winnerShakeCount"]),
            mode: .matgo,
            pointValue: number(input["pointValue"]),
            missionMultiplier: max(1, number(input["winnerMissionMultiplier"])),
            roundMultiplier: max(1, number(input["roundMultiplier"])),
            loserCapturedCounts: input["loserCapturedCount"] == nil ? [] : [number(input["loserCapturedCount"])]
        )
        return compact([
            "baseScore": result.baseScore,
            "finalScore": result.finalScore,
            "displayAmount": result.displayAmount,
            "goBonus": result.goBonus,
            "goMultiplier": result.goMultiplier,
            "shakeMultiplier": result.shakeMultiplier,
            "bakMultiplier": result.bakMultiplier,
            "missionMultiplier": result.missionMultiplier,
            "roundMultiplier": result.roundMultiplier,
            "paymentExempt": result.paymentExempt,
            "bakCodes": (result.baks ?? []).map(bakCode)
        ])
    }

    private func gostopSettlement(_ input: [String: Any]) throws -> [String: Any] {
        let winner = try XCTUnwrap(PlayerID(rawValue: try XCTUnwrap(input["winner"] as? String)))
        let source = try dictionary(input["players"])
        let players = try Dictionary(uniqueKeysWithValues: GameMode.gostop.players.map { player in
            (player, try playerState(source[player.rawValue]))
        })
        let losers = GameMode.gostop.players.filter { $0 != winner }
        let winnerState = try XCTUnwrap(players[winner])
        let lastGoPlayer = (input["lastGoPlayer"] as? String).flatMap(PlayerID.init(rawValue:))
        let interimSource = try dictionary(input["interimPointDeltas"])
        let interim = Dictionary(uniqueKeysWithValues: GameMode.gostop.players.map { ($0, number(interimSource[$0.rawValue])) })
        let result = NativeSpecialRules.settlement(
            winnerScore: winnerState.score,
            loserScores: losers.compactMap { players[$0]?.score },
            goCount: winnerState.goCount,
            loserGoCounts: losers.map { players[$0]?.goCount ?? 0 },
            shakeCount: winnerState.shakeCount + winnerState.bombCount,
            mode: .gostop,
            pointValue: 1,
            roundMultiplier: max(1, number(input["roundMultiplier"])),
            loserPlayers: losers,
            scoreAtLastGo: Dictionary(uniqueKeysWithValues: players.map { ($0.key, $0.value.scoreAtLastGo) }),
            lastGoPlayer: lastGoPlayer,
            interimPointDeltas: interim
        )
        let shakeBomb = 1 << (winnerState.shakeCount + winnerState.bombCount)
        let meongtta = winnerState.score.animalCount >= 7 ? 2 : 1
        XCTAssertEqual(result.shakeMultiplier, shakeBomb * meongtta)
        return compact([
            "baseScore": result.baseScore,
            "goBonus": result.goBonus,
            "goMultiplier": result.goMultiplier,
            "shakeBombMultiplier": shakeBomb,
            "meongttaMultiplier": meongtta,
            "roundMultiplier": result.roundMultiplier,
            "commonScore": result.finalScore,
            "dokbakPlayer": result.dokbakPlayer?.rawValue,
            "loserPayments": (result.loserPayments ?? []).map { payment in
                ["loser": payment.loser.rawValue, "payer": payment.payer.rawValue, "points": payment.points, "baks": payment.baks.map(bakCode)]
            },
            "pointDeltas": result.pointDeltas ?? [:]
        ])
    }

    private func gostopBalance(_ input: [String: Any]) throws -> [String: Any] {
        let balancesSource = try dictionary(input["balances"])
        let deltasSource = try dictionary(input["pointDeltas"])
        let balances = Dictionary(uniqueKeysWithValues: GameMode.gostop.players.map { ($0, Int64(number(balancesSource[$0.rawValue]))) })
        let deltas = Dictionary(uniqueKeysWithValues: GameMode.gostop.players.map { ($0, number(deltasSource[$0.rawValue])) })
        let result = NativeGostopMoney.settlePointDeltas(balances: balances, pointDeltas: deltas, pointValue: number(input["pointValue"]))
        return Dictionary(uniqueKeysWithValues: result.map { ($0.key.rawValue, $0.value) })
    }

    private struct GostopPlayerState {
        let score: CapturedScore
        let goCount: Int
        let scoreAtLastGo: Int
        let shakeCount: Int
        let bombCount: Int
    }

    private func playerState(_ value: Any?) throws -> GostopPlayerState {
        let source = try dictionary(value)
        let scoreSource = try dictionary(source["score"])
        let total = number(scoreSource["total"])
        return GostopPlayerState(
            score: CapturedScore(
                brightCount: number(scoreSource["brightCount"]),
                animalCount: number(scoreSource["animalCount"]),
                ribbonCount: number(scoreSource["ribbonCount"]),
                junkCount: number(scoreSource["junkCount"]),
                lines: total == 0 ? [] : [.init(label: "계약", points: total)]
            ),
            goCount: number(source["goCount"]),
            scoreAtLastGo: number(source["scoreAtLastGo"]),
            shakeCount: number(source["shakeCount"]),
            bombCount: number(source["bombCount"])
        )
    }

    private func assertSubset(actual: Any, expected: Any, path: String) {
        if let expected = expected as? [String: Any] {
            guard let actual = actual as? [String: Any] else { XCTFail("\(path): 객체가 아닙니다."); return }
            for (key, value) in expected {
                guard let actualValue = actual[key] else { XCTFail("\(path).\(key): 값이 없습니다."); continue }
                assertSubset(actual: actualValue, expected: value, path: "\(path).\(key)")
            }
        } else if let expected = expected as? [Any] {
            guard let actual = actual as? [Any] else { XCTFail("\(path): 배열이 아닙니다."); return }
            XCTAssertEqual(actual.count, expected.count, path)
            for index in 0..<min(actual.count, expected.count) {
                assertSubset(actual: actual[index], expected: expected[index], path: "\(path)[\(index)]")
            }
        } else if expected is NSNull {
            XCTAssertTrue(actual is NSNull, path)
        } else if let expected = expected as? NSNumber, let actual = actual as? NSNumber {
            XCTAssertEqual(actual.doubleValue, expected.doubleValue, path)
        } else if let expected = expected as? String, let actual = actual as? String {
            XCTAssertEqual(actual, expected, path)
        } else {
            XCTFail("\(path): 비교할 수 없는 값입니다. actual=\(actual), expected=\(expected)")
        }
    }

    private func contractURL() -> URL {
        var root = URL(fileURLWithPath: #filePath)
        for _ in 0..<5 { root.deleteLastPathComponent() }
        return root.appendingPathComponent("shared/contracts/game-rule-vectors-v1.json")
    }

    private func dictionary(_ value: Any?) throws -> [String: Any] {
        try XCTUnwrap(value as? [String: Any])
    }

    private func number(_ value: Any?) -> Int { (value as? NSNumber)?.intValue ?? 0 }
    private func boolean(_ value: Any?) -> Bool { (value as? NSNumber)?.boolValue ?? false }
    private func compact(_ source: [String: Any?]) -> [String: Any] { source.compactMapValues { $0 } }

    private func lineCode(_ label: String) -> String {
        if label.contains("광") { return "bright" }
        if label == "고도리" { return "godori" }
        if label == "피" { return "junk" }
        if label == "열끗" { return "animal" }
        return "ribbon"
    }

    private func bakCode(_ label: String) -> String {
        switch label { case "피박": "pi-bak"; case "광박": "gwang-bak"; case "멍박": "meong-bak"; default: "go-bak" }
    }
}
