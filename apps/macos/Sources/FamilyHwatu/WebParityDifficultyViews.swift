import SwiftUI

extension AIDifficulty {
    var webDescription: String {
        switch self {
        case .easy: "가끔 실수하고 점수가 나면 대부분 멈춰요"
        case .normal: "패와 상대 점수를 함께 살펴봐요"
        case .hard: "확률과 족보, 폭탄 시점까지 계산해요"
        case .expert: "위험 수까지 다시 계산하고 승리를 빠르게 확정해요"
        }
    }

    var nextWebDifficulty: AIDifficulty {
        let levels = AIDifficulty.allCases
        guard let index = levels.firstIndex(of: self) else { return .normal }
        return levels[(index + 1) % levels.count]
    }
}

struct WebParityDealerDifficultyPanel: View {
    let selection: AIDifficulty
    let disabled: Bool
    let select: (AIDifficulty) -> Void

    var body: some View {
        VStack(spacing: 10) {
            Text("컴퓨터 난이도")
                .font(.system(size: 18, weight: .black))
                .foregroundStyle(Color(red: 1.0, green: 0.90, blue: 0.77))
                .padding(.bottom, 1)

            ForEach(AIDifficulty.allCases) { level in
                WebParityDifficultyCard(
                    level: level,
                    selected: selection == level,
                    disabled: disabled,
                    select: { select(level) }
                )
            }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .frame(width: 304)
        .frame(minHeight: 474)
        .background(
            Color(red: 0.32, green: 0.18, blue: 0.11).opacity(0.94),
            in: RoundedRectangle(cornerRadius: 17)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 17)
                .stroke(Color(red: 0.92, green: 0.68, blue: 0.44).opacity(0.78), lineWidth: 3)
        )
        .shadow(color: .black.opacity(0.28), radius: 9, y: 7)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("컴퓨터 난이도")
    }
}

struct WebParityCompactDifficultyButton: View {
    let level: AIDifficulty
    let disabled: Bool
    let cycle: () -> Void

    var body: some View {
        Button(action: cycle) {
            VStack(spacing: 2) {
                Text(level.title)
                    .font(.system(size: 16, weight: .black))
                Text("눌러서 바꾸기")
                    .font(.system(size: 9, weight: .black))
                    .foregroundStyle(Color(red: 1.0, green: 0.95, blue: 0.49))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(level.webGradient, in: RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(level.webBorderColor, lineWidth: 2)
            )
            .shadow(color: .black.opacity(0.28), radius: 2, y: 2)
        }
        .buttonStyle(WebParityDifficultyPressStyle())
        .disabled(disabled)
        .opacity(disabled ? 0.62 : 1)
        .accessibilityLabel("컴퓨터 난이도 \(level.title), 눌러서 바꾸기")
        .help("컴퓨터 난이도 \(level.title) · 눌러서 바꾸기")
    }
}

struct WebParityDifficultyCard: View {
    let level: AIDifficulty
    let selected: Bool
    let disabled: Bool
    let select: () -> Void
    var compact = false

    var body: some View {
        Button(action: select) {
            ZStack(alignment: .topTrailing) {
                VStack(spacing: 5) {
                    Text(level.title)
                        .font(.system(size: compact ? 14 : 18, weight: .black))
                    Text(level.webDescription)
                        .font(.system(size: compact ? 9 : 11, weight: .bold))
                        .multilineTextAlignment(.center)
                        .lineSpacing(1)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .frame(maxWidth: .infinity, minHeight: compact ? 64 : 88)

                if selected {
                    Text("✓ 선택됨")
                        .font(.system(size: 9, weight: .black))
                        .foregroundStyle(Color(red: 0.09, green: 0.20, blue: 0.29))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(.white, in: Capsule())
                        .overlay(Capsule().stroke(Color(red: 0.09, green: 0.20, blue: 0.29), lineWidth: 2))
                        .shadow(color: .black.opacity(0.45), radius: 2, y: 2)
                        .padding(.top, 5)
                        .padding(.trailing, 6)
                }
            }
            .background(level.webGradient, in: RoundedRectangle(cornerRadius: 13))
            .overlay {
                RoundedRectangle(cornerRadius: 13)
                    .stroke(selected ? .white : level.webBorderColor, lineWidth: 3)
            }
            .overlay {
                if selected {
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color(red: 1.0, green: 0.89, blue: 0.24), lineWidth: 4)
                        .padding(-5)
                }
            }
            .shadow(color: selected ? Color.yellow.opacity(0.58) : .black.opacity(0.26), radius: selected ? 11 : 3, y: selected ? 0 : 3)
            .brightness(selected ? 0.05 : -0.11)
            .saturation(selected ? 1.14 : 0.72)
            .opacity(selected ? 1 : 0.72)
            .offset(y: selected ? -2 : 0)
        }
        .buttonStyle(WebParityDifficultyPressStyle())
        .disabled(disabled)
        .accessibilityLabel("\(level.title) \(level.webDescription)\(selected ? " 선택됨" : "")")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

private struct WebParityDifficultyPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .brightness(configuration.isPressed ? -0.05 : 0)
            .animation(.easeOut(duration: 0.10), value: configuration.isPressed)
    }
}

private extension AIDifficulty {
    var webGradient: LinearGradient {
        LinearGradient(colors: webGradientColors, startPoint: .top, endPoint: .bottom)
    }

    var webGradientColors: [Color] {
        switch self {
        case .easy:
            [Color(red: 0.51, green: 0.84, blue: 0.16), Color(red: 0.27, green: 0.61, blue: 0.04)]
        case .normal:
            [Color(red: 0.29, green: 0.79, blue: 0.94), Color(red: 0.08, green: 0.50, blue: 0.75)]
        case .hard:
            [Color(red: 1.0, green: 0.68, blue: 0.26), Color(red: 0.84, green: 0.35, blue: 0.13)]
        case .expert:
            [Color(red: 0.66, green: 0.45, blue: 0.91), Color(red: 0.40, green: 0.25, blue: 0.68)]
        }
    }

    var webBorderColor: Color {
        switch self {
        case .easy: Color(red: 0.20, green: 0.46, blue: 0.01)
        case .normal: Color(red: 0.03, green: 0.37, blue: 0.59)
        case .hard: Color(red: 0.60, green: 0.21, blue: 0.08)
        case .expert: Color(red: 0.25, green: 0.14, blue: 0.47)
        }
    }
}
