import SwiftUI

struct GostopScorePulse: Identifiable, Equatable {
    let id = UUID()
    let player: PlayerID
    let score: Int
    let delta: Int
}

struct GostopLegacyDealEffectView: View {
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                CardBackView(compact: true)
                    .position(x: geometry.size.width * 0.5, y: geometry.size.height * 0.35)
                    .shadow(color: .black.opacity(0.48), radius: 9, y: 7)
                ForEach(0..<21, id: \.self) { index in
                    GostopDealCard(index: index, size: geometry.size)
                }
                Text("세 사람에게 패를 나누고 있습니다")
                    .font(.system(size: 15, weight: .black))
                    .foregroundStyle(Color(red: 1.0, green: 0.96, blue: 0.55))
                    .padding(.horizontal, 13).padding(.vertical, 6)
                    .background(Color(red: 0.16, green: 0.42, blue: 0.02).opacity(0.86), in: Capsule())
                    .overlay(Capsule().stroke(Color(red: 0.91, green: 1.0, blue: 0.70).opacity(0.64), lineWidth: 2))
                    .position(x: geometry.size.width * 0.5, y: geometry.size.height * 0.43)
            }
        }
        .ignoresSafeArea().allowsHitTesting(true)
    }
}

private struct GostopDealCard: View {
    let index: Int
    let size: CGSize
    @State private var flying = false
    @State private var visible = false

    var body: some View {
        CardBackView(compact: true)
            .scaleEffect(flying && index % 3 != 2 ? 0.72 : 1)
            .rotationEffect(.degrees(flying ? rotation : 0))
            .position(flying ? destination : source)
            .opacity(visible ? 1 : 0)
            .onAppear {
                Task { @MainActor in
                    try? await Task.sleep(for: .milliseconds(index * 48))
                    visible = true
                    withAnimation(.timingCurve(0.18, 0.76, 0.22, 1, duration: 0.68)) { flying = true }
                    try? await Task.sleep(for: .milliseconds(450))
                    withAnimation(.easeOut(duration: 0.23)) { visible = false }
                }
            }
    }

    private var source: CGPoint { CGPoint(x: size.width * 0.5, y: size.height * 0.35) }
    private var handOffset: Double { Double(index / 3 - 3) * 20 }
    private var rotation: Double { index % 3 == 0 ? -8 : (index % 3 == 1 ? 8 : 2) }
    private var destination: CGPoint {
        switch index % 3 {
        case 0: CGPoint(x: size.width * 0.12 + handOffset, y: size.height * 0.09)
        case 1: CGPoint(x: size.width * 0.88 + handOffset, y: size.height * 0.09)
        default: CGPoint(x: size.width * 0.5 + handOffset, y: size.height * 0.78)
        }
    }
}

struct GostopLegacyDeclarationEffectView: View {
    let text: String
    @State private var visible = false
    var body: some View {
        Text(text).font(.system(size: 34, weight: .black, design: .serif)).foregroundStyle(.white)
            .padding(.horizontal, 30).padding(.vertical, 15)
            .background(LinearGradient(colors: [Color(red: 0.93, green: 0.22, blue: 0.13), Color(red: 0.57, green: 0.03, blue: 0.04)], startPoint: .top, endPoint: .bottom), in: Capsule())
            .overlay(Capsule().stroke(HwatuTheme.gold, lineWidth: 4)).shadow(color: HwatuTheme.gold.opacity(0.58), radius: 18)
            .scaleEffect(visible ? 1 : 0.45).rotationEffect(.degrees(visible ? -2 : -12)).opacity(visible ? 1 : 0)
            .onAppear { withAnimation(.spring(response: 0.32, dampingFraction: 0.55)) { visible = true } }.allowsHitTesting(false)
    }
}

struct GostopLegacyRuleEventView: View {
    let events: [NativeRuleEvent]
    var body: some View {
        HStack(spacing: 8) {
            ForEach(events) { event in
                VStack(spacing: 2) {
                    Text(event.label + "!").font(.headline.weight(.black))
                    if !event.stolenPee.isEmpty {
                        Text("피 \(event.stolenPee.reduce(0) { $0 + max(1, $1.peeValue) })장 뺏기").font(.caption2.weight(.black))
                    }
                }.foregroundStyle(.white).padding(.horizontal, 13).padding(.vertical, 8)
                    .background(LinearGradient(colors: [HwatuTheme.red, Color(red: 0.49, green: 0.01, blue: 0.04)], startPoint: .top, endPoint: .bottom), in: Capsule())
                    .overlay(Capsule().stroke(HwatuTheme.gold, lineWidth: 2))
            }
        }.shadow(color: .black.opacity(0.5), radius: 8, y: 5)
    }
}

struct GostopLegacyScorePulseView: View {
    let pulse: GostopScorePulse
    @State private var visible = false
    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 1) {
                Text("+\(pulse.delta)").font(.system(size: 28, weight: .black, design: .rounded))
                Text("\(pulse.score)점").font(.caption.weight(.black))
            }.foregroundStyle(HwatuTheme.gold).padding(.horizontal, 15).padding(.vertical, 8)
                .background(Color(red: 0.09, green: 0.27, blue: 0.10).opacity(0.94), in: Capsule())
                .overlay(Capsule().stroke(.white.opacity(0.8), lineWidth: 2))
                .scaleEffect(visible ? 1 : 0.45).opacity(visible ? 1 : 0)
                .position(position(in: geometry.size))
                .onAppear { withAnimation(.spring(response: 0.3, dampingFraction: 0.58)) { visible = true } }
        }.allowsHitTesting(false)
    }

    private func position(in size: CGSize) -> CGPoint {
        switch pulse.player {
        case .human: CGPoint(x: size.width - 145, y: size.height - 195)
        case .computer: CGPoint(x: size.width - 145, y: 125)
        case .computerA: CGPoint(x: 310, y: 125)
        case .computerB: CGPoint(x: size.width - 310, y: 125)
        }
    }
}
