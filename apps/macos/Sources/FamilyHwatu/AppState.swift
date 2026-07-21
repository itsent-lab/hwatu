import Foundation

@MainActor
final class AppState: ObservableObject {
    enum Route: Hashable {
        case entry
        case bootstrap
        case home
        case matgoLobby
        case matgoGame(pointValue: Int, continueGame: Bool)
        case gostopLobby
        case gostopGame(pointValue: Int)
        case family
        case credits
        case privacy
        case license
    }

    @Published var route: Route = .entry
    @Published var user: UserProfile?
    @Published var dashboard: DashboardData?
    @Published var isBusy = false
    @Published var errorMessage: String?
    @Published var isServerSettingsPresented = false
    @Published var serverURLText: String {
        didSet { UserDefaults.standard.set(serverURLText, forKey: Self.serverURLKey) }
    }

    private static let serverURLKey = "FamilyHwatu.serverURL"
    let api: APIClient

    var serverSettingsEnabled: Bool {
        (Bundle.main.object(forInfoDictionaryKey: "HwatuServerSettingsEnabled") as? Bool) ?? true
    }

    init() {
        let stored = UserDefaults.standard.string(forKey: Self.serverURLKey)
        let packaged = Bundle.main.object(forInfoDictionaryKey: "HwatuAPIBaseURL") as? String
        let settingsEnabled = (Bundle.main.object(forInfoDictionaryKey: "HwatuServerSettingsEnabled") as? Bool) ?? true
        let packagedDefault = packaged?.isEmpty == false && packaged != "__API_BASE_URL__" ? packaged! : ""
        let initial = settingsEnabled && stored?.isEmpty == false ? stored! : packagedDefault
        serverURLText = initial
        let serverURLKey = Self.serverURLKey
        api = APIClient(baseURLProvider: {
            let text = settingsEnabled ? UserDefaults.standard.string(forKey: serverURLKey) ?? initial : initial
            return URL(string: text.trimmingCharacters(in: .whitespacesAndNewlines))
        })
    }

    func launch() async {
        guard !serverURLText.isEmpty else {
            errorMessage = serverSettingsEnabled ? nil : "이 배포판에는 API 서버 주소가 설정되지 않았습니다. 관리자에게 문의해 주세요."
            route = .entry
            isServerSettingsPresented = serverSettingsEnabled
            return
        }
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }
        do {
            try await verifyCompatibility()
            do {
                let session = try await api.session()
                user = session.user
                route = .home
            } catch let error as APIError where error.status == 401 || error.code == "AUTH_REQUIRED" {
                await api.clearLocalSession()
                let status = try await api.setupStatus()
                route = status.needsBootstrap ? .bootstrap : .entry
            }
        } catch let error as APIError {
            if error.status == 401 {
                route = .entry
            } else {
                route = .entry
                errorMessage = error.localizedDescription
            }
        } catch {
            route = .entry
            errorMessage = error.localizedDescription
        }
    }

    func setServerURL(_ text: String) throws {
        serverURLText = try Self.normalizedServerURL(text)
    }

    func testServerConnection() async throws -> String {
        try await verifyCompatibility()
        _ = try await api.setupStatus()
        return "서버 연결과 macOS API 호환성 확인에 성공했습니다."
    }

    static func normalizedServerURL(_ text: String) throws -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard var components = URLComponents(string: trimmed),
              let scheme = components.scheme?.lowercased(),
              let host = components.host?.lowercased(),
              !host.isEmpty,
              components.user == nil,
              components.password == nil,
              components.query == nil,
              components.fragment == nil,
              components.path.isEmpty || components.path == "/" else {
            throw APIError(status: 0, code: "INVALID_SERVER_URL", message: "서버 주소 형식을 확인해 주세요.")
        }
        let isLocalHost = host == "localhost"
            || host.hasSuffix(".localhost")
            || host == "127.0.0.1"
            || host == "::1"
        guard scheme == "https" || (scheme == "http" && isLocalHost) else {
            throw APIError(status: 0, code: "INSECURE_SERVER_URL", message: "운영 서버는 HTTPS 주소만 사용할 수 있습니다.")
        }
        components.scheme = scheme
        components.path = ""
        guard let normalized = components.url?.absoluteString else {
            throw APIError(status: 0, code: "INVALID_SERVER_URL", message: "서버 주소 형식을 확인해 주세요.")
        }
        return normalized.hasSuffix("/") ? String(normalized.dropLast()) : normalized
    }

    private func verifyCompatibility() async throws {
        let status = try await api.clientStatus()
        guard status.compatible,
              status.apiVersion >= 1,
              status.minimumMacClientVersion <= APIClient.clientVersion else {
            throw APIError(
                status: 426,
                code: "CLIENT_UPGRADE_REQUIRED",
                message: "이 서버와 호환되는 가족 화투 Mac 앱이 필요합니다. 앱 또는 서버를 업데이트해 주세요."
            )
        }
    }

    func login(username: String, password: String, remember: Bool) async -> Bool {
        await perform {
            self.user = try await self.api.login(username: username, password: password, remember: remember)
            self.route = .home
        }
    }

    func bootstrap(_ request: BootstrapRequest) async -> Bool {
        await perform {
            self.user = try await self.api.bootstrap(request)
            self.route = .home
        }
    }

    func loadDashboard() async -> DashboardData? {
        var result: DashboardData?
        let success = await perform {
            result = try await self.api.dashboard()
            self.dashboard = result
            self.user = result?.user
        }
        if !success {
            dashboard = nil
            user = nil
            route = .entry
        }
        return success ? result : nil
    }

    func logout() async {
        do { try await api.logout() }
        catch { errorMessage = error.localizedDescription }
        await api.clearLocalSession()
        user = nil
        dashboard = nil
        route = .entry
    }

    @discardableResult
    func perform(_ operation: @escaping () async throws -> Void) async -> Bool {
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }
        do {
            try await operation()
            return true
        } catch {
            errorMessage = error.localizedDescription
            if let apiError = error as? APIError, apiError.status == 401 || apiError.code == "AUTH_REQUIRED" {
                await api.clearLocalSession()
                user = nil
                dashboard = nil
                route = .entry
            }
            return false
        }
    }
}
