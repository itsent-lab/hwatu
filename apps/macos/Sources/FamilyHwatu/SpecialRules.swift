import Foundation

struct NativeBombOption: Identifiable, Equatable {
    enum Kind: String {
        case twoCard = "두장폭탄"
        case threeCard = "폭탄"
        case fourCard = "4장 흔들기·폭탄"
    }

    let month: Int
    let handCards: [HwatuCard]
    let floorCards: [HwatuCard]
    let kind: Kind
    var id: String { "\(month)-\(kind.rawValue)" }
}

struct NativeShakeOption: Identifiable, Equatable {
    let month: Int
    let handCards: [HwatuCard]
    var id: Int { month }
}

enum NativeSpecialRules {
    static func ppeokDeclaration(count: Int) -> (notice: String, forcedBaseScore: Int?) {
        if count >= 3 { return ("삼연뻑!", 7) }
        if count == 2 { return ("연속뻑!", nil) }
        return ("뻑!", nil)
    }

    static func ppeokCaptureNotice(owner: PlayerID, captor: PlayerID) -> String {
        owner == captor ? "자뻑!" : "싼 패 먹기!"
    }

    static func bombOptions(hand: [HwatuCard], floor: [HwatuCard]) -> [NativeBombOption] {
        let handByMonth = Dictionary(grouping: hand.filter { !$0.isBonus }, by: \.month)
        let floorByMonth = Dictionary(grouping: floor.filter { !$0.isBonus }, by: \.month)
        return handByMonth.compactMap { month, handCards in
            let floorCards = floorByMonth[month] ?? []
            if handCards.count == 4, floorCards.isEmpty {
                return NativeBombOption(month: month, handCards: handCards, floorCards: [], kind: .fourCard)
            }
            if handCards.count == 3, floorCards.count == 1 {
                return NativeBombOption(month: month, handCards: handCards, floorCards: floorCards, kind: .threeCard)
            }
            if handCards.count == 2, floorCards.count == 2 {
                return NativeBombOption(month: month, handCards: handCards, floorCards: floorCards, kind: .twoCard)
            }
            return nil
        }
        .sorted { $0.month < $1.month }
    }

    static func shakeOptions(hand: [HwatuCard], floor: [HwatuCard], excluding months: Set<Int>) -> [NativeShakeOption] {
        let handByMonth = Dictionary(grouping: hand.filter { !$0.isBonus }, by: \.month)
        let floorMonths = Set(floor.filter { !$0.isBonus }.map(\.month))
        return handByMonth.compactMap { month, cards in
            guard cards.count >= 3, !floorMonths.contains(month), !months.contains(month) else { return nil }
            return NativeShakeOption(month: month, handCards: Array(cards.prefix(3)))
        }
        .sorted { $0.month < $1.month }
    }

    static func settlement(
        winnerScore: CapturedScore,
        loserScores: [CapturedScore],
        goCount: Int,
        loserGoCounts: [Int],
        shakeCount: Int,
        mode: GameMode,
        pointValue: Int,
        forcedBaseScore: Int? = nil,
        missionMultiplier: Int = 1,
        roundMultiplier: Int = 1,
        loserPlayers: [PlayerID] = [],
        loserCapturedCounts: [Int] = [],
        scoreAtLastGo: [PlayerID: Int] = [:],
        lastGoPlayer: PlayerID? = nil,
        interimPointDeltas: [PlayerID: Int] = [:],
        suppressMultipliers: Bool = false
    ) -> NativeSettlement {
        if mode == .gostop {
            return gostopSettlement(
                winnerScore: winnerScore,
                loserScores: loserScores,
                goCount: goCount,
                loserGoCounts: loserGoCounts,
                loserPlayers: loserPlayers,
                scoreAtLastGo: scoreAtLastGo,
                lastGoPlayer: lastGoPlayer,
                shakeCount: shakeCount,
                pointValue: pointValue,
                forcedBaseScore: forcedBaseScore,
                roundMultiplier: roundMultiplier,
                interimPointDeltas: interimPointDeltas,
                suppressMultipliers: suppressMultipliers
            )
        }
        let base = forcedBaseScore ?? winnerScore.total
        let goBonus = suppressMultipliers ? 0 : max(0, goCount)
        let goMultiplier = suppressMultipliers ? 1 : (goCount >= 3 ? powerOfTwo(goCount - 2) : 1)
        let scoreWithGo = (base + goBonus) * goMultiplier
        let shakeMultiplier = suppressMultipliers ? 1 : powerOfTwo(shakeCount)
        var baks: [String] = []
        let loser = loserScores.first
        if !suppressMultipliers, let loser {
            if winnerScore.junkCount >= 10 && (1...7).contains(loser.junkCount) { baks.append("피박") }
            if winnerScore.brightCount == 5 || (winnerScore.brightCount >= 3 && loser.brightCount == 0) { baks.append("광박") }
            if winnerScore.animalCount >= 7 { baks.append("멍박") }
            if (loserGoCounts.first ?? 0) > 0 { baks.append("고박") }
        }
        let bakMultiplier = powerOfTwo(baks.count)
        let mission = suppressMultipliers ? 1 : max(1, missionMultiplier)
        let scoreWithShake = scoreWithGo * shakeMultiplier
        let scoreWithMission = scoreWithShake * mission
        let scoreWithBaks = scoreWithMission * bakMultiplier
        let round = max(1, roundMultiplier)
        let finalScore = scoreWithBaks * round
        let paymentExempt = loserCapturedCounts.first == 0
        var steps = [
            NativeSettlement.Step(label: "기본점수", formula: "\(base)점", value: base),
            NativeSettlement.Step(label: "고 점수", formula: "\(base) + \(goBonus)", value: base + goBonus),
            NativeSettlement.Step(label: "고 배수", formula: "\(base + goBonus) × \(goMultiplier)", value: scoreWithGo),
            NativeSettlement.Step(label: "흔들기·폭탄", formula: "\(scoreWithGo) × \(shakeMultiplier)", value: scoreWithShake),
            NativeSettlement.Step(label: "미션 배수", formula: "\(scoreWithShake) × \(mission)", value: scoreWithMission),
            NativeSettlement.Step(label: "박 배수", formula: "\(scoreWithMission) × \(bakMultiplier)", value: scoreWithBaks)
        ]
        if round > 1 { steps.append(.init(label: "나가리 이월", formula: "\(scoreWithBaks) × \(round)", value: finalScore)) }
        return NativeSettlement(
            finalScore: finalScore,
            pointValue: pointValue,
            displayAmount: paymentExempt ? 0 : Int64(finalScore * pointValue),
            baseScore: base,
            goCount: goCount,
            shakeMultiplier: shakeMultiplier,
            bakMultiplier: bakMultiplier,
            baks: baks,
            missionMultiplier: mission,
            goBonus: goBonus,
            goMultiplier: goMultiplier,
            roundMultiplier: round,
            paymentExempt: paymentExempt,
            paymentExemptReason: paymentExempt ? "패자가 획득한 패가 없어 게임머니를 지급하지 않습니다." : nil,
            steps: steps,
            loserPayments: nil,
            dokbakPlayer: nil,
            pointDeltas: nil
        )
    }

    private static func gostopSettlement(
        winnerScore: CapturedScore,
        loserScores: [CapturedScore],
        goCount: Int,
        loserGoCounts: [Int],
        loserPlayers: [PlayerID],
        scoreAtLastGo: [PlayerID: Int],
        lastGoPlayer: PlayerID?,
        shakeCount: Int,
        pointValue: Int,
        forcedBaseScore: Int?,
        roundMultiplier: Int,
        interimPointDeltas: [PlayerID: Int],
        suppressMultipliers: Bool
    ) -> NativeSettlement {
        let base = forcedBaseScore ?? winnerScore.total
        let goBonus = suppressMultipliers ? 0 : max(0, goCount)
        let goMultiplier = suppressMultipliers ? 1 : (goCount >= 3 ? powerOfTwo(goCount - 2) : 1)
        let shakeMultiplier = suppressMultipliers ? 1 : powerOfTwo(shakeCount)
        let meongtta = !suppressMultipliers && winnerScore.animalCount >= 7 ? 2 : 1
        let round = max(1, roundMultiplier)
        let commonScore = (base + goBonus) * goMultiplier * shakeMultiplier * meongtta * round
        let resolvedLosers = loserPlayers.count == loserScores.count
            ? loserPlayers
            : Array([PlayerID.computerA, .computerB].prefix(loserScores.count))
        let dokbakPlayer: PlayerID? = {
            guard !suppressMultipliers,
                  let lastGoPlayer,
                  let index = resolvedLosers.firstIndex(of: lastGoPlayer),
                  loserGoCounts.indices.contains(index), loserScores.indices.contains(index),
                  loserGoCounts[index] > 0,
                  loserScores[index].total <= (scoreAtLastGo[lastGoPlayer] ?? 0) else { return nil }
            return lastGoPlayer
        }()
        let payments = loserScores.enumerated().map { index, loser -> NativeSettlement.LoserPayment in
            var baks: [String] = []
            if !suppressMultipliers && winnerScore.junkCount >= 10 && loser.junkCount <= 5 { baks.append("피박") }
            if !suppressMultipliers && winnerScore.brightCount >= 3 && loser.brightCount == 0 { baks.append("광박") }
            let loserID = resolvedLosers.indices.contains(index) ? resolvedLosers[index] : .computerA
            let payerID = dokbakPlayer ?? loserID
            return .init(loser: loserID, payer: payerID, points: commonScore * powerOfTwo(baks.count), baks: baks)
        }
        let allBaks = Array(Set(payments.flatMap(\.baks))).sorted()
        let winner = modeWinner(excluding: resolvedLosers)
        var pointDeltas = interimPointDeltas
        for player in GameMode.gostop.players { pointDeltas[player, default: 0] += 0 }
        for payment in payments {
            pointDeltas[payment.payer, default: 0] -= payment.points
            pointDeltas[winner, default: 0] += payment.points
        }
        let totalPoints = max(0, pointDeltas[winner] ?? 0)
        return NativeSettlement(
            finalScore: commonScore,
            pointValue: pointValue,
            displayAmount: Int64(totalPoints * pointValue),
            baseScore: base,
            goCount: goCount,
            shakeMultiplier: shakeMultiplier * meongtta,
            bakMultiplier: powerOfTwo(allBaks.count),
            baks: allBaks,
            missionMultiplier: 1,
            goBonus: goBonus,
            goMultiplier: goMultiplier,
            roundMultiplier: round,
            paymentExempt: false,
            paymentExemptReason: nil,
            steps: nil,
            loserPayments: payments,
            dokbakPlayer: dokbakPlayer,
            pointDeltas: Dictionary(uniqueKeysWithValues: pointDeltas.map { ($0.key.rawValue, $0.value) })
        )
    }

    private static func modeWinner(excluding losers: [PlayerID]) -> PlayerID {
        GameMode.gostop.players.first { !losers.contains($0) } ?? .human
    }

    private static func powerOfTwo(_ exponent: Int) -> Int {
        guard exponent > 0 else { return 1 }
        return 1 << exponent
    }
}
