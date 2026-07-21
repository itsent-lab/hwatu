import SwiftUI

enum NativeAIThinkingKind {
    case turn
    case goStop
    case chongtong
}

struct NativeAIThinkingPlan: Equatable {
    let durationMilliseconds: Int
    let label: String

    var duration: Double { Double(durationMilliseconds) / 1_000 }

    static func make(
        difficulty: AIDifficulty,
        gameIdentifier: String,
        turnNumber: Int,
        kind: NativeAIThinkingKind,
        automaticPlay: Bool
    ) -> NativeAIThinkingPlan {
        let ranges: [AIDifficulty: (Double, Double)] = [
            .easy: (650, 1_050),
            .normal: (800, 1_350),
            .hard: (950, 1_600),
            .expert: (1_050, 1_800)
        ]
        let seed = stableSeed(gameIdentifier)
        let mixed = sin(seed * 0.017 + Double(turnNumber) * 12.9898 + 17) * 43_758.5453
        let variation = abs(mixed - mixed.rounded(.towardZero))
        let range = ranges[difficulty] ?? ranges[.normal]!
        let needsDeliberation = kind != .turn || variation > 0.72
        let quickDuration = range.0 + (range.1 - range.0) * variation
        let thoughtfulDuration = 2_200 + variation * 2_800
        let naturalDuration = min(5_000, Int((needsDeliberation ? thoughtfulDuration : quickDuration).rounded()))
        let duration = automaticPlay ? Int((900 + variation * 400).rounded()) : naturalDuration
        let label: String
        switch kind {
        case .goStop: label = "고·스톱을 고민하는 중…"
        case .chongtong: label = "총통 승부를 고민하는 중…"
        case .turn: label = variation > 0.72 ? "한 수 더 살펴보는 중…" : "낼 패를 고르는 중…"
        }
        return .init(durationMilliseconds: duration, label: label)
    }

    private static func stableSeed(_ value: String) -> Double {
        var hash: UInt64 = 14_695_981_039_346_656_037
        for byte in value.utf8 {
            hash ^= UInt64(byte)
            hash &*= 1_099_511_628_211
        }
        return Double(hash % 1_000_000)
    }
}

struct NativeAutoPlayButton: View {
    @Binding var active: Bool
    let disabled: Bool
    var compact = false
    var matgoDock = false
    var width: CGFloat? = nil
    var height: CGFloat? = nil
    @State private var pulsing = false

    var body: some View {
        Button { active.toggle() } label: {
            VStack(spacing: itemSpacing) {
                Text(active ? "Ⅱ" : "↻")
                    .font(.system(size: iconFontSize, weight: .black, design: .rounded))
                    .foregroundStyle(active ? Color.white : Color(red: 0.03, green: 0.44, blue: 0.68))
                    .frame(width: iconSize, height: iconSize)
                    .background(active ? Color(red: 0.85, green: 0.16, blue: 0.15) : Color(red: 0.88, green: 0.98, blue: 1.0).opacity(0.82), in: Circle())
                    .overlay(Circle().stroke(active ? Color(red: 1.0, green: 0.95, blue: 0.46) : Color(red: 0.02, green: 0.37, blue: 0.60), lineWidth: iconBorderWidth))
                    .shadow(color: Color.black.opacity(0.24), radius: 1, y: 2)
                Spacer(minLength: 0)
                Text(active ? "자동 치는 중" : "자동 치기")
                    .font(.system(size: titleFontSize, weight: .black))
                    .foregroundStyle(active ? Color.white : Color(red: 1.0, green: 0.97, blue: 0.43))
                Text(active ? "눌러서 멈춤" : "편하게 관전")
                    .font(.system(size: subtitleFontSize, weight: .black))
                    .foregroundStyle(active ? Color.white : Color(red: 0.88, green: 0.98, blue: 1.0))
            }
            .padding(.horizontal, horizontalPadding)
            .padding(.vertical, verticalPadding)
            .frame(maxWidth: width == nil ? .infinity : nil, maxHeight: height == nil ? .infinity : nil)
            .frame(width: width, height: height)
            .background(buttonGradient, in: RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(RoundedRectangle(cornerRadius: cornerRadius).stroke(active ? Color(red: 1.0, green: 0.96, blue: 0.42) : Color(red: 0.85, green: 0.97, blue: 1.0), lineWidth: outerBorderWidth))
            .shadow(color: active ? Color.yellow.opacity(0.70) : Color.cyan.opacity(0.38), radius: active ? 15 : 9, y: active ? 0 : 3)
            .brightness(active && pulsing ? 0.10 : 0)
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.5 : 1)
        .onAppear { updatePulse(active) }
        .onChange(of: active) { _, enabled in updatePulse(enabled) }
        .accessibilityLabel(active ? "자동 치는 중, 눌러서 멈춤" : "자동 치기, 편하게 관전")
    }

    private var buttonGradient: LinearGradient {
        let colors = active
            ? [Color(red: 1.0, green: 0.78, blue: 0.24), Color(red: 0.95, green: 0.55, blue: 0.03), Color(red: 0.83, green: 0.32, blue: 0.02), Color(red: 0.93, green: 0.47, blue: 0.03)]
            : [Color(red: 0.39, green: 0.85, blue: 0.97), Color(red: 0.14, green: 0.68, blue: 0.89), Color(red: 0.03, green: 0.47, blue: 0.74), Color(red: 0.07, green: 0.58, blue: 0.82)]
        return LinearGradient(
            stops: [.init(color: colors[0], location: 0), .init(color: colors[1], location: 0.49), .init(color: colors[2], location: 0.50), .init(color: colors[3], location: 1)],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    private var itemSpacing: CGFloat { matgoDock ? 4 : (compact ? 4 : 7) }
    private var iconSize: CGFloat { matgoDock ? 39 : (compact ? 40 : 54) }
    private var iconFontSize: CGFloat { matgoDock ? 25 : (compact ? 19 : 25) }
    private var iconBorderWidth: CGFloat { matgoDock ? 4 : (compact ? 3 : 5) }
    private var titleFontSize: CGFloat { matgoDock ? 13 : (compact ? 10 : 13) }
    private var subtitleFontSize: CGFloat { matgoDock ? 8 : (compact ? 7 : 9) }
    private var horizontalPadding: CGFloat { matgoDock ? 4 : (compact ? 4 : 8) }
    private var verticalPadding: CGFloat { matgoDock ? 5 : (compact ? 7 : 10) }
    private var cornerRadius: CGFloat { matgoDock ? 9 : (compact ? 13 : 17) }
    private let outerBorderWidth: CGFloat = 4

    private func updatePulse(_ enabled: Bool) {
        pulsing = false
        guard enabled else { return }
        withAnimation(.easeInOut(duration: 0.625).repeatForever(autoreverses: true)) { pulsing = true }
    }
}

struct WebParityAIThinkingView: View {
    let plan: NativeAIThinkingPlan
    @State private var remaining = 1.0

    var body: some View {
        VStack {
            VStack(spacing: 7) {
                Text("상대가 고르는 중")
                    .font(.system(size: 21, weight: .black))
                    .foregroundStyle(Color(red: 1.0, green: 0.95, blue: 0.43))
                    .shadow(color: Color(red: 0.19, green: 0.39, blue: 0), radius: 0, y: 2)
                Text(plan.label)
                    .font(.system(size: 12, weight: .black))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.20))
                        Capsule()
                            .fill(LinearGradient(colors: [Color(red: 1.0, green: 0.95, blue: 0.35), Color(red: 1.0, green: 0.61, blue: 0.10)], startPoint: .leading, endPoint: .trailing))
                            .frame(width: geometry.size.width * remaining)
                    }
                }
                .frame(height: 8)
                .overlay(Capsule().stroke(Color(red: 1.0, green: 1.0, blue: 0.75).opacity(0.44), lineWidth: 1))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(width: 410)
            .background(LinearGradient(colors: [Color(red: 0.17, green: 0.44, blue: 0).opacity(0.97), Color(red: 0.09, green: 0.30, blue: 0).opacity(0.98)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(red: 1.0, green: 0.94, blue: 0.42), lineWidth: 3))
            .shadow(color: Color.black.opacity(0.48), radius: 10, y: 8)
            Spacer()
        }
        .padding(.top, 52)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .allowsHitTesting(false)
        .onAppear {
            remaining = 1
            withAnimation(.linear(duration: plan.duration)) { remaining = 0 }
        }
    }
}

struct WebParityRoundResultView: View {
    @ObservedObject var session: GameSession
    let balance: Int64
    let moneyTransfer: NativeMoneyTransfer?
    let moneySyncState: GameMoneySyncState
    let exitReserved: Bool
    let retryMoneySync: () -> Void
    let continueRound: () -> Void
    let exit: () -> Void
    @State private var appeared = false

    var body: some View {
        ZStack {
            Rectangle()
                .fill(Color(red: 0.14, green: 0.38, blue: 0).opacity(0.76))
                .background(.ultraThinMaterial)
                .ignoresSafeArea()
            VStack(spacing: 0) {
                resultContent
                footer
            }
            .padding(30)
            .frame(width: 540)
            .fixedSize(horizontal: false, vertical: true)
            .background(LinearGradient(colors: [Color(red: 1.0, green: 0.99, blue: 0.91), Color(red: 0.92, green: 0.87, blue: 0.68)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 24))
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color(red: 0.36, green: 0.58, blue: 0.03), lineWidth: 4))
            .shadow(color: Color(red: 0.12, green: 0.29, blue: 0).opacity(0.50), radius: 30, y: 18)
            .scaleEffect(appeared ? 1 : 0.94)
            .offset(y: appeared ? 0 : 18)
            .opacity(appeared ? 1 : 0)
        }
        .allowsHitTesting(true)
        .onAppear { withAnimation(.spring(response: 0.38, dampingFraction: 0.76)) { appeared = true } }
    }

    private var resultContent: some View {
        VStack(spacing: 10) {
            Text(session.mode == .matgo ? "판 결과" : "고스톱 판 결과")
                .font(.system(size: 12, weight: .black))
                .tracking(2.2)
                .foregroundStyle(Color(red: 0.42, green: 0.56, blue: 0.09))
            Text(resultTitle)
                .font(.system(size: 27, weight: .black))
                .foregroundStyle(Color(red: 0.20, green: 0.26, blue: 0.08))
            if let settlement = session.settlement {
                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text("\(settlement.finalScore)")
                        .font(.system(size: 58, weight: .black, design: .serif))
                    Text("점").font(.headline.weight(.black))
                }
                .foregroundStyle(Color(red: 0.71, green: 0.11, blue: 0.14))
                settlementChips(settlement)
                settlementMoney(settlement)
            } else {
                Text(session.lastAction)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Color(red: 0.43, green: 0.44, blue: 0.30))
                    .multilineTextAlignment(.center)
                    .padding(.vertical, 12)
                if let moneyTransfer { ResultMoneyCard(transfer: moneyTransfer, opponentName: "컴퓨터") }
            }
        }
        .padding(.horizontal, 3)
    }

    private var resultTitle: String {
        guard let winner = session.winner else { return "이번 판은 나가리입니다." }
        if session.mode == .matgo {
            return winner == .human ? "내가 이겼습니다!" : "\(winner.displayName) 님이 이겼습니다."
        }
        return "\(winner.displayName) 승리!"
    }

    private func settlementChips(_ settlement: NativeSettlement) -> some View {
        let chips = resultChips(settlement)
        return LazyVGrid(columns: [GridItem(.adaptive(minimum: 91, maximum: 112), spacing: 7)], spacing: 7) {
            ForEach(Array(chips.enumerated()), id: \.offset) { index, chip in
                ResultChip(chip: chip)
                    .transition(.scale.combined(with: .opacity))
                    .animation(.spring(response: 0.42, dampingFraction: 0.62).delay(Double(index) * 0.08), value: appeared)
            }
        }
        .padding(11)
        .background(Color.white.opacity(0.58), in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 0.84, green: 0.64, blue: 0.17), lineWidth: 3))
    }

    @ViewBuilder
    private func settlementMoney(_ settlement: NativeSettlement) -> some View {
        if let moneyTransfer {
            ResultMoneyCard(
                transfer: moneyTransfer,
                opponentName: "컴퓨터",
                note: settlement.paymentExempt == true ? settlement.paymentExemptReason : nil
            )
        } else if settlement.paymentExempt == true {
            ResultPendingCard(text: settlement.paymentExemptReason ?? "게임머니 지급이 면제되었습니다.")
        } else if case let .failed(message) = moneySyncState {
            VStack(spacing: 8) {
                Text(message).font(.caption.weight(.bold)).multilineTextAlignment(.center)
                Button("다시 동기화", action: retryMoneySync).buttonStyle(ResultActionButtonStyle(kind: .continueRound))
            }
            .padding(12)
            .foregroundStyle(Color(red: 0.52, green: 0.14, blue: 0.12))
            .background(Color(red: 1.0, green: 0.88, blue: 0.77), in: RoundedRectangle(cornerRadius: 11))
        } else {
            ResultPendingCard(text: "게임머니 \(settlement.displayAmount.koreanMoney)냥을 정산하고 있습니다.")
        }
    }

    private var footer: some View {
        VStack(spacing: 10) {
            Divider().overlay(Color(red: 0.44, green: 0.47, blue: 0.27).opacity(0.35))
            if balance <= 0 {
                Text("게임머니가 0냥입니다. 대기실에서 리필한 뒤 다시 시작해 주세요.")
                    .font(.callout.weight(.black)).foregroundStyle(Color(red: 0.52, green: 0.14, blue: 0.12))
                    .padding(10).frame(maxWidth: .infinity)
                    .background(Color(red: 1.0, green: 0.95, blue: 0.74), in: RoundedRectangle(cornerRadius: 11))
                Button("대기실로 가서 리필 받기", action: exit)
                    .buttonStyle(ResultActionButtonStyle(kind: .refill))
                    .disabled(moneySyncState != .synced)
            } else if exitReserved {
                Text("예약하신 대로 잠시 후 게임을 나갑니다.").font(.callout.weight(.black))
                Button("지금 나가기", action: exit)
                    .buttonStyle(ResultActionButtonStyle(kind: .exit))
                    .disabled(moneySyncState != .synced)
            } else {
                Text(session.mode == .matgo ? "계속하시겠습니까? 확인하면 다음 판이 바로 시작됩니다." : "한 판 더 진행할까요?")
                    .font(.callout.weight(.black))
                    .foregroundStyle(Color(red: 0.26, green: 0.33, blue: 0.11))
                HStack(spacing: 9) {
                    Button(session.mode == .matgo ? "확인 · 바로 시작" : "한 판 더", action: continueRound)
                        .buttonStyle(ResultActionButtonStyle(kind: .continueRound))
                    Button("나가기", action: exit).buttonStyle(ResultActionButtonStyle(kind: .exit))
                }
                .disabled(moneySyncState != .synced)
            }
        }
        .padding(.top, 10)
    }

    private func resultChips(_ settlement: NativeSettlement) -> [ResultChipModel] {
        var chips: [ResultChipModel] = []
        if let winner = session.winner {
            let lines = session.score(for: winner).lines.filter { $0.points > 0 }
            if lines.isEmpty { chips.append(.init(label: "기본 점수", value: "\(settlement.baseScore)점", kind: .score)) }
            else { chips += lines.map { .init(label: $0.label, value: "+\($0.points)점", kind: .score) } }
        }
        if (settlement.goMultiplier ?? 1) > 1 { chips.append(.init(label: "고", value: "×\(settlement.goMultiplier ?? 1)", kind: .multiplier)) }
        if (settlement.shakeMultiplier ?? 1) > 1 { chips.append(.init(label: "흔들기·폭탄", value: "×\(settlement.shakeMultiplier ?? 1)", kind: .multiplier)) }
        if (settlement.missionMultiplier ?? 1) > 1 { chips.append(.init(label: "미션", value: "×\(settlement.missionMultiplier ?? 1)", kind: .multiplier)) }
        if (settlement.roundMultiplier ?? 1) > 1 { chips.append(.init(label: "나가리 이월", value: "×\(settlement.roundMultiplier ?? 1)", kind: .multiplier)) }
        if session.mode == .gostop, let payments = settlement.loserPayments {
            for payment in payments {
                chips += payment.baks.map { .init(label: $0, value: "\(payment.loser.displayName) ×2", kind: .bak) }
            }
            if let dokbak = settlement.dokbakPlayer { chips.append(.init(label: "독박", value: "\(dokbak.displayName) 두 몫", kind: .bak)) }
        } else {
            chips += (settlement.baks ?? []).map { .init(label: $0, value: "×2", kind: .bak) }
        }
        return chips
    }
}

private struct ResultChipModel {
    enum Kind { case score, multiplier, bak }
    let label: String
    let value: String
    let kind: Kind
}

private struct ResultChip: View {
    let chip: ResultChipModel

    var body: some View {
        VStack(spacing: 2) {
            Text(chip.label).font(.system(size: 10, weight: .black)).lineLimit(1)
            Text(chip.value).font(.system(size: 16, weight: .black)).lineLimit(1)
        }
        .frame(maxWidth: .infinity, minHeight: 48)
        .foregroundStyle(foreground)
        .background(background, in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(border, lineWidth: 2))
        .shadow(color: Color.brown.opacity(0.20), radius: 3, y: 3)
    }

    private var foreground: Color {
        chip.kind == .bak ? .white : (chip.kind == .score ? Color(red: 0.21, green: 0.33, blue: 0.05) : Color(red: 0.43, green: 0.23, blue: 0.05))
    }

    private var border: Color {
        switch chip.kind {
        case .score: Color(red: 0.38, green: 0.57, blue: 0.12)
        case .multiplier: Color(red: 0.58, green: 0.39, blue: 0.12)
        case .bak: Color(red: 0.65, green: 0.10, blue: 0.13)
        }
    }

    private var background: LinearGradient {
        let colors: [Color]
        switch chip.kind {
        case .score: colors = [Color(red: 0.91, green: 0.96, blue: 0.68), Color(red: 0.72, green: 0.83, blue: 0.35)]
        case .multiplier: colors = [Color(red: 1.0, green: 0.89, blue: 0.60), Color(red: 0.91, green: 0.68, blue: 0.22)]
        case .bak: colors = [Color(red: 1.0, green: 0.55, blue: 0.39), Color(red: 0.84, green: 0.18, blue: 0.20)]
        }
        return LinearGradient(colors: colors, startPoint: .top, endPoint: .bottom)
    }
}

private struct ResultPendingCard: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.system(size: 13, weight: .black))
            .foregroundStyle(Color(red: 0.43, green: 0.44, blue: 0.30))
            .frame(maxWidth: .infinity)
            .padding(13)
            .background(Color.white.opacity(0.58), in: RoundedRectangle(cornerRadius: 11))
    }
}

private struct ResultMoneyCard: View {
    let transfer: NativeMoneyTransfer
    let opponentName: String
    var note: String? = nil
    @State private var coinsDropped = false

    var body: some View {
        VStack(spacing: 6) {
            Text("내 게임머니 증감").font(.caption.weight(.black))
            Text("\(transfer.amount > 0 ? "+" : "")\(transfer.amount.koreanMoney)냥")
                .font(.system(size: 34, weight: .black, design: .serif))
            if let note {
                HStack { Text("게임머니 지급 면제").fontWeight(.black); Spacer(); Text(note) }
                    .font(.caption.weight(.bold)).padding(8)
                    .background(Color.white.opacity(0.42), in: RoundedRectangle(cornerRadius: 9))
            }
            if transfer.amount > 0, transfer.opponentAfter == 0 {
                HStack { Text("ALL IN").font(.headline.weight(.black)); Text("\(opponentName) 게임머니 전액 획득").font(.caption.weight(.black)) }
                    .foregroundStyle(.white).padding(6).frame(maxWidth: .infinity)
                    .background(Color(red: 0.66, green: 0.10, blue: 0.13), in: RoundedRectangle(cornerRadius: 9))
            }
            if let refill = transfer.opponentRefillAfter {
                HStack { Text("\(opponentName) 자동 리필").fontWeight(.black); Spacer(); Text("0 → \(refill.koreanMoney)냥") }
                    .font(.caption.weight(.bold)).padding(8)
                    .background(Color.white.opacity(0.42), in: RoundedRectangle(cornerRadius: 9))
            }
        }
        .foregroundStyle(transfer.amount >= 0 ? Color(red: 0.32, green: 0.21, blue: 0.04) : Color(red: 0.42, green: 0.13, blue: 0.12))
        .padding(15)
        .frame(maxWidth: .infinity)
        .background(moneyBackground, in: RoundedRectangle(cornerRadius: 15))
        .overlay(RoundedRectangle(cornerRadius: 15).stroke(transfer.amount >= 0 ? Color(red: 0.84, green: 0.64, blue: 0.17) : Color(red: 0.70, green: 0.23, blue: 0.20), lineWidth: 3))
        .overlay {
            GeometryReader { geometry in
                ForEach(0..<7, id: \.self) { index in
                    Text("냥")
                        .font(.system(size: 7, weight: .black))
                        .foregroundStyle(Color(red: 0.49, green: 0.30, blue: 0))
                        .frame(width: 24, height: 24)
                        .background(Color(red: 1.0, green: 0.85, blue: 0.29), in: Circle())
                        .overlay(Circle().stroke(Color(red: 0.62, green: 0.42, blue: 0.03), lineWidth: 2))
                        .position(x: geometry.size.width * CGFloat(0.08 + Double(index) * 0.14), y: -18)
                        .offset(y: coinsDropped ? 155 : 0)
                        .opacity(coinsDropped ? 0 : 0.92)
                        .animation(.easeOut(duration: 0.9).delay(Double([0, 3, 1, 5, 2, 6, 4][index]) * 0.04), value: coinsDropped)
                }
            }
            .allowsHitTesting(false)
        }
        .clipped()
        .onAppear { coinsDropped = true }
    }

    private var moneyBackground: LinearGradient {
        let colors = transfer.amount >= 0
            ? [Color(red: 1.0, green: 0.97, blue: 0.73), Color(red: 0.91, green: 0.74, blue: 0.26)]
            : [Color(red: 1.0, green: 0.88, blue: 0.77), Color(red: 0.91, green: 0.58, blue: 0.45)]
        return LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

private struct ResultActionButtonStyle: ButtonStyle {
    enum Kind { case continueRound, exit, refill }
    let kind: Kind

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .black))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(gradient, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(border, lineWidth: 3))
            .shadow(color: shadow, radius: 0, y: configuration.isPressed ? 1 : 4)
            .offset(y: configuration.isPressed ? 3 : 0)
    }

    private var gradient: LinearGradient {
        let colors: [Color]
        switch kind {
        case .continueRound: colors = [Color(red: 0.47, green: 0.79, blue: 0.11), Color(red: 0.25, green: 0.58, blue: 0.02)]
        case .exit: colors = [Color(red: 0.94, green: 0.35, blue: 0.26), Color(red: 0.71, green: 0.13, blue: 0.13)]
        case .refill: colors = [Color(red: 0.94, green: 0.65, blue: 0.18), Color(red: 0.73, green: 0.39, blue: 0.05)]
        }
        return LinearGradient(colors: colors, startPoint: .top, endPoint: .bottom)
    }

    private var border: Color {
        switch kind {
        case .continueRound: Color(red: 0.22, green: 0.49, blue: 0)
        case .exit: Color(red: 0.55, green: 0.14, blue: 0.11)
        case .refill: Color(red: 0.74, green: 0.44, blue: 0.05)
        }
    }

    private var shadow: Color {
        switch kind {
        case .continueRound: Color(red: 0.17, green: 0.44, blue: 0)
        case .exit: Color(red: 0.52, green: 0.09, blue: 0.08)
        case .refill: Color(red: 0.55, green: 0.28, blue: 0.03)
        }
    }
}
