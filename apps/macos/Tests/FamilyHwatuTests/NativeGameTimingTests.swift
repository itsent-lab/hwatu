import XCTest
@testable import FamilyHwatu

final class NativeGameTimingTests: XCTestCase {
    func testOpeningAndAutomaticPlayTimingsMatchWebContracts() {
        XCTAssertEqual(NativeGameTiming.dealerRevealMilliseconds, 1_800)
        XCTAssertEqual(NativeGameTiming.dealMilliseconds(for: .matgo), 1_700)
        XCTAssertEqual(NativeGameTiming.dealMilliseconds(for: .gostop), 1_550)
        XCTAssertEqual(NativeGameTiming.automaticHumanMilliseconds(for: .matgo), 1_200)
        XCTAssertEqual(NativeGameTiming.automaticHumanMilliseconds(for: .gostop), 1_300)
        XCTAssertEqual(NativeGameTiming.matgoRoundResultMilliseconds, 2_200)
        XCTAssertEqual(NativeGameTiming.resultSoundMilliseconds, 520)
        XCTAssertEqual(NativeGameTiming.peeTransferCardMilliseconds, 360)
    }

    func testCardFlightAndComputerTurnTimingsMatchEachWebMode() {
        XCTAssertEqual(NativeGameTiming.cardFlightMilliseconds(for: .matgo, kind: .played), 320)
        XCTAssertEqual(NativeGameTiming.cardFlightMilliseconds(for: .matgo, kind: .played, player: .computer), 360)
        XCTAssertEqual(NativeGameTiming.cardFlightMilliseconds(for: .matgo, kind: .drawn), 260)
        XCTAssertEqual(NativeGameTiming.cardFlightMilliseconds(for: .matgo, kind: .bomb), 360)
        XCTAssertEqual(NativeGameTiming.cardFlightMilliseconds(for: .matgo, kind: .replacement), 240)
        XCTAssertEqual(NativeGameTiming.cardFlightMilliseconds(for: .gostop, kind: .played), 280)
        XCTAssertEqual(NativeGameTiming.cardFlightMilliseconds(for: .gostop, kind: .drawn), 230)
        XCTAssertEqual(NativeGameTiming.cardFlightMilliseconds(for: .gostop, kind: .bomb), 280)
        XCTAssertEqual(NativeGameTiming.cardFlightMilliseconds(for: .gostop, kind: .replacement), 230)

        let matgoPlan = NativeAIThinkingPlan.make(
            difficulty: .normal,
            gameIdentifier: "timing-contract",
            turnNumber: 1,
            kind: .turn,
            automaticPlay: false
        )
        XCTAssertEqual(NativeGameTiming.aiMilliseconds(for: .matgo, plan: matgoPlan), matgoPlan.durationMilliseconds)
        XCTAssertEqual(NativeGameTiming.aiMilliseconds(for: .gostop, plan: matgoPlan), 1_700)
    }

    @MainActor
    func testSequentialGostopCardFlightsKeepTurnInputBlockedUntilBothFinish() async {
        let session = GameSession(mode: .gostop, pointValue: 100)
        let card = HwatuDeck.cards[0]
        let played = session.scheduleCardMotion(card: card, kind: .played)
        let drawn = session.scheduleCardMotion(card: card, kind: .drawn)
        XCTAssertEqual(played.delayMilliseconds, 0)
        XCTAssertTrue((250...280).contains(drawn.delayMilliseconds))
        XCTAssertTrue(session.isTurnTransitioning)

        try? await Task.sleep(for: .milliseconds(350))
        XCTAssertTrue(session.isTurnTransitioning)
        try? await Task.sleep(for: .milliseconds(220))
        XCTAssertFalse(session.isTurnTransitioning)
    }
}
