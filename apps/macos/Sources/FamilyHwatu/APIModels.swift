import Foundation

struct APIEnvelope<T: Decodable>: Decodable {
    let ok: Bool
    let data: T?
    let error: APIErrorPayload?
}

struct APIErrorPayload: Decodable {
    let code: String
    let message: String
}

struct SetupStatus: Decodable {
    let needsBootstrap: Bool
    let bootstrapEnabled: Bool
}

struct ClientStatus: Decodable {
    let apiVersion: Int
    let minimumMacClientVersion: Int
    let client: String
    let clientVersion: Int
    let compatible: Bool
    let authentication: String
    let serverTime: String
}

struct UserProfile: Codable, Identifiable, Hashable {
    let id: Int
    let username: String
    let displayName: String
    let role: String
    var virtualBalance: Int64
    var opponentBalance: Int64?
    var gostopComputerABalance: Int64?
    var gostopComputerBBalance: Int64?
    let profileImageUrl: String?

    var isAdmin: Bool { role == "admin" }
}

struct SessionData: Decodable {
    let user: UserProfile
    let csrfToken: String
    let deviceId: String
}

struct DashboardData: Decodable {
    struct ActiveSave: Decodable {
        let gameUuid: String
        let turnNumber: Int
        let updatedAt: String
    }
    struct Today: Decodable {
        let games: Int
        let wins: Int
        let settlement: Int64
    }
    let user: UserProfile
    let activeSave: ActiveSave?
    let today: Today
    let gameStats: PlayerGameStatistics?
}

struct FamilyUser: Decodable, Identifiable {
    let id: Int
    let username: String
    let displayName: String
    let role: String
    let isActive: Bool
    let virtualBalance: Int64
    let opponentBalance: Int64?
    let gostopComputerABalance: Int64?
    let gostopComputerBBalance: Int64?
    let lastLoginAt: String?
    let createdAt: String
}

struct BootstrapRequest: Encodable {
    let setupToken: String
    let username: String
    let displayName: String
    let password: String
    let passwordConfirm: String
}

struct BalanceResult: Decodable { let balance: Int64 }
struct CreatedUser: Decodable { let id: Int }

struct MatgoSaveResult: Decodable {
    let gameUuid: String
    let turnNumber: Int
    let savedAt: String
    let balance: Int64
    let opponentBalance: Int64
    let settlementAmount: Int64
    let settlementApplied: Bool
    let opponentRefilled: Bool?
    let opponentBalanceAfterSettlement: Int64?
}

struct StoredMatgoGame: Decodable {
    let gameUuid: String
    let gameMode: String
    let stateVersion: Int
    let turnNumber: Int
    let state: NativeGameSnapshot
    let updatedAt: String
}

struct GostopSettlementRequest: Codable, Equatable {
    let gameUuid: String
    let winner: String?
    let finalScore: Int
    let pointValue: Int
    let roundResult: String
    let humanPoints: Int
    let computerAPoints: Int
    let computerBPoints: Int
    let statistics: MatchStatistics?

    init(
        gameUuid: String,
        winner: String?,
        finalScore: Int,
        pointValue: Int,
        roundResult: String,
        humanPoints: Int,
        computerAPoints: Int,
        computerBPoints: Int,
        statistics: MatchStatistics? = nil
    ) {
        self.gameUuid = gameUuid
        self.winner = winner
        self.finalScore = finalScore
        self.pointValue = pointValue
        self.roundResult = roundResult
        self.humanPoints = humanPoints
        self.computerAPoints = computerAPoints
        self.computerBPoints = computerBPoints
        self.statistics = statistics
    }
}

struct GostopSettlementResult: Decodable {
    let gameUuid: String
    let balance: Int64
    let computerABalance: Int64
    let computerBBalance: Int64
    let settlementAmount: Int64
    let settlementApplied: Bool
}

extension Int64 {
    var koreanMoney: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale(identifier: "ko_KR")
        return formatter.string(from: NSNumber(value: self)) ?? "\(self)"
    }
}
