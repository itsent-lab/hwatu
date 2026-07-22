import XCTest
@testable import FamilyHwatu

final class NativeRuleParityTests: XCTestCase {
    private func score(bright: Int = 0, animal: Int = 0, junk: Int = 0, points: Int) -> CapturedScore {
        CapturedScore(
            brightCount: bright,
            animalCount: animal,
            ribbonCount: 0,
            junkCount: junk,
            lines: points == 0 ? [] : [.init(label: "테스트", points: points)]
        )
    }

    @MainActor
    func testGostopUsesThreeBonusCardsAndKeepsAllFiftyOneCards() {
        let session = GameSession(mode: .gostop, pointValue: 100)
        let cards = session.hands.values.flatMap { $0 }
            + session.captured.values.flatMap { $0 }
            + session.floorCards
            + session.drawPile
        XCTAssertEqual(cards.count, 51)
        XCTAssertEqual(cards.filter(\.isBonus).count, 3)
        XCTAssertEqual(Set(cards.map(\.id)).count, 51)
    }

    func testMatgoZeroCapturedLoserIsPaymentExemptAndZeroJunkIsNotPiBak() {
        let result = NativeSpecialRules.settlement(
            winnerScore: score(bright: 0, animal: 0, junk: 10, points: 7),
            loserScores: [score(points: 0)],
            goCount: 0,
            loserGoCounts: [0],
            shakeCount: 0,
            mode: .matgo,
            pointValue: 1_000,
            loserCapturedCounts: [0]
        )
        XCTAssertEqual(result.baks, [])
        XCTAssertEqual(result.paymentExempt, true)
        XCTAssertEqual(result.displayAmount, 0)
    }

    func testMatgoSettlementKeepsWebCalculationOrderAndNagariMultiplier() {
        let result = NativeSpecialRules.settlement(
            winnerScore: score(bright: 3, animal: 7, junk: 10, points: 7),
            loserScores: [score(bright: 0, junk: 7, points: 0)],
            goCount: 3,
            loserGoCounts: [1],
            shakeCount: 1,
            mode: .matgo,
            pointValue: 100,
            missionMultiplier: 2,
            roundMultiplier: 4,
            loserCapturedCounts: [4]
        )
        XCTAssertEqual(result.finalScore, 5_120)
        XCTAssertEqual(result.steps?.map(\.label), ["기본점수", "고 점수", "고 배수", "흔들기·폭탄", "미션 배수", "박 배수", "나가리 이월"])
    }

    func testGostopSettlementAppliesPerLoserBakDokbakAndImmediateRewards() {
        let result = NativeSpecialRules.settlement(
            winnerScore: score(bright: 0, animal: 0, junk: 10, points: 3),
            loserScores: [score(junk: 5, points: 0), score(junk: 6, points: 0)],
            goCount: 0,
            loserGoCounts: [0, 1],
            shakeCount: 0,
            mode: .gostop,
            pointValue: 100,
            loserPlayers: [.computerA, .computerB],
            scoreAtLastGo: [.computerB: 0],
            lastGoPlayer: .computerB,
            interimPointDeltas: [.human: 6, .computerA: -3, .computerB: -3]
        )
        XCTAssertEqual(result.finalScore, 3)
        XCTAssertEqual(result.dokbakPlayer, .computerB)
        XCTAssertEqual(result.loserPayments?.map(\.payer), [.computerB, .computerB])
        XCTAssertEqual(result.loserPayments?.map(\.points), [6, 3])
        XCTAssertEqual(result.pointDeltas?[PlayerID.human.rawValue], 15)
        XCTAssertEqual(result.pointDeltas?[PlayerID.computerA.rawValue], -3)
        XCTAssertEqual(result.pointDeltas?[PlayerID.computerB.rawValue], -12)
        XCTAssertEqual(result.displayAmount, 1_500)
    }

    func testFourCardBombAndPendingSettlementPersistence() throws {
        let hand = ["m01-01", "m01-02", "m01-03", "m01-04"].compactMap { HwatuDeck.byID[$0] }
        XCTAssertEqual(NativeSpecialRules.bombOptions(hand: hand, floor: []).first?.kind, .fourCard)

        let suite = "FamilyHwatuTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("FamilyHwatuTests-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: root) }
        let store = PendingGostopSettlementStore(rootDirectory: root, legacyDefaults: defaults)
        let request = GostopSettlementRequest(
            gameUuid: UUID().uuidString,
            winner: "human",
            finalScore: 3,
            pointValue: 100,
            roundResult: "win",
            humanPoints: 6,
            computerAPoints: -3,
            computerBPoints: -3
        )
        try store.enqueue(request, userID: 7)
        try store.enqueue(request, userID: 7)
        XCTAssertEqual(try store.load(userID: 7), [request])
        try store.remove(gameUuid: request.gameUuid, userID: 7)
        XCTAssertTrue(try store.load(userID: 7).isEmpty)
    }

    @MainActor
    func testAutomaticPlayAndThinkingTimingMatchWebBehavior() {
        let session = GameSession(mode: .matgo, pointValue: 100, difficulty: .normal)
        session.setAutomaticPlayEnabled(true)
        XCTAssertTrue(session.automaticPlayEnabled)

        let automatic = NativeAIThinkingPlan.make(
            difficulty: .normal,
            gameIdentifier: "web-parity",
            turnNumber: 3,
            kind: .turn,
            automaticPlay: true
        )
        XCTAssertTrue((900...1_300).contains(automatic.durationMilliseconds))
        XCTAssertTrue(["낼 패를 고르는 중…", "한 수 더 살펴보는 중…"].contains(automatic.label))

        let decision = NativeAIThinkingPlan.make(
            difficulty: .expert,
            gameIdentifier: "web-parity",
            turnNumber: 3,
            kind: .goStop,
            automaticPlay: false
        )
        XCTAssertTrue((2_200...5_000).contains(decision.durationMilliseconds))
        XCTAssertEqual(decision.label, "고·스톱을 고민하는 중…")
    }

    @MainActor
    func testGostopBonusReplacementChangesAutomaticPlayTaskState() throws {
        let bonus = try XCTUnwrap(HwatuDeck.byID["bonus-double"])
        var deck = HwatuDeck.gostopCards
            .filter { $0.id != bonus.id }
            .sorted { ($0.id.suffix(2), $0.month, $0.id) < ($1.id.suffix(2), $1.month, $1.id) }
        deck.append(bonus)
        let session = GameSession(mode: .gostop, pointValue: 100, difficulty: .normal, deck: deck)

        XCTAssertEqual(session.phase, .playing)
        XCTAssertEqual(session.currentPlayer, .human)
        XCTAssertTrue(session.humanHand.contains(bonus))
        let taskStateBeforeBonus = session.automaticPlayTaskStateKey
        let turnBeforeBonus = session.turnNumber

        session.play(bonus)

        XCTAssertEqual(session.turnNumber, turnBeforeBonus)
        XCTAssertEqual(session.currentPlayer, .human)
        XCTAssertFalse(session.humanHand.contains(bonus))
        XCTAssertNotEqual(session.automaticPlayTaskStateKey, taskStateBeforeBonus)
    }

    func testDifficultyOrderDescriptionsAndCyclingMatchWeb() {
        XCTAssertEqual(AIDifficulty.allCases, [.easy, .normal, .hard, .expert])
        XCTAssertEqual(AIDifficulty.allCases.map(\.title), ["쉬움", "보통", "어려움", "초고수"])
        XCTAssertEqual(AIDifficulty.allCases.map(\.webDescription), [
            "가끔 실수하고 점수가 나면 대부분 멈춰요",
            "패와 상대 점수를 함께 살펴봐요",
            "확률과 족보, 폭탄 시점까지 계산해요",
            "위험 수까지 다시 계산하고 승리를 빠르게 확정해요"
        ])
        XCTAssertEqual(AIDifficulty.easy.nextWebDifficulty, .normal)
        XCTAssertEqual(AIDifficulty.normal.nextWebDifficulty, .hard)
        XCTAssertEqual(AIDifficulty.hard.nextWebDifficulty, .expert)
        XCTAssertEqual(AIDifficulty.expert.nextWebDifficulty, .easy)
    }

    func testMatgoAutoPlayAvailabilityMatchesWebInteractionRules() {
        XCTAssertTrue(MatgoAutoPlayAvailability.isDisabled(active: false, started: false, ended: false, dealing: false, hasPendingChoice: false))
        XCTAssertTrue(MatgoAutoPlayAvailability.isDisabled(active: false, started: true, ended: false, dealing: true, hasPendingChoice: false))
        XCTAssertTrue(MatgoAutoPlayAvailability.isDisabled(active: false, started: true, ended: false, dealing: false, hasPendingChoice: true))
        XCTAssertFalse(MatgoAutoPlayAvailability.isDisabled(active: false, started: true, ended: false, dealing: false, hasPendingChoice: false))
        XCTAssertFalse(MatgoAutoPlayAvailability.isDisabled(active: true, started: true, ended: false, dealing: true, hasPendingChoice: true))
        XCTAssertTrue(MatgoAutoPlayAvailability.isDisabled(active: true, started: true, ended: true, dealing: false, hasPendingChoice: false))
    }

    @MainActor
    func testCompleteRoundProcessReachesSettlementAndBuildsNextRoundConditions() {
        for mode in [GameMode.matgo, .gostop] {
            let deck = (mode == .matgo ? HwatuDeck.cards : HwatuDeck.gostopCards).sorted {
                let left = Int($0.id.suffix(2)) ?? 0
                let right = Int($1.id.suffix(2)) ?? 0
                return (left, $0.month, $0.id) < (right, $1.month, $1.id)
            }
            let session = GameSession(mode: mode, pointValue: 100, difficulty: .expert, deck: deck)
            var steps = 0
            while !session.isEnded && steps < 250 {
                session.playAutomaticStep()
                steps += 1
            }
            XCTAssertTrue(session.isEnded, "\(mode.title) 자동 진행이 판 종료에 도달해야 합니다.")
            XCTAssertGreaterThan(session.turnNumber, 0)
            if session.winner != nil {
                XCTAssertNotNil(session.settlement)
                if mode == .gostop {
                    XCTAssertEqual(session.pointDeltas.values.reduce(0, +), 0)
                }
                XCTAssertEqual(session.nextRoundMultiplier, 1)
                XCTAssertEqual(session.nextStartingPlayer, session.winner)
            } else {
                XCTAssertGreaterThan(session.nextRoundMultiplier, 1)
                XCTAssertEqual(session.nextStartingPlayer, session.startingPlayer)
            }
        }
    }
}
