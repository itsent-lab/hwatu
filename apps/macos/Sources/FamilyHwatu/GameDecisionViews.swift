import SwiftUI

struct GameStartOverlay: View {
    let resumed: Bool
    @Binding var difficulty: AIDifficulty
    let start: () -> Void

    var body: some View {
        ModalCard(title: resumed ? "이어서 칠까요?" : "패를 받고 시작하세요", subtitle: "게임 시작을 누르면 패 치는 소리와 AI 선언 음성이 재생됩니다.") {
            VStack(spacing: 14) {
                Text("시원한 손맛 효과음 준비 완료")
                    .font(.caption.weight(.black))
                    .foregroundStyle(HwatuTheme.gold)
                HStack(spacing: 7) {
                    ForEach(AIDifficulty.allCases) { level in
                        Button(level.title) { difficulty = level }
                            .buttonStyle(.borderedProminent)
                            .tint(level == difficulty ? HwatuTheme.red : Color.gray.opacity(0.55))
                    }
                }
                Button("게임 시작", action: start)
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .tint(HwatuTheme.red)
            }
        }
    }
}

struct GookjinChoiceView: View {
    let choose: (Bool) -> Void

    var body: some View {
        ModalCard(title: "국진을 선택하세요", subtitle: "현재 점수와 다음 승부 판정에 즉시 반영됩니다.") {
            VStack(spacing: 13) {
                Text("열끗으로 두면 고도리·멍따 계산에, 쌍피로 바꾸면 피 점수와 피박 계산에 포함됩니다.")
                    .font(.callout.weight(.semibold))
                    .foregroundStyle(Color.white.opacity(0.82))
                    .multilineTextAlignment(.center)
                HStack(spacing: 12) {
                    Button("열끗으로 사용") { choose(false) }
                    Button("쌍피로 사용") { choose(true) }
                }
                .buttonStyle(.borderedProminent)
                .tint(HwatuTheme.red)
            }
        }
    }
}

struct AIChoiceWaitingView: View {
    let player: PlayerID

    var body: some View {
        ModalCard(title: "\(player.displayName)의 선택", subtitle: "상대가 현재 점수와 남은 패를 보고 고·스톱을 결정하고 있습니다.") {
            HStack(spacing: 12) {
                Label("고", systemImage: "arrow.up.circle.fill")
                Label("스톱", systemImage: "hand.raised.fill")
            }
            .font(.headline.weight(.black))
            .foregroundStyle(Color.white.opacity(0.58))
            ProgressView().controlSize(.small).tint(HwatuTheme.gold)
        }
        .allowsHitTesting(true)
    }
}
