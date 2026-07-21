import XCTest
@testable import FamilyHwatu

final class GookjinParityTests: XCTestCase {
    func testGookjinMovesBetweenAnimalAndPeeGroupsWithWebCounts() throws {
        let cards = try ["m09-01", "m02-01", "m01-03"].map { try XCTUnwrap(HwatuDeck.byID[$0]) }
        let animalSections = NativeCapturedCardGrouping.sections(cards: cards, gookjinAsPee: false)
        XCTAssertTrue(animalSections.first(where: { $0.group == .animal })?.cards.contains(where: { $0.id == "m09-01" }) == true)
        XCTAssertEqual(animalSections.first(where: { $0.group == .junk })?.displayedCount, 1)

        let peeSections = NativeCapturedCardGrouping.sections(cards: cards, gookjinAsPee: true)
        XCTAssertFalse(peeSections.first(where: { $0.group == .animal })?.cards.contains(where: { $0.id == "m09-01" }) == true)
        XCTAssertTrue(peeSections.first(where: { $0.group == .junk })?.cards.contains(where: { $0.id == "m09-01" }) == true)
        XCTAssertEqual(peeSections.first(where: { $0.group == .junk })?.displayedCount, 3)
    }

    func testGookjinScoringMatchesSharedRuleVector() {
        let ids = [
            "m09-01", "m02-01", "m04-01", "m05-01", "m06-01",
            "m01-03", "m01-04", "m02-03", "m02-04", "m03-03", "m03-04", "m04-03", "m04-04"
        ]
        let score = HwatuScoring.score(ids.compactMap { HwatuDeck.byID[$0] }, gookjinAsPee: true)
        XCTAssertEqual(score.total, 1)
        XCTAssertEqual(score.animalCount, 4)
        XCTAssertEqual(score.junkCount, 10)
        XCTAssertEqual(score.lines.map(\.label), ["피"])
    }

    func testCapturedRackUsesWebFlexGrowAndMaximumGroupWidths() {
        let gap = NativeCapturedRackLayout.gap(for: 837.421875)
        let widths = NativeCapturedRackLayout.groupWidths(
            cardCounts: [3, 4, 3, 11],
            rackWidth: 837.421875,
            gap: gap
        )

        XCTAssertEqual(gap, 11.5145, accuracy: 0.02)
        XCTAssertEqual(widths[0], 168.86, accuracy: 0.15)
        XCTAssertEqual(widths[1], 225.15, accuracy: 0.15)
        XCTAssertEqual(widths[2], 168.86, accuracy: 0.15)
        XCTAssertEqual(widths[3], 240, accuracy: 0.001)
    }

    func testAutomaticChoiceUsesDoublePeeWhenScoresAreTiedLikeWeb() throws {
        let gookjin = try XCTUnwrap(HwatuDeck.byID["m09-01"])
        XCTAssertEqual(HwatuScoring.score([gookjin], gookjinAsPee: false).total, 0)
        XCTAssertEqual(HwatuScoring.score([gookjin], gookjinAsPee: true).total, 0)
        XCTAssertTrue(HwatuScoring.prefersGookjinAsPee([gookjin]))
    }

    @MainActor
    func testFinalGookjinChoiceRecalculatesNagariIntoSettlement() {
        let winningCards = [
            "m01-01", "m03-01", "m08-01",
            "m01-02", "m02-02", "m03-02",
            "m01-03", "m01-04", "m02-03", "m02-04", "m03-03", "m03-04", "m04-03", "m04-04",
            "m09-01"
        ]
        let session = GameSession(snapshot: snapshot(phase: "round-ended", captured: winningCards))
        session.setGookjin(for: .human, asPee: true)
        XCTAssertEqual(session.winner, .human)
        XCTAssertGreaterThanOrEqual(session.settlement?.finalScore ?? 0, 7)
        XCTAssertTrue(session.lastAction.contains("국진을 쌍피로 바꿔 피 묶음으로 옮겼습니다."))
    }

    @MainActor
    func testChoiceActionTextMatchesWebForBothGroups() {
        let session = GameSession(snapshot: snapshot(phase: "playing", captured: ["m09-01"], activeCards: true))
        session.setGookjin(for: .human, asPee: true)
        XCTAssertEqual(session.lastAction, "국진을 쌍피로 바꿔 피 묶음으로 옮겼습니다.")
        session.setGookjin(for: .human, asPee: false)
        XCTAssertEqual(session.lastAction, "국진을 열끗으로 바꿔 열끗 묶음으로 옮겼습니다.")
    }

    private func snapshot(phase: String, captured: [String], activeCards: Bool = false) -> NativeGameSnapshot {
        NativeGameSnapshot(
            stateVersion: 1, gameUuid: UUID().uuidString, gameMode: "matgo", turnNumber: 1,
            pointValue: 100, computerDifficulty: .normal, phase: phase, currentPlayer: .human,
            humanHand: activeCards ? ["m05-03"] : [], computerHand: activeCards ? ["m06-03"] : [],
            computerAHand: nil, computerBHand: nil, floorCards: [], drawPile: activeCards ? ["m07-03"] : [],
            humanCaptured: captured, computerCaptured: [], computerACaptured: nil, computerBCaptured: nil,
            humanGoCount: 0, computerGoCount: 0, computerAGoCount: nil, computerBGoCount: nil,
            winner: nil, roundResult: phase == "round-ended" ? "nagari" : nil, settlement: nil,
            lastAction: "테스트", createdAt: ISO8601DateFormatter().string(from: Date()),
            shakeCounts: nil, bombCounts: nil, bombSkips: nil, gookjinAsPee: nil, shakenMonths: nil,
            missionCardIds: ["m07-01", "m08-01", "m09-01"], ppeokCounts: nil, ppeokOwners: nil,
            gookjinChoiceMade: [PlayerID.human.rawValue: false]
        )
    }
}
