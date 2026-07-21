import SwiftUI

enum MatgoAutoPlayAvailability {
    static func isDisabled(active: Bool, started: Bool, ended: Bool, dealing: Bool, hasPendingChoice: Bool) -> Bool {
        ended || (!active && (!started || dealing || hasPendingChoice))
    }
}

struct WebParityMatgoAutoPlayZone: View {
    @Binding var autoPlay: Bool
    @Binding var discardConfirmation: Bool
    let autoPlayDisabled: Bool

    var body: some View {
        VStack(spacing: 4) {
            WebParityDiscardConfirmationButton(enabled: $discardConfirmation)
            NativeAutoPlayButton(
                active: $autoPlay,
                disabled: autoPlayDisabled,
                matgoDock: true
            )
        }
        .frame(width: 88)
    }
}

private struct WebParityDiscardConfirmationButton: View {
    @Binding var enabled: Bool

    var body: some View {
        Button { enabled.toggle() } label: {
            HStack(spacing: 4) {
                Text(enabled ? "2" : "1")
                    .font(.system(size: 12, weight: .black))
                    .foregroundStyle(.white)
                    .frame(width: 23, height: 23)
                    .background(enabled ? Color(red: 0.89, green: 0.48, blue: 0.09) : Color(red: 0.09, green: 0.54, blue: 0.74), in: Circle())
                    .overlay(Circle().stroke(enabled ? Color(red: 1.0, green: 0.95, blue: 0.63) : Color(red: 0.89, green: 0.98, blue: 1.0), lineWidth: 2))

                VStack(alignment: .leading, spacing: 1) {
                    Text(enabled ? "확인 후 내기" : "바로 내기")
                        .font(.system(size: 9, weight: .black))
                    Text(enabled ? "두 번 터치" : "한 번 터치")
                        .font(.system(size: 7, weight: .black))
                        .foregroundStyle(enabled ? Color(red: 1.0, green: 0.94, blue: 0.66) : Color(red: 0.78, green: 0.94, blue: 1.0))
                }
                .lineLimit(1)
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 5)
            .padding(.vertical, 3)
            .frame(maxWidth: .infinity, minHeight: 34, alignment: .leading)
            .background(backgroundGradient, in: RoundedRectangle(cornerRadius: 9))
            .overlay(
                RoundedRectangle(cornerRadius: 9)
                    .stroke(enabled ? Color(red: 1.0, green: 0.88, blue: 0.44) : Color(red: 0.61, green: 0.87, blue: 0.95), lineWidth: 2)
            )
            .shadow(color: enabled ? Color.orange.opacity(0.32) : Color.black.opacity(0.34), radius: 3, y: 2)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("버림패 확인 \(enabled ? "켜짐, 두 번 터치" : "꺼짐, 한 번 터치")")
        .accessibilityAddTraits(enabled ? .isSelected : [])
        .help(enabled ? "버림패를 확인한 뒤 두 번 터치해서 냅니다" : "버림패를 한 번 터치하면 바로 냅니다")
    }

    private var backgroundGradient: LinearGradient {
        LinearGradient(
            colors: enabled
                ? [Color(red: 0.67, green: 0.33, blue: 0.16), Color(red: 0.44, green: 0.19, blue: 0.12)]
                : [Color(red: 0.27, green: 0.40, blue: 0.52), Color(red: 0.15, green: 0.24, blue: 0.35)],
            startPoint: .top,
            endPoint: .bottom
        )
    }
}
