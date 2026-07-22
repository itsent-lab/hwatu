import SwiftUI

struct GameStatisticsSummary: View {
    let mode: GameMode
    let statistics: GameModeStatistics?
    @State private var detailPresented = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Spacer(minLength: 0)
                if let statistics, statistics.currentWinStreak > 0 {
                    Label("현재 \(statistics.currentWinStreak)연승", systemImage: "flame.fill")
                        .font(.system(size: 11, weight: .black))
                        .foregroundStyle(Color(red: 1.0, green: 0.92, blue: 0.47))
                        .padding(.horizontal, 10)
                        .frame(minHeight: 29)
                        .background(Color(red: 0.48, green: 0.08, blue: 0.08), in: Capsule())
                }
                Button("재미 기록 보기") { detailPresented = true }
                    .buttonStyle(StatisticsDetailButtonStyle())
            }
            HStack(spacing: 9) {
                statisticTile("승률", value: String(format: "%.1f", statistics?.winRate ?? 0), unit: "%")
                statisticTile("승 · 패", value: "\(statistics?.wins ?? 0)승 \(statistics?.losses ?? 0)패")
                statisticTile("최고 점수", value: "\(statistics?.highestScore ?? 0)", unit: "점")
                statisticTile("최다 연승", value: "\(statistics?.longestWinStreak ?? 0)", unit: "연승")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .sheet(isPresented: $detailPresented) {
            GameStatisticsDetail(mode: mode, statistics: statistics)
                .frame(minWidth: 620, minHeight: 610)
        }
    }

    private func statisticTile(_ label: String, value: String, unit: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(Color(red: 0.78, green: 0.87, blue: 0.66))
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.system(size: 22, weight: .black, design: .serif))
                if let unit {
                    Text(unit).font(.system(size: 12, weight: .black))
                }
            }
            .foregroundStyle(Color(red: 1.0, green: 0.88, blue: 0.30))
            .lineLimit(1)
            .minimumScaleFactor(0.66)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background {
            RoundedRectangle(cornerRadius: 11)
                .fill(LinearGradient(
                    colors: [Color(red: 0.20, green: 0.34, blue: 0.18), Color(red: 0.10, green: 0.22, blue: 0.13)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
        }
        .overlay(RoundedRectangle(cornerRadius: 11).stroke(Color(red: 0.42, green: 0.50, blue: 0.24), lineWidth: 1))
    }
}

private struct StatisticsDetailButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 11, weight: .black))
            .foregroundStyle(Color(red: 0.31, green: 0.20, blue: 0.10))
            .padding(.horizontal, 11)
            .frame(minHeight: 29)
            .background(HwatuTheme.cream.opacity(configuration.isPressed ? 0.72 : 0.94), in: Capsule())
            .overlay(Capsule().stroke(Color(red: 0.49, green: 0.31, blue: 0.14), lineWidth: 1.5))
    }
}

private struct GameStatisticsDetail: View {
    @Environment(\.dismiss) private var dismiss
    let mode: GameMode
    let statistics: GameModeStatistics?

    private let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("내 \(mode.title) 전적").font(.caption.weight(.black)).foregroundStyle(HwatuTheme.muted)
                        Text("재미 기록").font(.system(size: 28, weight: .black, design: .serif))
                    }
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .black))
                            .frame(width: 30, height: 30)
                            .background(Color.white.opacity(0.56), in: Circle())
                            .overlay(Circle().stroke(Color.black.opacity(0.14)))
                    }
                    .buttonStyle(.plain)
                    .keyboardShortcut(.cancelAction)
                    .accessibilityLabel("닫기")
                }
                recentResults
                HStack(spacing: 10) {
                    moneyTile("누적 정산", value: signedMoney(statistics?.totalSettlement ?? 0))
                    moneyTile("최고 한 판 수익", value: signedMoney(statistics?.biggestWinAmount ?? 0))
                }
                LazyVGrid(columns: columns, spacing: 10) {
                    recordTile("고 선언", total: statistics?.totalGoCount, maximum: statistics?.highestWinningGoCount, maximumLabel: "최고 승리")
                    recordTile("싹쓸이", total: statistics?.totalSweepCount, maximum: statistics?.maxSweepCount)
                    recordTile("폭탄", total: statistics?.totalBombCount, maximum: statistics?.maxBombCount)
                    recordTile("흔들기", total: statistics?.totalShakeCount, maximum: statistics?.maxShakeCount)
                    recordTile("뻑", total: statistics?.totalPpeokCount, maximum: statistics?.maxPpeokCount)
                }
                HStack(spacing: 8) {
                    specialTile("첫 뻑", value: statistics?.openingPpeokCount ?? 0, suffix: "회")
                    specialTile("삼뻑 승리", value: statistics?.threePpeokWins ?? 0, suffix: "회")
                    specialTile("광박 승리", value: statistics?.gwangBakWins ?? 0, suffix: "판")
                    specialTile("피박 승리", value: statistics?.piBakWins ?? 0, suffix: "판")
                }
                Text(trackingNotice)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(HwatuTheme.muted)
            }
            .padding(26)
        }
        .background(LinearGradient(
            colors: [Color(red: 0.98, green: 0.94, blue: 0.75), Color(red: 0.84, green: 0.72, blue: 0.44)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        ))
    }

    private var recentResults: some View {
        HStack(spacing: 9) {
            Text("최근 경기").font(.callout.weight(.black))
            if let results = statistics?.recentResults, !results.isEmpty {
                ForEach(Array(results.enumerated()), id: \.offset) { _, result in
                    Text(resultLabel(result))
                        .font(.caption.weight(.black))
                        .foregroundStyle(.white)
                        .frame(width: 30, height: 30)
                        .background(resultColor(result), in: Circle())
                }
            } else {
                Text("아직 완료한 판이 없습니다.").font(.caption).foregroundStyle(HwatuTheme.muted)
            }
            Spacer()
            if let nagari = statistics?.nagari, nagari > 0 {
                Text("나가리 \(nagari)판 · 승률 계산 제외").font(.caption).foregroundStyle(HwatuTheme.muted)
            }
        }
    }

    private var trackingNotice: String {
        guard let count = statistics?.specialStatsTrackedGames, count > 0 else {
            return "특수 기록은 다음 완료 판부터 누적됩니다."
        }
        return "특수 기록은 통계 기능 적용 이후 완료한 \(count)판 기준입니다."
    }

    private func moneyTile(_ label: String, value: String) -> some View {
        HStack {
            Text(label).font(.caption.weight(.bold))
            Spacer()
            Text(value).font(.headline.weight(.black)).foregroundStyle(HwatuTheme.deepRed)
        }
        .padding(14)
        .frame(maxWidth: .infinity)
        .background(Color.black.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
    }

    private func recordTile(_ label: String, total: Int?, maximum: Int?, maximumLabel: String = "한 판 최고") -> some View {
        HStack {
            Text(label).font(.callout.weight(.black))
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("누적 \(total ?? 0)회").font(.callout.weight(.bold))
                Text("\(maximumLabel) \(maximum ?? 0)회").font(.caption).foregroundStyle(HwatuTheme.muted)
            }
        }
        .padding(13)
        .background(Color.white.opacity(0.48), in: RoundedRectangle(cornerRadius: 11))
    }

    private func specialTile(_ label: String, value: Int, suffix: String) -> some View {
        VStack(spacing: 4) {
            Text(label).font(.caption.weight(.bold))
            Text("\(value)\(suffix)").font(.headline.weight(.black)).foregroundStyle(Color.yellow)
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(HwatuTheme.deepGreen, in: RoundedRectangle(cornerRadius: 10))
    }

    private func signedMoney(_ value: Int64) -> String {
        "\(value > 0 ? "+" : "")\(value.koreanMoney)냥"
    }

    private func resultLabel(_ result: String) -> String {
        switch result { case "win": "승"; case "loss": "패"; case "draw": "무"; default: "나" }
    }

    private func resultColor(_ result: String) -> Color {
        switch result { case "win": HwatuTheme.red; case "loss": HwatuTheme.deepGreen; default: HwatuTheme.muted }
    }
}
