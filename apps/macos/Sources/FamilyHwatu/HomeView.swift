import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var appState: AppState
    @State private var loaded = false
    private let loadDashboardOnAppear: Bool

    init(loadDashboardOnAppear: Bool = true) {
        self.loadDashboardOnAppear = loadDashboardOnAppear
    }

    var body: some View {
        GeometryReader { geometry in
            if geometry.size.height < 586 {
                ScrollView { homeContent(width: geometry.size.width, minimumHeight: geometry.size.height) }
            } else {
                homeContent(width: geometry.size.width, minimumHeight: geometry.size.height)
            }
        }
        .task {
            guard loadDashboardOnAppear, !loaded else { return }
            loaded = true
            _ = await appState.loadDashboard()
        }
    }

    @ViewBuilder
    private func homeContent(width: CGFloat, minimumHeight: CGFloat) -> some View {
        if let user = appState.user {
            VStack(spacing: 0) {
                VStack(spacing: 8) {
                    Text("가족 화투 놀이")
                        .font(.system(size: 14, weight: .black))
                        .foregroundStyle(Color(red: 0.549, green: 0.188, blue: 0.122))
                    Text("\(user.displayName) 님, 어떤 게임을 할까요?")
                        .font(.system(size: 44, weight: .black, design: .serif))
                        .foregroundStyle(Color(red: 0.286, green: 0.157, blue: 0.090))
                }
                .padding(.bottom, 38)
                HStack(spacing: 30) {
                    GameModeCard(
                        title: "맞고",
                        players: "2인",
                        subtitle: "지금 즐기고 있는 가족 맞고",
                        colors: [Color(red: 0.875, green: 0.333, blue: 0.251), Color(red: 0.639, green: 0.149, blue: 0.141)],
                        border: Color(red: 0.435, green: 0.157, blue: 0.122),
                        shadow: Color(red: 0.392, green: 0.133, blue: 0.110),
                        detail: appState.dashboard?.activeSave.map { "저장된 \($0.turnNumber)턴 있음" } ?? "입장하기"
                    ) { navigate(to: .matgoLobby) }
                    GameModeCard(
                        title: "고스톱",
                        players: "3인",
                        subtitle: "가족 규칙부터 천천히 다듬는 중",
                        colors: [Color(red: 0.353, green: 0.561, blue: 0.490), Color(red: 0.192, green: 0.365, blue: 0.345)],
                        border: Color(red: 0.216, green: 0.373, blue: 0.341),
                        shadow: Color(red: 0.161, green: 0.298, blue: 0.278),
                        detail: "입장하기"
                    ) { navigate(to: .gostopLobby) }
                }
                if let message = appState.errorMessage { ErrorBanner(message: message).padding(.top, 20) }
            }
            .padding(48)
            .frame(width: min(920, max(0, width - 32)))
            .background {
                RoundedRectangle(cornerRadius: 24)
                    .fill(LinearGradient(colors: [Color(red: 0.969, green: 0.902, blue: 0.718), Color(red: 0.827, green: 0.690, blue: 0.408)], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .shadow(color: Color(red: 0.298, green: 0.180, blue: 0.086).opacity(0.30), radius: 18, y: 16)
            }
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color(red: 0.502, green: 0.322, blue: 0.176), lineWidth: 3))
            .overlay(RoundedRectangle(cornerRadius: 21).stroke(Color.white.opacity(0.48), lineWidth: 1).padding(5))
            .padding(.horizontal, 16)
            .padding(.vertical, 30)
            .frame(maxWidth: .infinity)
            .frame(minHeight: minimumHeight)
        }
    }

    private func navigate(to route: AppState.Route) {
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(120))
            appState.route = route
        }
    }
}

private struct GameModeCard: View {
    let title: String
    let players: String
    let subtitle: String
    let colors: [Color]
    let border: Color
    let shadow: Color
    let detail: String
    let action: () -> Void
    @State private var hovering = false

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 11) {
                Text(players)
                    .font(.system(size: 16, weight: .black))
                    .foregroundStyle(Color(red: 1.0, green: 0.945, blue: 0.651))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color(red: 0.212, green: 0.110, blue: 0.075).opacity(0.48), in: Capsule())
                Spacer()
                Text(title)
                    .font(.system(size: 77, weight: .black, design: .serif))
                    .shadow(color: .black.opacity(0.45), radius: 0, y: 4)
                Text(subtitle).font(.system(size: 15, weight: .black))
                Text(detail)
                    .font(.callout.weight(.black))
                    .foregroundStyle(Color(red: 1.0, green: 0.949, blue: 0.482))
                    .frame(maxWidth: .infinity, minHeight: 46)
                    .background(Color(red: 0.275, green: 0.110, blue: 0.078).opacity(0.38), in: RoundedRectangle(cornerRadius: 11))
                    .overlay(RoundedRectangle(cornerRadius: 11).stroke(Color(red: 1.0, green: 0.957, blue: 0.737).opacity(0.70), lineWidth: 2))
            }
            .foregroundStyle(.white)
            .padding(28)
            .frame(maxWidth: .infinity, minHeight: 315, maxHeight: 315, alignment: .leading)
            .background {
                RoundedRectangle(cornerRadius: 26)
                    .fill(LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing))
                    .shadow(color: shadow, radius: 0, y: 8)
                    .shadow(color: .black.opacity(0.28), radius: 9, y: 13)
            }
            .overlay(alignment: .bottomTrailing) {
                Text("花")
                    .font(.system(size: 176, weight: .black, design: .serif))
                    .foregroundStyle(Color(red: 1.0, green: 0.949, blue: 0.694).opacity(0.13))
                    .rotationEffect(.degrees(-12))
                    .offset(x: 20, y: 42)
                    .clipped()
            }
            .overlay(RoundedRectangle(cornerRadius: 26).stroke(border, lineWidth: 5))
            .overlay(RoundedRectangle(cornerRadius: 21).stroke(Color.white.opacity(0.25), lineWidth: 2).padding(6))
            .overlay(RoundedRectangle(cornerRadius: 29).stroke(Color(red: 1.0, green: 0.906, blue: 0.404), lineWidth: hovering ? 5 : 0).padding(-3))
            .brightness(hovering ? 0.08 : 0)
            .offset(y: hovering ? -5 : 0)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(title), \(players), \(subtitle), \(detail)")
        .onHover { hovering = $0 }
        .animation(.easeOut(duration: 0.14), value: hovering)
    }
}
