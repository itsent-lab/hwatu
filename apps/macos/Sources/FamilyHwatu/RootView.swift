import SwiftUI

struct RootView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let launchOnAppear: Bool

    init(launchOnAppear: Bool = true) {
        self.launchOnAppear = launchOnAppear
    }

    var body: some View {
        ZStack {
            if isPlainRoute { PlainBackground() }
            else { FeltBackground(game: isGameRoute) }
            VStack(spacing: 0) {
                if !isGameRoute { AppHeader(arcade: !isPlainRoute) }
                routeView
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                if !isGameRoute { AppFooter(arcade: !isPlainRoute) }
            }
            if appState.isBusy {
                Color.black.opacity(0.34).ignoresSafeArea()
                ProgressView("잠시만 기다려 주세요")
                    .padding(24)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
            }
        }
        .foregroundStyle(isGameRoute ? HwatuTheme.cream : HwatuTheme.ink)
        .tint(HwatuTheme.red)
        .transaction { if reduceMotion { $0.animation = nil } }
        .task {
            guard launchOnAppear else { return }
            await appState.launch()
        }
        .sheet(isPresented: $appState.isServerSettingsPresented) {
            ServerSettingsView()
                .environmentObject(appState)
        }
    }

    private var isGameRoute: Bool {
        switch appState.route {
        case .matgoGame, .gostopGame: true
        default: false
        }
    }

    private var isPlainRoute: Bool {
        switch appState.route {
        case .bootstrap, .family, .credits, .privacy, .license: true
        default: false
        }
    }

    @ViewBuilder
    private var routeView: some View {
        switch appState.route {
        case .entry: EntryView()
        case .bootstrap: BootstrapView()
        case .home: HomeView(loadDashboardOnAppear: launchOnAppear)
        case .matgoLobby: GameLobbyView(mode: .matgo)
        case let .matgoGame(pointValue, continueGame): GameTableView(mode: .matgo, pointValue: pointValue, continueGame: continueGame)
        case .gostopLobby: GameLobbyView(mode: .gostop)
        case let .gostopGame(pointValue): GameTableView(mode: .gostop, pointValue: pointValue, continueGame: false)
        case .family: FamilyAdminView()
        case .credits: LegalView(kind: .credits)
        case .privacy: LegalView(kind: .privacy)
        case .license: LegalView(kind: .license)
        }
    }
}

private struct AppHeader: View {
    @EnvironmentObject private var appState: AppState
    let arcade: Bool

    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 18) {
                Button { appState.route = .home } label: {
                    if arcade { ArcadeBrand() }
                    else {
                        Text("가족화투")
                            .font(.system(size: 20, weight: .black, design: .serif))
                            .foregroundStyle(HwatuTheme.deepRed)
                    }
                }.buttonStyle(.plain)
                Spacer()
                if let user = appState.user {
                    Text("\(user.displayName) 님")
                        .font(.system(size: 14, weight: .black))
                        .foregroundStyle(arcade ? Color(red: 1.0, green: 0.882, blue: 0.427) : HwatuTheme.ink)
                        .padding(.horizontal, 13)
                        .padding(.vertical, 8)
                        .background(arcade ? Color(red: 0.216, green: 0.094, blue: 0.078).opacity(0.58) : Color(red: 0.937, green: 0.902, blue: 0.831), in: Capsule())
                        .overlay(Capsule().stroke(arcade ? Color(red: 1.0, green: 0.859, blue: 0.455).opacity(0.55) : Color.clear))
                    if user.isAdmin {
                        Button("가족 회원") { appState.route = .family }.buttonStyle(.plain)
                    }
                    Button("로그아웃") { Task { await appState.logout() } }
                        .buttonStyle(.plain)
                        .font(.system(size: 14, weight: .black))
                } else {
                    if arcade {
                        Button("로그인") { appState.route = .entry }
                            .buttonStyle(DashboardPrimaryButtonStyle())
                            .frame(minWidth: 96, minHeight: 42)
                    } else {
                        Button("로그인") { appState.route = .entry }
                            .buttonStyle(PrimaryButtonStyle())
                    }
                }
            }
            .foregroundStyle(arcade ? HwatuTheme.cream : HwatuTheme.deepRed)
            .padding(.horizontal, max(24, (geometry.size.width - 1120) / 2))
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(height: 72)
        .background(headerBackground)
        .overlay(alignment: .bottom) { Rectangle().fill(arcade ? Color(red: 0.30, green: 0.12, blue: 0.08) : HwatuTheme.ink.opacity(0.12)).frame(height: arcade ? 2 : 1) }
        .shadow(color: .black.opacity(arcade ? 0.25 : 0), radius: 3, y: 2)
    }

    @ViewBuilder private var headerBackground: some View {
        if arcade {
            LinearGradient(colors: [Color(red: 0.302, green: 0.110, blue: 0.098), Color(red: 0.518, green: 0.220, blue: 0.149), Color(red: 0.263, green: 0.106, blue: 0.098)], startPoint: .leading, endPoint: .trailing)
        } else { HwatuTheme.paper.opacity(0.78) }
    }
}

private struct ArcadeBrand: View {
    var body: some View {
        Text("가족화투")
            .font(.system(size: 16, weight: .black, design: .serif))
            .foregroundStyle(Color(red: 1.0, green: 0.957, blue: 0.482))
            .padding(.horizontal, 15)
            .padding(.vertical, 7)
            .frame(minWidth: 105)
            .background(LinearGradient(colors: [Color(red: 0.875, green: 0.188, blue: 0.200), Color(red: 0.663, green: 0.090, blue: 0.106)], startPoint: .top, endPoint: .bottom), in: Capsule())
            .overlay(Capsule().stroke(Color(red: 0.557, green: 0.094, blue: 0.106), lineWidth: 2))
            .rotationEffect(.degrees(-2))
            .shadow(color: .black.opacity(0.30), radius: 2, y: 2)
    }
}

private struct AppFooter: View {
    @EnvironmentObject private var appState: AppState
    let arcade: Bool

    var body: some View {
        HStack(spacing: 18) {
            Button("화투 패 출처 및 라이선스") { appState.route = .credits }
                .foregroundStyle(arcade ? Color(red: 1.0, green: 0.890, blue: 0.435) : Color(red: 0.506, green: 0.451, blue: 0.416))
            Button("개인정보 처리방침") { appState.route = .privacy }
            Button("MIT 라이선스") { appState.route = .license }
        }
        .buttonStyle(.plain)
        .font(.system(size: 11, weight: .semibold))
        .underline(true, color: arcade ? Color(red: 0.941, green: 0.914, blue: 0.788).opacity(0.55) : Color(red: 0.506, green: 0.451, blue: 0.416).opacity(0.55))
        .foregroundStyle(arcade ? Color(red: 0.941, green: 0.914, blue: 0.788) : Color(red: 0.506, green: 0.451, blue: 0.416))
        .frame(maxWidth: .infinity, minHeight: 52)
        .background(arcade ? Color(red: 0.180, green: 0.243, blue: 0.125).opacity(0.90) : HwatuTheme.paper.opacity(0.62))
        .overlay(alignment: .top) { Rectangle().fill(arcade ? Color(red: 0.337, green: 0.396, blue: 0.176) : HwatuTheme.ink.opacity(0.14)).frame(height: 1) }
    }
}

struct ServerSettingsView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var draft = ""
    @State private var statusMessage = ""
    @State private var statusIsError = false
    @State private var checking = false

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("화투 서버").font(.title2.bold())
            Text("API 서버의 기준 주소를 입력하세요. 운영 서버는 HTTPS 주소만 사용할 수 있습니다.")
                .foregroundStyle(.secondary)
            TextField("https://example.com", text: $draft)
                .textFieldStyle(.roundedBorder)
            if !statusMessage.isEmpty {
                Label(statusMessage, systemImage: statusIsError ? "xmark.circle.fill" : "checkmark.circle.fill")
                    .font(.callout)
                    .foregroundStyle(statusIsError ? Color.red : Color.green)
            }
            HStack {
                Button("취소") { dismiss() }
                Spacer()
                Button("로컬 개발 주소") { draft = "http://127.0.0.1:5233" }
                Button(checking ? "확인 중…" : "연결 테스트") { Task { await testConnection(reconnect: false) } }
                    .disabled(checking)
                Button("저장하고 연결") { Task { await testConnection(reconnect: true) } }
                    .keyboardShortcut(.defaultAction)
                    .disabled(checking)
            }
        }
        .padding(28)
        .frame(width: 560)
        .foregroundStyle(HwatuTheme.ink)
        .onAppear { draft = appState.serverURLText }
    }

    private func testConnection(reconnect: Bool) async {
        checking = true
        statusMessage = ""
        defer { checking = false }
        do {
            try appState.setServerURL(draft)
            draft = appState.serverURLText
            statusMessage = try await appState.testServerConnection()
            statusIsError = false
            if reconnect {
                dismiss()
                await appState.launch()
            }
        } catch {
            statusMessage = error.localizedDescription
            statusIsError = true
        }
    }
}
