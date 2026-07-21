import Foundation

struct APIError: LocalizedError {
    let status: Int
    let code: String
    let message: String
    var errorDescription: String? { message }
}

actor APIClient {
    static let clientName = "macos-native"
    static let clientVersion = 1

    private let sessionClient: URLSession
    private let cookieStore: SecureCookieStore
    private let baseURLProvider: @Sendable () -> URL?
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private var csrfToken = ""
    private var deviceId = ""

    init(baseURLProvider: @escaping @Sendable () -> URL?, cookieStore: SecureCookieStore = SecureCookieStore()) {
        self.baseURLProvider = baseURLProvider
        self.cookieStore = cookieStore
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.timeoutIntervalForRequest = 20
        self.sessionClient = URLSession(configuration: configuration)
    }

    func clientStatus() async throws -> ClientStatus { try await get("/api/client/status") }
    func setupStatus() async throws -> SetupStatus { try await get("/api/auth/status") }

    func session() async throws -> SessionData {
        let value: SessionData = try await get("/api/session")
        csrfToken = value.csrfToken
        deviceId = value.deviceId
        return value
    }

    func login(username: String, password: String, remember: Bool) async throws -> UserProfile {
        struct Body: Encodable { let username: String; let password: String; let remember: Bool }
        return try await write("/api/auth/login", method: "POST", body: Body(username: username, password: password, remember: remember), retryTransient: true)
    }

    func bootstrap(_ request: BootstrapRequest) async throws -> UserProfile {
        try await write("/api/auth/bootstrap", method: "POST", body: request)
    }

    func logout() async throws {
        let _: NoData = try await write("/api/auth/logout", method: "POST", body: Optional<String>.none)
        clearLocalSession()
    }

    func clearLocalSession() {
        csrfToken = ""
        deviceId = ""
        cookieStore.clear()
    }

    func dashboard() async throws -> DashboardData { try await get("/api/dashboard") }
    func refillBalance() async throws -> BalanceResult {
        try await write("/api/balance/refill", method: "POST", body: Optional<String>.none)
    }
    func users() async throws -> [FamilyUser] { try await get("/api/users") }

    func createUser(username: String, displayName: String, password: String) async throws -> CreatedUser {
        struct Body: Encodable { let username: String; let displayName: String; let password: String }
        return try await write("/api/users", method: "POST", body: Body(username: username, displayName: displayName, password: password))
    }

    func toggleUser(id: Int) async throws {
        let _: NoData = try await write("/api/users/\(id)/status", method: "PATCH", body: Optional<String>.none)
    }

    func changePassword(id: Int, password: String) async throws {
        struct Body: Encodable { let password: String }
        let _: NoData = try await write("/api/users/\(id)/password", method: "PUT", body: Body(password: password))
    }

    func loadMatgo() async throws -> StoredMatgoGame? { try await getOptional("/api/games/matgo") }

    func saveMatgo(_ snapshot: NativeGameSnapshot) async throws -> MatgoSaveResult {
        if deviceId.isEmpty { _ = try await session() }
        struct Body: Encodable {
            let gameUuid: String
            let gameMode: String
            let stateVersion: Int
            let turnNumber: Int
            let deviceId: String
            let state: NativeGameSnapshot
        }
        let body = Body(
            gameUuid: snapshot.gameUuid,
            gameMode: "matgo",
            stateVersion: snapshot.stateVersion,
            turnNumber: snapshot.turnNumber,
            deviceId: deviceId,
            state: snapshot
        )
        guard try encoder.encode(body).count <= 524_288 else {
            throw APIError(status: 413, code: "GAME_STATE_TOO_LARGE", message: "게임 저장 데이터가 서버 제한을 초과했습니다.")
        }
        return try await write("/api/games/matgo", method: "PUT", body: body, retryTransient: true)
    }

    func settleGostop(_ request: GostopSettlementRequest) async throws -> GostopSettlementResult {
        return try await write("/api/games/gostop/settle", method: "POST", body: request, retryTransient: true)
    }

    func uploadProfileImage(jpegData: Data) async throws -> UserProfile {
        guard jpegData.count <= 1_536 * 1_024 else {
            throw APIError(status: 413, code: "INVALID_PROFILE_IMAGE", message: "2MB 이하의 사진을 선택해 주세요.")
        }
        for attempt in 0..<2 {
            if csrfToken.isEmpty { try await fetchCSRF() }
            let boundary = "FamilyHwatu-\(UUID().uuidString)"
            var body = Data()
            body.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"image\"; filename=\"profile.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".utf8))
            body.append(jpegData)
            body.append(Data("\r\n--\(boundary)--\r\n".utf8))
            do {
                let envelope: APIEnvelope<UserProfile> = try await request(
                    path: "/api/profile/image",
                    method: "PUT",
                    body: body,
                    requiresCSRF: true,
                    contentType: "multipart/form-data; boundary=\(boundary)"
                )
                guard let user = envelope.data else { throw malformedResponse() }
                return user
            } catch let error as APIError where attempt == 0 && (error.status == 419 || error.code == "CSRF_FAILED") {
                csrfToken = ""
            }
        }
        throw APIError(status: 0, code: "RETRY_FAILED", message: "프로필 사진을 저장하지 못했습니다.")
    }

    private struct NoData: Decodable {}

    private func get<T: Decodable>(_ path: String) async throws -> T {
        let envelope: APIEnvelope<T> = try await retryingTransient {
            try await self.request(path: path, method: "GET", body: nil, requiresCSRF: false)
        }
        guard let data = envelope.data else { throw malformedResponse() }
        return data
    }

    private func getOptional<T: Decodable>(_ path: String) async throws -> T? {
        let envelope: APIEnvelope<T> = try await retryingTransient {
            try await self.request(path: path, method: "GET", body: nil, requiresCSRF: false)
        }
        return envelope.data
    }

    private func write<T: Decodable, B: Encodable>(_ path: String, method: String, body: B?, retryTransient: Bool = false) async throws -> T {
        for attempt in 0..<2 {
            if csrfToken.isEmpty { try await fetchCSRF() }
            do {
                let encoded = try body.map(encoder.encode)
                let envelope: APIEnvelope<T>
                if retryTransient {
                    envelope = try await retryingTransient {
                        try await self.request(path: path, method: method, body: encoded, requiresCSRF: true)
                    }
                } else {
                    envelope = try await request(path: path, method: method, body: encoded, requiresCSRF: true)
                }
                if T.self == NoData.self { return NoData() as! T }
                guard let data = envelope.data else { throw malformedResponse() }
                return data
            } catch let error as APIError where attempt == 0 && (error.status == 419 || error.code == "CSRF_FAILED") {
                csrfToken = ""
            }
        }
        throw APIError(status: 0, code: "RETRY_FAILED", message: "요청을 다시 처리하지 못했습니다.")
    }

    private func retryingTransient<T>(_ operation: () async throws -> T) async throws -> T {
        var lastError: Error?
        for attempt in 0..<3 {
            do { return try await operation() }
            catch let error as APIError where Self.isTransient(error) {
                lastError = error
                guard attempt < 2 else { break }
                try await Task.sleep(for: .milliseconds(attempt == 0 ? 250 : 750))
            }
        }
        throw lastError ?? APIError(status: 0, code: "RETRY_FAILED", message: "서버 요청을 다시 처리하지 못했습니다.")
    }

    private static func isTransient(_ error: APIError) -> Bool {
        error.code == "NETWORK_ERROR" || [500, 502, 503, 504].contains(error.status)
    }

    private func fetchCSRF() async throws {
        struct Token: Decodable { let csrfToken: String }
        let token: Token = try await get("/api/auth/csrf")
        csrfToken = token.csrfToken
    }

    private func request<T: Decodable>(path: String, method: String, body: Data?, requiresCSRF: Bool, contentType: String = "application/json") async throws -> APIEnvelope<T> {
        guard let baseURL = baseURLProvider(), let url = URL(string: path, relativeTo: baseURL) else {
            throw APIError(status: 0, code: "INVALID_SERVER_URL", message: "설정에서 서버 주소를 확인해 주세요.")
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(Self.clientName, forHTTPHeaderField: "X-Hwatu-Client")
        request.setValue(String(Self.clientVersion), forHTTPHeaderField: "X-Hwatu-Client-Version")
        if let cookieHeader = cookieStore.requestHeader(for: url) { request.setValue(cookieHeader, forHTTPHeaderField: "Cookie") }
        if body != nil { request.setValue(contentType, forHTTPHeaderField: "Content-Type") }
        if requiresCSRF { request.setValue(csrfToken, forHTTPHeaderField: "X-CSRF-TOKEN") }
        do {
            let (data, response) = try await sessionClient.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw malformedResponse() }
            cookieStore.consume(response: http, for: url)
            if data.isEmpty && !(200..<300).contains(http.statusCode) {
                switch http.statusCode {
                case 401:
                    throw APIError(status: 401, code: "AUTH_REQUIRED", message: "로그인이 필요합니다.")
                case 403:
                    throw APIError(status: 403, code: "ACCESS_DENIED", message: "이 요청을 처리할 권한이 없습니다.")
                default:
                    throw APIError(status: http.statusCode, code: "REQUEST_FAILED", message: "서버 요청을 처리하지 못했습니다.")
                }
            }
            let envelope = try decoder.decode(APIEnvelope<T>.self, from: data)
            if !envelope.ok || !(200..<300).contains(http.statusCode) {
                throw APIError(status: http.statusCode, code: envelope.error?.code ?? "REQUEST_FAILED", message: envelope.error?.message ?? "서버 요청을 처리하지 못했습니다.")
            }
            return envelope
        } catch let error as APIError {
            throw error
        } catch let error as DecodingError {
            throw APIError(status: 0, code: "INVALID_RESPONSE", message: "서버 응답 형식을 읽지 못했습니다: \(error.localizedDescription)")
        } catch {
            throw APIError(status: 0, code: "NETWORK_ERROR", message: "서버에 연결하지 못했습니다. 서버 주소와 실행 상태를 확인해 주세요.")
        }
    }

    private func malformedResponse() -> APIError {
        APIError(status: 0, code: "INVALID_RESPONSE", message: "서버 응답 형식이 올바르지 않습니다.")
    }
}
