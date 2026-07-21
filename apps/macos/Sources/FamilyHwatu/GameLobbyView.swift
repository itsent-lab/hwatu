import SwiftUI

struct GameLobbyView: View {
    @EnvironmentObject private var appState: AppState
    let mode: GameMode
    @State private var data: DashboardData?
    private let pointValues = [100, 1_000, 2_000, 5_000, 10_000]

    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 8) {
                            if mode == .gostop {
                                Text("3인 고스톱")
                                    .font(.caption.weight(.black))
                                    .foregroundStyle(HwatuTheme.red)
                            }
                            Text(heading)
                                .font(.system(size: 36, weight: .black, design: .serif))
                                .foregroundStyle(mode == .gostop ? HwatuTheme.deepGreen : HwatuTheme.ink)
                        }
                        Spacer()
                        if let user = data?.user {
                            MoneyBadge(title: "내 게임머니", value: user.virtualBalance)
                        }
                    }
                    if let user = data?.user, user.virtualBalance <= 0 {
                        emptyBalance
                    } else {
                        Text(mode == .matgo ? "점당 게임머니" : "점당 게임머니")
                            .font(.callout.weight(.black))
                            .foregroundStyle(HwatuTheme.muted)
                        HStack(spacing: 13) {
                            ForEach(Array(pointValues.enumerated()), id: \.offset) { index, value in
                                PointRoom(value: value, mode: mode, index: index) { enter(value) }
                            }
                        }
                        .frame(maxWidth: .infinity)
                        if mode == .matgo, let save = data?.activeSave {
                            Button("저장된 \(save.turnNumber)턴 이어하기") {
                                appState.route = .matgoGame(pointValue: 100, continueGame: true)
                            }.buttonStyle(DashboardPrimaryButtonStyle())
                        }
                    }
                    if let message = appState.errorMessage { ErrorBanner(message: message) }
                    HStack {
                        Spacer()
                        Button("게임 모드 선택으로 돌아가기") { appState.route = .home }
                            .buttonStyle(DashboardSecondaryButtonStyle())
                            .frame(minWidth: 250)
                        Spacer()
                    }
                }
                .padding(mode == .gostop ? 44 : 52)
                .frame(width: min(1120, max(0, geometry.size.width - 32)))
                .frame(minHeight: mode == .gostop ? nil : 530)
                .background(panelGradient, in: RoundedRectangle(cornerRadius: mode == .gostop ? 24 : 22))
                .overlay(RoundedRectangle(cornerRadius: mode == .gostop ? 24 : 22).stroke(panelBorder, lineWidth: 3))
                .shadow(color: panelShadow.opacity(0.30), radius: 18, y: 16)
                .padding(.horizontal, 16)
                .padding(.vertical, 30)
                .frame(maxWidth: .infinity)
                .frame(minHeight: geometry.size.height)
            }
        }
        .task { data = await appState.loadDashboard() }
    }

    private var panelGradient: LinearGradient {
        let colors = mode == .gostop
            ? [Color(red: 0.878, green: 0.898, blue: 0.773), Color(red: 0.659, green: 0.741, blue: 0.592)]
            : [Color(red: 0.949, green: 0.871, blue: 0.651), Color(red: 0.804, green: 0.659, blue: 0.369)]
        return LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    private var panelBorder: Color {
        mode == .gostop ? Color(red: 0.247, green: 0.396, blue: 0.365) : Color(red: 0.502, green: 0.322, blue: 0.176)
    }

    private var panelShadow: Color {
        mode == .gostop ? Color(red: 0.216, green: 0.259, blue: 0.157) : Color(red: 0.298, green: 0.180, blue: 0.086)
    }

    private var heading: String {
        let name = data?.user.displayName ?? appState.user?.displayName ?? "가족"
        return mode == .matgo ? "\(name) 님, 한 판 즐겨볼까요?" : "\(name) 님, 점당 금액을 골라 주세요"
    }

    private var emptyBalance: some View {
        VStack(spacing: 14) {
            Text("게임머니를 모두 사용했습니다. 리필한 뒤 새 판을 시작하세요.")
                .font(.headline)
            Button("게임머니 500,000냥 리필 받기") {
                Task {
                    if await appState.perform({ _ = try await appState.api.refillBalance() }) {
                        data = await appState.loadDashboard()
                    }
                }
            }.buttonStyle(DashboardPrimaryButtonStyle())
        }
        .frame(maxWidth: .infinity)
        .padding(28)
        .background(Color.white.opacity(0.34), in: RoundedRectangle(cornerRadius: 16))
    }

    private func enter(_ value: Int) {
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(120))
            if mode == .matgo { appState.route = .matgoGame(pointValue: value, continueGame: false) }
            else { appState.route = .gostopGame(pointValue: value) }
        }
    }
}

private struct PointRoom: View {
    let value: Int
    let mode: GameMode
    let index: Int
    let action: () -> Void
    @State private var hovering = false

    private let labels = ["가볍게", "신나게", "짜릿하게", "화끈하게", "큰 승부"]
    private let palettes: [[Color]] = [
        [Color(red: 0.573, green: 0.682, blue: 0.345), Color(red: 0.365, green: 0.514, blue: 0.227), Color(red: 0.212, green: 0.325, blue: 0.161)],
        [Color(red: 0.886, green: 0.725, blue: 0.294), Color(red: 0.725, green: 0.482, blue: 0.153), Color(red: 0.471, green: 0.275, blue: 0.090)],
        [Color(red: 0.863, green: 0.463, blue: 0.345), Color(red: 0.718, green: 0.267, blue: 0.204), Color(red: 0.443, green: 0.157, blue: 0.122)],
        [Color(red: 0.694, green: 0.420, blue: 0.545), Color(red: 0.490, green: 0.255, blue: 0.392), Color(red: 0.302, green: 0.153, blue: 0.243)],
        [Color(red: 0.349, green: 0.667, blue: 0.600), Color(red: 0.157, green: 0.478, blue: 0.447), Color(red: 0.082, green: 0.318, blue: 0.306)]
    ]

    var body: some View {
        Button(action: action) {
            VStack(spacing: 7) {
                Text(mode == .matgo ? "일반" : "3인 고스톱")
                    .font(.system(size: 15, weight: .black))
                Text("점 \(Int64(value).koreanMoney)냥")
                    .font(.system(size: 14, weight: .black))
                    .frame(maxWidth: .infinity, minHeight: 35)
                    .background(Color.black.opacity(0.46), in: Capsule())
                Text(labels[index]).font(.caption.weight(.black)).foregroundStyle(HwatuTheme.cream)
                Spacer(minLength: 0)
                Text("입장")
                    .font(.system(size: 14, weight: .black))
                    .foregroundStyle(HwatuTheme.ink)
                    .frame(maxWidth: .infinity, minHeight: 36)
                    .background(LinearGradient(colors: [Color(red: 1.0, green: 0.902, blue: 0.592), Color(red: 0.749, green: 0.486, blue: 0.133)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 10))
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(red: 0.388, green: 0.224, blue: 0.098), lineWidth: 3))
                    .padding(.horizontal, 18)
            }
            .foregroundStyle(.white)
            .padding(11)
            .frame(maxWidth: .infinity, minHeight: 166)
            .background(LinearGradient(stops: [.init(color: palettes[index][0], location: 0), .init(color: palettes[index][1], location: 0.57), .init(color: palettes[index][2], location: 0.58), .init(color: palettes[index][1], location: 1)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 24))
            .overlay(alignment: .topLeading) {
                Capsule().fill(Color.white.opacity(0.22)).frame(width: 62, height: 15).rotationEffect(.degrees(-7)).offset(x: 10, y: 8)
            }
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(palettes[index][2], lineWidth: 5))
            .shadow(color: palettes[index][2], radius: 0, y: 7)
            .shadow(color: .black.opacity(0.26), radius: 7, y: 9)
            .offset(y: hovering ? -3 : 0)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(mode == .matgo ? "일반" : "3인 고스톱"), 점 \(Int64(value).koreanMoney)냥, \(labels[index]), 입장")
        .onHover { hovering = $0 }
        .animation(.easeOut(duration: 0.13), value: hovering)
    }
}
