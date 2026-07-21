import Foundation

enum NativePersistenceError: LocalizedError, Equatable {
    case corruptRecord(String)
    case unsupportedStateVersion(Int)
    case invalidCardState(String)
    case settlementQueueFull

    var errorDescription: String? {
        switch self {
        case let .corruptRecord(reason):
            "저장된 게임 상태가 손상되었습니다. 원본은 진단용으로 격리했습니다: \(reason)"
        case let .unsupportedStateVersion(version):
            "이 앱에서 열 수 없는 게임 상태 버전입니다: v\(version)"
        case let .invalidCardState(reason):
            "저장된 게임의 화투패 구성이 올바르지 않습니다: \(reason)"
        case .settlementQueueFull:
            "동기화 대기 중인 고스톱 정산이 20건입니다. 연결 후 정산을 동기화해야 새 결과를 저장할 수 있습니다."
        }
    }
}

enum NativeStoragePaths {
    static func defaultRoot(fileManager: FileManager = .default) -> URL {
        let base = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? fileManager.temporaryDirectory
        return base.appendingPathComponent("FamilyHwatu/State", isDirectory: true)
    }

    static func userDirectory(root: URL, userID: Int, fileManager: FileManager = .default) throws -> URL {
        let directory = root.appendingPathComponent("user-\(userID)", isDirectory: true)
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        var mutableDirectory = directory
        try? mutableDirectory.setResourceValues(values)
        return directory
    }

    static func writeAtomically<T: Encodable>(_ value: T, to url: URL, encoder: JSONEncoder = JSONEncoder()) throws {
        let data = try encoder.encode(value)
        try data.write(to: url, options: .atomic)
    }

    static func isolateCorruptFile(_ url: URL, fileManager: FileManager = .default) {
        guard fileManager.fileExists(atPath: url.path) else { return }
        let stamp = Int(Date().timeIntervalSince1970 * 1_000)
        let destination = url.deletingPathExtension().appendingPathExtension("corrupt-\(stamp).json")
        try? fileManager.moveItem(at: url, to: destination)
    }
}

struct MatgoLocalRecord: Codable {
    static let currentSchemaVersion = 1

    let schemaVersion: Int
    let userId: Int
    let updatedAt: String
    let gameUuid: String
    let stateVersion: Int
    let turnNumber: Int
    let createdAt: String
    let pendingSync: Bool
    let state: NativeGameSnapshot
}

struct MatgoStateResolution {
    let snapshot: NativeGameSnapshot
    let pendingSync: Bool
}

struct MatgoLocalStore {
    private let root: URL
    private let fileManager: FileManager
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder
    private let now: () -> Date

    init(
        rootDirectory: URL? = nil,
        fileManager: FileManager = .default,
        now: @escaping () -> Date = Date.init
    ) {
        root = rootDirectory ?? NativeStoragePaths.defaultRoot(fileManager: fileManager)
        self.fileManager = fileManager
        self.now = now
        encoder = JSONEncoder()
        decoder = JSONDecoder()
    }

    func load(userID: Int) throws -> MatgoLocalRecord? {
        let url = try recordURL(userID: userID)
        guard fileManager.fileExists(atPath: url.path) else { return nil }
        do {
            var record = try decoder.decode(MatgoLocalRecord.self, from: Data(contentsOf: url))
            guard record.schemaVersion == MatgoLocalRecord.currentSchemaVersion, record.userId == userID else {
                throw NativePersistenceError.corruptRecord("스키마 또는 사용자 식별자가 일치하지 않습니다.")
            }
            var state = record.state
            if state.stateVersion == 1 {
                try validate(state)
                state.stateVersion = 3
                record = makeRecord(state: state, userID: userID, pendingSync: record.pendingSync, updatedAt: record.updatedAt)
                try NativeStoragePaths.writeAtomically(record, to: url, encoder: encoder)
            } else {
                try validate(state)
            }
            return record
        } catch let error as NativePersistenceError {
            if case .unsupportedStateVersion = error { throw error }
            NativeStoragePaths.isolateCorruptFile(url, fileManager: fileManager)
            throw error
        } catch {
            NativeStoragePaths.isolateCorruptFile(url, fileManager: fileManager)
            throw NativePersistenceError.corruptRecord(error.localizedDescription)
        }
    }

    @discardableResult
    func save(_ state: NativeGameSnapshot, userID: Int, pendingSync: Bool) throws -> MatgoLocalRecord {
        try validate(state)
        let record = makeRecord(state: state, userID: userID, pendingSync: pendingSync)
        try NativeStoragePaths.writeAtomically(record, to: recordURL(userID: userID), encoder: encoder)
        return record
    }

    func markSynced(gameUuid: String, turnNumber: Int, userID: Int) throws {
        guard let record = try load(userID: userID),
              record.gameUuid == gameUuid,
              record.turnNumber == turnNumber else { return }
        try save(record.state, userID: userID, pendingSync: false)
    }

    func resolve(local: MatgoLocalRecord?, server: StoredMatgoGame?) throws -> MatgoStateResolution? {
        if let server { try validate(server.state) }
        guard let local else {
            return server.map { MatgoStateResolution(snapshot: $0.state, pendingSync: false) }
        }
        guard let server else {
            return MatgoStateResolution(snapshot: local.state, pendingSync: true)
        }
        if local.gameUuid == server.gameUuid {
            if local.turnNumber != server.turnNumber {
                return local.turnNumber > server.turnNumber
                    ? MatgoStateResolution(snapshot: local.state, pendingSync: true)
                    : MatgoStateResolution(snapshot: server.state, pendingSync: false)
            }
            let localDate = Self.date(local.updatedAt)
            let serverDate = Self.date(server.updatedAt)
            return localDate > serverDate
                ? MatgoStateResolution(snapshot: local.state, pendingSync: local.pendingSync)
                : MatgoStateResolution(snapshot: server.state, pendingSync: false)
        }
        return Self.date(local.createdAt) > Self.date(server.state.createdAt)
            ? MatgoStateResolution(snapshot: local.state, pendingSync: true)
            : MatgoStateResolution(snapshot: server.state, pendingSync: false)
    }

    func validate(_ state: NativeGameSnapshot) throws {
        guard state.gameMode == GameMode.matgo.rawValue else {
            throw NativePersistenceError.invalidCardState("맞고 상태가 아닙니다.")
        }
        let expectedCount: Int
        switch state.stateVersion {
        case 1, 3: expectedCount = 50
        case 2: expectedCount = 48
        default: throw NativePersistenceError.unsupportedStateVersion(state.stateVersion)
        }
        let cardIDs = state.humanHand + state.computerHand + state.floorCards + state.drawPile
            + state.humanCaptured + state.computerCaptured + transientCardIDs(state)
        guard cardIDs.count == expectedCount else {
            throw NativePersistenceError.invalidCardState("v\(state.stateVersion)는 \(expectedCount)장이어야 하지만 \(cardIDs.count)장입니다.")
        }
        guard Set(cardIDs).count == cardIDs.count else {
            throw NativePersistenceError.invalidCardState("중복된 카드가 있습니다.")
        }
        guard cardIDs.allSatisfy({ HwatuDeck.byID[$0] != nil }) else {
            throw NativePersistenceError.invalidCardState("알 수 없는 카드가 있습니다.")
        }
    }

    private func transientCardIDs(_ state: NativeGameSnapshot) -> [String] {
        var identifiers: [String] = []
        if let active = state.activePlayedCardId { identifiers.append(active) }
        if let pending = state.pendingMatchState, pending.cardId != state.activePlayedCardId { identifiers.append(pending.cardId) }
        return identifiers
    }

    private func makeRecord(
        state: NativeGameSnapshot,
        userID: Int,
        pendingSync: Bool,
        updatedAt: String? = nil
    ) -> MatgoLocalRecord {
        MatgoLocalRecord(
            schemaVersion: MatgoLocalRecord.currentSchemaVersion,
            userId: userID,
            updatedAt: updatedAt ?? ISO8601DateFormatter().string(from: now()),
            gameUuid: state.gameUuid,
            stateVersion: state.stateVersion,
            turnNumber: state.turnNumber,
            createdAt: state.createdAt,
            pendingSync: pendingSync,
            state: state
        )
    }

    private func recordURL(userID: Int) throws -> URL {
        try NativeStoragePaths.userDirectory(root: root, userID: userID, fileManager: fileManager)
            .appendingPathComponent("matgo.json")
    }

    private static func date(_ text: String) -> Date {
        ISO8601DateFormatter().date(from: text) ?? .distantPast
    }
}

@MainActor
enum MatgoContinuationLoader {
    static func load(api: APIClient, userID: Int, pointValue: Int, store: MatgoLocalStore) async throws -> GameSession {
        let local = try store.load(userID: userID)
        let server: StoredMatgoGame?
        do {
            server = try await api.loadMatgo()
        } catch {
            guard local != nil else { throw error }
            server = nil
        }
        guard let resolution = try store.resolve(local: local, server: server) else {
            return GameSession(mode: .matgo, pointValue: pointValue)
        }
        try store.save(resolution.snapshot, userID: userID, pendingSync: resolution.pendingSync)
        return GameSession(snapshot: resolution.snapshot)
    }
}
