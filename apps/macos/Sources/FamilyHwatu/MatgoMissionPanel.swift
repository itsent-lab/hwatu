import SwiftUI

struct MatgoMissionPanel: View {
    @ObservedObject var session: GameSession

    var body: some View {
        VStack(spacing: 5) {
            HStack {
                Text("Mission").font(.headline.weight(.black).italic()).foregroundStyle(HwatuTheme.gold)
                Text("미션패").font(.caption2.weight(.black)).foregroundStyle(.white)
                Spacer()
                Text("한 장마다 ×2").font(.caption2.weight(.black)).foregroundStyle(Color(red: 1.0, green: 0.96, blue: 0.64))
            }
            HStack(spacing: 5) {
                ForEach(session.missionCards) { card in
                    let owner = owner(of: card)
                    HwatuCardView(card: card, compact: true)
                        .overlay(alignment: .bottom) {
                            Text(owner?.label ?? "×2")
                                .font(.system(size: 8, weight: .black))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 2)
                                .background(owner?.color ?? Color(red: 0.16, green: 0.43, blue: 0.10))
                        }
                        .overlay(RoundedRectangle(cornerRadius: 5).stroke(owner?.color ?? .clear, lineWidth: owner == nil ? 0 : 3))
                }
            }
            HStack {
                Text("나 ×\(session.missionMultiplier(for: .human))")
                Spacer()
                Text("최대 ×8").foregroundStyle(HwatuTheme.gold)
                Spacer()
                Text("상대 ×\(session.missionMultiplier(for: .computer))")
            }
            .font(.system(size: 9, weight: .black))
            .foregroundStyle(.white)
        }
        .padding(7)
        .background(LinearGradient(colors: [Color(red: 0.44, green: 0.27, blue: 0.12), Color(red: 0.28, green: 0.15, blue: 0.07)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 11))
        .overlay(RoundedRectangle(cornerRadius: 11).stroke(Color(red: 0.49, green: 0.29, blue: 0.10), lineWidth: 3))
    }

    private func owner(of card: HwatuCard) -> MissionOwner? {
        if session.captured[.human]?.contains(card) == true { return .human }
        if session.captured[.computer]?.contains(card) == true { return .computer }
        return nil
    }
}

private enum MissionOwner {
    case human, computer
    var label: String { self == .human ? "내 획득" : "상대 획득" }
    var color: Color { self == .human ? HwatuTheme.red : Color(red: 0.07, green: 0.42, blue: 0.65) }
}
