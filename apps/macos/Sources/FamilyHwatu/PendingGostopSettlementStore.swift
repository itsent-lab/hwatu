import Foundation

struct PendingGostopSettlementStore {
    private struct Record: Codable {
        let schemaVersion: Int
        let userId: Int
        let updatedAt: String
        let values: [GostopSettlementRequest]
    }

    private let root: URL
    private let fileManager: FileManager
    private let legacyDefaults: UserDefaults?
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private let legacyPrefix = "FamilyHwatu.pendingGostopSettlements"

    init(
        rootDirectory: URL? = nil,
        fileManager: FileManager = .default,
        legacyDefaults: UserDefaults? = .standard
    ) {
        root = rootDirectory ?? NativeStoragePaths.defaultRoot(fileManager: fileManager)
        self.fileManager = fileManager
        self.legacyDefaults = legacyDefaults
    }

    func load(userID: Int) throws -> [GostopSettlementRequest] {
        let url = try recordURL(userID: userID)
        if !fileManager.fileExists(atPath: url.path), let migrated = legacyValues(userID: userID), !migrated.isEmpty {
            try write(migrated, userID: userID, url: url)
            legacyDefaults?.removeObject(forKey: legacyKey(userID))
        }
        guard fileManager.fileExists(atPath: url.path) else { return [] }
        do {
            let record = try decoder.decode(Record.self, from: Data(contentsOf: url))
            guard record.schemaVersion == 1, record.userId == userID else {
                throw NativePersistenceError.corruptRecord("고스톱 정산 큐의 사용자 또는 스키마가 일치하지 않습니다.")
            }
            return record.values
        } catch let error as NativePersistenceError {
            NativeStoragePaths.isolateCorruptFile(url, fileManager: fileManager)
            throw error
        } catch {
            NativeStoragePaths.isolateCorruptFile(url, fileManager: fileManager)
            throw NativePersistenceError.corruptRecord(error.localizedDescription)
        }
    }

    func enqueue(_ request: GostopSettlementRequest, userID: Int) throws {
        var values = try load(userID: userID)
        if let index = values.firstIndex(where: { $0.gameUuid == request.gameUuid }) {
            values[index] = request
        } else {
            guard values.count < 20 else { throw NativePersistenceError.settlementQueueFull }
            values.append(request)
        }
        try write(values, userID: userID)
    }

    func remove(gameUuid: String, userID: Int) throws {
        let values = try load(userID: userID).filter { $0.gameUuid != gameUuid }
        let url = try recordURL(userID: userID)
        if values.isEmpty, fileManager.fileExists(atPath: url.path) { try fileManager.removeItem(at: url) }
        else { try write(values, userID: userID, url: url) }
    }

    private func write(_ values: [GostopSettlementRequest], userID: Int, url: URL? = nil) throws {
        let record = Record(
            schemaVersion: 1,
            userId: userID,
            updatedAt: ISO8601DateFormatter().string(from: Date()),
            values: values
        )
        try NativeStoragePaths.writeAtomically(record, to: try url ?? recordURL(userID: userID), encoder: encoder)
    }

    private func legacyValues(userID: Int) -> [GostopSettlementRequest]? {
        guard let data = legacyDefaults?.data(forKey: legacyKey(userID)) else { return nil }
        return try? decoder.decode([GostopSettlementRequest].self, from: data)
    }

    private func legacyKey(_ userID: Int) -> String { "\(legacyPrefix).\(userID)" }

    private func recordURL(userID: Int) throws -> URL {
        try NativeStoragePaths.userDirectory(root: root, userID: userID, fileManager: fileManager)
            .appendingPathComponent("gostop-pending.json")
    }
}
