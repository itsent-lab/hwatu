import SwiftUI

struct ScorePanel: View {
    let score: CapturedScore
    let compact: Bool
    var shakeCount = 0
    var bombCount = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(score.total)점").font(compact ? .headline : .title2.bold()).foregroundStyle(HwatuTheme.gold)
            if shakeCount > 0 {
                Text("🔔 \(max(0, shakeCount - bombCount))  💣 \(bombCount)")
                    .font(.caption2.weight(.black))
                    .foregroundStyle(Color(red: 1.0, green: 0.86, blue: 0.34))
            }
            ForEach(score.lines) { Text("\($0.label) \($0.points)").font(.caption2).foregroundStyle(Color(red: 0.74, green: 0.87, blue: 0.88)) }
            if score.lines.isEmpty { Text("점수 없음").font(.caption2).foregroundStyle(Color(red: 0.74, green: 0.87, blue: 0.88)) }
        }
        .padding(10)
        .background(Color(red: 0.078, green: 0.255, blue: 0.184).opacity(0.86), in: RoundedRectangle(cornerRadius: 11))
        .overlay(RoundedRectangle(cornerRadius: 11).stroke(Color(red: 0.867, green: 0.882, blue: 0.510).opacity(0.70), lineWidth: 2))
    }
}

struct ModalCard<Content: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder let content: Content

    var body: some View {
        ZStack {
            Color(red: 0.024, green: 0.106, blue: 0.078).opacity(0.72).ignoresSafeArea()
            VStack(spacing: 18) {
                Text(title).font(.system(size: 30, weight: .black, design: .serif)).foregroundStyle(.white)
                Text(subtitle).foregroundStyle(Color(red: 0.81, green: 0.91, blue: 0.93))
                content
            }
            .padding(30)
            .frame(minWidth: 420)
            .background(LinearGradient(colors: [Color(red: 0.192, green: 0.373, blue: 0.314), Color(red: 0.090, green: 0.247, blue: 0.208)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 20))
            .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color(red: 1.0, green: 0.941, blue: 0.604), lineWidth: 4))
            .shadow(color: .black.opacity(0.60), radius: 25, y: 14)
        }
    }
}

struct ArcadeRedButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.callout.weight(.black))
            .foregroundStyle(.white)
            .padding(.horizontal, 15)
            .frame(minHeight: 40)
            .background(LinearGradient(colors: [Color(red: 0.88, green: 0.15, blue: 0.19), Color(red: 0.55, green: 0.02, blue: 0.06)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(Color(red: 0.40, green: 0.02, blue: 0.05), lineWidth: 2))
            .shadow(color: .black.opacity(0.35), radius: 3, y: 3)
            .opacity(configuration.isPressed ? 0.8 : 1)
    }
}

struct CompactGameButtonStyle: ButtonStyle {
    let active: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.caption.weight(.black))
            .foregroundStyle(active ? HwatuTheme.gold : Color.white.opacity(0.78))
            .padding(.horizontal, 9)
            .frame(minHeight: 34)
            .background(active ? Color(red: 0.06, green: 0.31, blue: 0.38) : Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(active ? HwatuTheme.gold.opacity(0.7) : Color.white.opacity(0.12)))
            .opacity(configuration.isPressed ? 0.75 : 1)
    }
}

struct GameModalSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .black))
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .frame(minHeight: 48)
            .background(Color.white.opacity(configuration.isPressed ? 0.18 : 0.09), in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.36), lineWidth: 1))
    }
}

struct ReserveExitButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.foregroundStyle(.white).padding(.horizontal, 15).frame(minHeight: 72)
            .background(LinearGradient(colors: [Color(red: 0.47, green: 0.79, blue: 0.11), Color(red: 0.25, green: 0.58, blue: 0.02)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 13))
            .overlay(RoundedRectangle(cornerRadius: 13).stroke(Color(red: 0.22, green: 0.49, blue: 0), lineWidth: 3))
            .opacity(configuration.isPressed ? 0.82 : 1)
    }
}

struct ImmediateExitButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.foregroundStyle(.white).padding(.horizontal, 15).frame(minHeight: 72)
            .background(LinearGradient(colors: [Color(red: 0.94, green: 0.35, blue: 0.26), Color(red: 0.71, green: 0.13, blue: 0.13)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 13))
            .overlay(RoundedRectangle(cornerRadius: 13).stroke(Color(red: 0.62, green: 0.15, blue: 0.12), lineWidth: 3))
            .opacity(configuration.isPressed ? 0.82 : 1)
    }
}

struct ExitCancelButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.callout.weight(.black)).foregroundStyle(Color(red: 0.33, green: 0.38, blue: 0.20))
            .frame(minWidth: 170, minHeight: 44)
            .background(Color(red: 0.97, green: 0.96, blue: 0.83), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(red: 0.52, green: 0.54, blue: 0.37), lineWidth: 2))
            .opacity(configuration.isPressed ? 0.8 : 1)
    }
}
