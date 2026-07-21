import Foundation
import XCTest
@testable import FamilyHwatu

final class NativePersistenceTests: XCTestCase {
    @MainActor
    func testMatgoStateIsAtomicUserScopedMigratedAndMarkedSynced() throws {
        let root = temporaryRoot()
        defer { try? FileManager.default.removeItem(at: root) }
        let store = MatgoLocalStore(rootDirectory: root)
        var legacy = GameSession(mode: .matgo, pointValue: 100).snapshot()
        legacy.stateVersion = 1

        try store.save(legacy, userID: 7, pendingSync: true)
        let migrated = try XCTUnwrap(store.load(userID: 7))
        XCTAssertEqual(migrated.schemaVersion, 1)
        XCTAssertEqual(migrated.userId, 7)
        XCTAssertEqual(migrated.stateVersion, 3)
        XCTAssertEqual(migrated.state.stateVersion, 3)
        XCTAssertTrue(migrated.pendingSync)
        XCTAssertNil(try store.load(userID: 8))

        try store.markSynced(gameUuid: migrated.gameUuid, turnNumber: migrated.turnNumber, userID: 7)
        XCTAssertFalse(try XCTUnwrap(store.load(userID: 7)).pendingSync)
    }

    @MainActor
    func testFutureMatgoVersionAndDuplicateCardsAreRejected() throws {
        let store = MatgoLocalStore(rootDirectory: temporaryRoot())
        var future = GameSession(mode: .matgo, pointValue: 100).snapshot()
        future.stateVersion = 99
        XCTAssertThrowsError(try store.validate(future)) { error in
            XCTAssertEqual(error as? NativePersistenceError, .unsupportedStateVersion(99))
        }

        let valid = GameSession(mode: .matgo, pointValue: 100).snapshot()
        let invalid = duplicateFirstCard(in: valid)
        XCTAssertThrowsError(try store.validate(invalid))
    }

    func testCorruptMatgoRecordIsIsolatedInsteadOfDeleted() throws {
        let root = temporaryRoot()
        defer { try? FileManager.default.removeItem(at: root) }
        let directory = try NativeStoragePaths.userDirectory(root: root, userID: 3)
        try Data("not-json".utf8).write(to: directory.appendingPathComponent("matgo.json"), options: .atomic)
        let store = MatgoLocalStore(rootDirectory: root)

        XCTAssertThrowsError(try store.load(userID: 3))
        let names = try FileManager.default.contentsOfDirectory(atPath: directory.path)
        XCTAssertFalse(names.contains("matgo.json"))
        XCTAssertTrue(names.contains { $0.hasPrefix("matgo.corrupt-") && $0.hasSuffix(".json") })
    }

    func testGostopQueueNeverSilentlyDropsTheOldestSettlement() throws {
        let root = temporaryRoot()
        defer { try? FileManager.default.removeItem(at: root) }
        let store = PendingGostopSettlementStore(rootDirectory: root, legacyDefaults: nil)
        for index in 0..<20 { try store.enqueue(settlement(index), userID: 5) }
        XCTAssertEqual(try store.load(userID: 5).count, 20)

        XCTAssertThrowsError(try store.enqueue(settlement(20), userID: 5)) { error in
            XCTAssertEqual(error as? NativePersistenceError, .settlementQueueFull)
        }
        let values = try store.load(userID: 5)
        XCTAssertEqual(values.count, 20)
        XCTAssertEqual(values.first?.gameUuid, "game-0")
    }

    @MainActor
    func testPendingFloorChoiceIsIncludedInV3SnapshotAndRestored() throws {
        let session = GameSession(snapshot: pendingChoiceStartSnapshot())
        session.play(try XCTUnwrap(HwatuDeck.byID["m01-01"]))
        let pending = try XCTUnwrap(session.pendingMatch)
        let snapshot = session.snapshot()
        XCTAssertEqual(snapshot.stateVersion, 3)
        XCTAssertEqual(snapshot.pendingMatchState?.cardId, pending.card.id)
        XCTAssertNoThrow(try MatgoLocalStore(rootDirectory: temporaryRoot()).validate(snapshot))

        let restored = GameSession(snapshot: snapshot)
        XCTAssertEqual(restored.pendingMatch?.card.id, pending.card.id)
        XCTAssertEqual(restored.pendingMatch?.candidates.map(\.id), pending.candidates.map(\.id))
        XCTAssertFalse(restored.isHumanTurn)
    }

    private func settlement(_ index: Int) -> GostopSettlementRequest {
        .init(
            gameUuid: "game-\(index)", winner: "human", finalScore: 3, pointValue: 100,
            roundResult: "win", humanPoints: 6, computerAPoints: -3, computerBPoints: -3
        )
    }

    private func temporaryRoot() -> URL {
        FileManager.default.temporaryDirectory.appendingPathComponent("FamilyHwatuPersistenceTests-\(UUID().uuidString)")
    }

    private func pendingChoiceStartSnapshot() -> NativeGameSnapshot {
        let fixed = ["m01-01", "m01-02", "m01-03"]
        let remaining = HwatuDeck.cards.map(\.id).filter { !fixed.contains($0) }
        return NativeGameSnapshot(
            stateVersion: 3, gameUuid: UUID().uuidString, gameMode: "matgo", turnNumber: 0,
            pointValue: 100, computerDifficulty: .normal, phase: "playing", currentPlayer: .human,
            humanHand: [fixed[0]] + Array(remaining[0..<9]), computerHand: Array(remaining[9..<19]),
            computerAHand: nil, computerBHand: nil, floorCards: [fixed[1], fixed[2]] + Array(remaining[19..<25]),
            drawPile: Array(remaining[25...]), humanCaptured: [], computerCaptured: [], computerACaptured: nil,
            computerBCaptured: nil, humanGoCount: 0, computerGoCount: 0, computerAGoCount: nil,
            computerBGoCount: nil, winner: nil, roundResult: nil, settlement: nil, lastAction: "선택 전",
            createdAt: ISO8601DateFormatter().string(from: Date()), shakeCounts: nil, bombCounts: nil,
            bombSkips: nil, gookjinAsPee: nil, shakenMonths: nil, missionCardIds: [], ppeokCounts: nil,
            ppeokOwners: nil, startingPlayer: .human
        )
    }

    private func duplicateFirstCard(in source: NativeGameSnapshot) -> NativeGameSnapshot {
        NativeGameSnapshot(
            stateVersion: source.stateVersion, gameUuid: source.gameUuid, gameMode: source.gameMode, turnNumber: source.turnNumber,
            pointValue: source.pointValue, computerDifficulty: source.computerDifficulty, phase: source.phase, currentPlayer: source.currentPlayer,
            humanHand: Array(source.humanHand.dropFirst()) + [source.humanHand.last!], computerHand: source.computerHand,
            computerAHand: source.computerAHand, computerBHand: source.computerBHand, floorCards: source.floorCards,
            drawPile: source.drawPile, humanCaptured: source.humanCaptured, computerCaptured: source.computerCaptured,
            computerACaptured: source.computerACaptured, computerBCaptured: source.computerBCaptured,
            humanGoCount: source.humanGoCount, computerGoCount: source.computerGoCount,
            computerAGoCount: source.computerAGoCount, computerBGoCount: source.computerBGoCount,
            winner: source.winner, roundResult: source.roundResult, settlement: source.settlement,
            lastAction: source.lastAction, createdAt: source.createdAt, shakeCounts: source.shakeCounts,
            bombCounts: source.bombCounts, bombSkips: source.bombSkips, gookjinAsPee: source.gookjinAsPee,
            shakenMonths: source.shakenMonths, missionCardIds: source.missionCardIds,
            ppeokCounts: source.ppeokCounts, ppeokOwners: source.ppeokOwners, roundMultiplier: source.roundMultiplier,
            lastDiscardedCardId: source.lastDiscardedCardId, lastDiscardedBy: source.lastDiscardedBy,
            emptyCaptureStreaks: source.emptyCaptureStreaks, turnCounts: source.turnCounts,
            openingPpeokCounts: source.openingPpeokCounts, interimPointDeltas: source.interimPointDeltas,
            lastGoPlayer: source.lastGoPlayer, gookjinChoiceMade: source.gookjinChoiceMade, startingPlayer: source.startingPlayer
        )
    }
}
