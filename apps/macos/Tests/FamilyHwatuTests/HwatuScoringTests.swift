import XCTest
@testable import FamilyHwatu

final class HwatuScoringTests: XCTestCase {
    private var stableDealDeck: [HwatuCard] {
        HwatuDeck.cards.sorted {
            let leftIndex = Int($0.id.suffix(2)) ?? 0
            let rightIndex = Int($1.id.suffix(2)) ?? 0
            return (leftIndex, $0.month, $0.id) < (rightIndex, $1.month, $1.id)
        }
    }

    func testDeckHasFortyEightStandardAndTwoBonusCards() {
        XCTAssertEqual(HwatuDeck.cards.count, 50)
        XCTAssertEqual(HwatuDeck.cards.filter { !$0.isBonus }.count, 48)
        XCTAssertEqual(Set(HwatuDeck.cards.map(\.id)).count, 50)
    }

    func testGodoriAndAnimalPointsStack() {
        let ids = ["m02-01", "m04-01", "m08-02", "m05-01", "m06-01"]
        let cards = ids.compactMap { HwatuDeck.byID[$0] }
        let score = HwatuScoring.score(cards)
        XCTAssertEqual(score.animalCount, 5)
        XCTAssertEqual(score.lines.first(where: { $0.label == "열끗" })?.points, 1)
        XCTAssertEqual(score.lines.first(where: { $0.label == "고도리" })?.points, 5)
        XCTAssertEqual(score.total, 6)
    }

    func testRainBrightThreeScoresTwo() {
        let cards = ["m01-01", "m03-01", "m12-01"].compactMap { HwatuDeck.byID[$0] }
        XCTAssertEqual(HwatuScoring.score(cards).total, 2)
    }

    func testThreeGoDoublesMatgoScore() {
        XCTAssertEqual(HwatuScoring.finalScore(baseScore: 7, goCount: 3, mode: .matgo), 20)
        XCTAssertEqual(HwatuScoring.finalScore(baseScore: 3, goCount: 3, mode: .gostop), 6)
    }

    func testBombAndShakeOptionsMatchWebRules() {
        let threeCardHand = ["m01-01", "m01-02", "m01-03"].compactMap { HwatuDeck.byID[$0] }
        let oneCardFloor = ["m01-04"].compactMap { HwatuDeck.byID[$0] }
        let bomb = NativeSpecialRules.bombOptions(hand: threeCardHand, floor: oneCardFloor)
        XCTAssertEqual(bomb.first?.kind, .threeCard)
        XCTAssertEqual(bomb.first?.month, 1)

        let shake = NativeSpecialRules.shakeOptions(hand: threeCardHand, floor: [], excluding: [])
        XCTAssertEqual(shake.first?.month, 1)
        XCTAssertTrue(NativeSpecialRules.shakeOptions(hand: threeCardHand, floor: [], excluding: [1]).isEmpty)
    }

    func testPpeokDeclarationsAndCaptureLabelsMatchWebRules() {
        XCTAssertEqual(NativeSpecialRules.ppeokDeclaration(count: 1).notice, "뻑!")
        XCTAssertEqual(NativeSpecialRules.ppeokDeclaration(count: 2).notice, "연속뻑!")
        XCTAssertEqual(NativeSpecialRules.ppeokDeclaration(count: 3).forcedBaseScore, 7)
        XCTAssertEqual(NativeSpecialRules.ppeokCaptureNotice(owner: .human, captor: .human), "자뻑!")
        XCTAssertEqual(NativeSpecialRules.ppeokCaptureNotice(owner: .computer, captor: .human), "싼 패 먹기!")
    }

    @MainActor
    func testPlayedPairAndMatchingDrawCreatesPpeokPile() {
        let snapshot = NativeGameSnapshot(
            stateVersion: 1, gameUuid: UUID().uuidString, gameMode: "matgo", turnNumber: 0,
            pointValue: 100, computerDifficulty: .normal, phase: "playing", currentPlayer: .human,
            humanHand: ["m01-01", "m02-01"], computerHand: ["m03-01", "m04-01"],
            computerAHand: nil, computerBHand: nil, floorCards: ["m01-02", "m05-01"],
            drawPile: ["m06-01", "m01-03"], humanCaptured: [], computerCaptured: [],
            computerACaptured: nil, computerBCaptured: nil, humanGoCount: 0, computerGoCount: 0,
            computerAGoCount: nil, computerBGoCount: nil, winner: nil, roundResult: nil, settlement: nil,
            lastAction: "테스트", createdAt: ISO8601DateFormatter().string(from: Date()),
            shakeCounts: nil, bombCounts: nil, bombSkips: nil, gookjinAsPee: nil, shakenMonths: nil,
            missionCardIds: ["m07-01", "m08-01", "m09-01"], ppeokCounts: nil, ppeokOwners: nil
        )
        let session = GameSession(snapshot: snapshot)
        session.play(HwatuDeck.byID["m01-01"]!)
        XCTAssertEqual(session.ppeokCounts[.human], 1)
        XCTAssertEqual(session.openingPpeokTotals[.human], 1)
        XCTAssertEqual(session.specialNotice, "뻑!")
        let effect = NativeMatgoEffectFactory.specialDeclaration(for: session)
        XCTAssertEqual(effect?.kind, .ppeok)
        XCTAssertEqual(effect?.detail, "첫 번째 뻑 · 바닥에 세 장 남김")
        XCTAssertEqual(effect?.durationMilliseconds, 950)
        XCTAssertEqual(session.floorCards.filter { $0.month == 1 }.count, 3)
        let saved = session.snapshot()
        XCTAssertEqual(saved.humanPpeokCount, 1)
        XCTAssertEqual(saved.humanOpeningPpeokCount, 1)
        let resumed = GameSession(snapshot: saved)
        XCTAssertEqual(resumed.ppeokCounts[.human], 1)
        XCTAssertEqual(resumed.openingPpeokTotals[.human], 1)
    }

    func testMissionMultiplierParticipatesInSettlement() {
        let score = CapturedScore(brightCount: 0, animalCount: 0, ribbonCount: 0, junkCount: 0, lines: [.init(label: "기본", points: 7)])
        let result = NativeSpecialRules.settlement(
            winnerScore: score, loserScores: [], goCount: 0, loserGoCounts: [], shakeCount: 0,
            mode: .matgo, pointValue: 100, missionMultiplier: 4
        )
        XCTAssertEqual(result.finalScore, 28)
        XCTAssertEqual(result.missionMultiplier, 4)
    }

    func testSettlementAppliesGoShakeAndBakMultipliers() {
        let winner = CapturedScore(
            brightCount: 3,
            animalCount: 7,
            ribbonCount: 0,
            junkCount: 10,
            lines: [.init(label: "기본", points: 7)]
        )
        let loser = CapturedScore(brightCount: 0, animalCount: 0, ribbonCount: 0, junkCount: 7, lines: [])
        let result = NativeSpecialRules.settlement(
            winnerScore: winner,
            loserScores: [loser],
            goCount: 3,
            loserGoCounts: [1],
            shakeCount: 2,
            mode: .matgo,
            pointValue: 100
        )
        XCTAssertEqual(result.shakeMultiplier, 4)
        XCTAssertEqual(result.bakMultiplier, 16)
        XCTAssertEqual(result.baks, ["피박", "광박", "멍박", "고박"])
        XCTAssertEqual(result.finalScore, 1_280)
        XCTAssertEqual(result.displayAmount, 128_000)
    }

    func testChongtongCanForceSevenPointSettlement() {
        let emptyWinner = CapturedScore(brightCount: 0, animalCount: 0, ribbonCount: 0, junkCount: 0, lines: [])
        let safeLoser = CapturedScore(brightCount: 1, animalCount: 1, ribbonCount: 0, junkCount: 8, lines: [])
        let result = NativeSpecialRules.settlement(
            winnerScore: emptyWinner,
            loserScores: [safeLoser],
            goCount: 0,
            loserGoCounts: [0],
            shakeCount: 0,
            mode: .matgo,
            pointValue: 100,
            forcedBaseScore: 7
        )
        XCTAssertEqual(result.baseScore, 7)
        XCTAssertEqual(result.finalScore, 7)
    }

    @MainActor
    func testMatgoDealPreservesAllCards() {
        let session = GameSession(mode: .matgo, pointValue: 100)
        let allCards = session.hands.values.flatMap { $0 }
            + session.captured.values.flatMap { $0 }
            + session.floorCards
            + session.drawPile
        XCTAssertEqual(allCards.count, 50)
        XCTAssertEqual(Set(allCards.map(\.id)).count, 50)
        XCTAssertEqual(session.floorCards.filter { !$0.isBonus }.count, 8)
    }

    @MainActor
    func testDealerSelectionAndDifficultyAreApplied() {
        let session = GameSession(mode: .matgo, pointValue: 2_000, startingPlayer: .computer, difficulty: .expert, deck: stableDealDeck)
        XCTAssertEqual(session.currentPlayer, .computer)
        XCTAssertEqual(session.difficulty, .expert)
        XCTAssertEqual(session.snapshot().computerDifficulty, .expert)
        XCTAssertTrue(session.lastAction.contains("상대가 선"))
    }

    @MainActor
    func testHumanTurnCanBePlayedAndUndone() {
        let session = GameSession(mode: .matgo, pointValue: 100, startingPlayer: .human, difficulty: .normal, deck: stableDealDeck)
        let originalHand = session.humanHand.map(\.id)
        session.playSuggestedHumanCard()
        XCTAssertNotEqual(session.humanHand.map(\.id), originalHand)
        XCTAssertTrue(session.canUndo)
        session.undoLastHumanTurn()
        XCTAssertEqual(session.humanHand.map(\.id), originalHand)
        XCTAssertEqual(session.remainingUndos, 2)
        XCTAssertTrue(session.lastAction.contains("무르고"))
    }

    func testVerifiedCardResourceLoads() {
        XCTAssertNotNil(CardResource.image(named: "m01-01"))
    }

    @MainActor
    func testOriginalGameAudioResourcesAreBundled() throws {
        let deal = try XCTUnwrap(NativeGameSound.resourceURL(named: "deal", extension: "wav", subdirectory: "audio/effects"))
        let voice = try XCTUnwrap(NativeGameSound.resourceURL(named: "player-jjok", extension: "wav", subdirectory: "audio/voices"))
        let music = try XCTUnwrap(NativeGameSound.resourceURL(named: "gugak-bgm-133", extension: "mp3", subdirectory: "audio"))
        XCTAssertEqual(try Data(contentsOf: deal).count, 127_196)
        XCTAssertGreaterThan(try Data(contentsOf: voice).count, 1_000)
        XCTAssertEqual(try Data(contentsOf: music).count, 2_716_096)
    }
}
