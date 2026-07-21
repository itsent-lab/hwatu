import SwiftUI

struct NativeDeclarationEffect: Identifiable, Equatable {
    enum Kind: String {
        case go, stop, score, settlement, capture, ppeok, ppeokChain, ppeokTriple
        case bomb, shake, bonus, doublePee, triplePee, mission
        case jjok, ttadak, sweep, ppeokCapture, selfPpeok
    }

    let id = UUID()
    let kind: Kind
    let text: String
    let detail: String?
    let durationMilliseconds: Int
    var peeBurstValue: Int? = nil
    var peeBurstText: String? = nil

    var isFiveGo: Bool {
        kind == .go && (Int(text.prefix { $0.isNumber }) ?? 0) >= 5
    }
}

@MainActor
enum NativeMatgoEffectFactory {
    static func specialDeclarations(for session: GameSession) -> [NativeDeclarationEffect] {
        guard session.mode == .matgo, session.specialNotice != nil else { return [] }
        let events = session.lastRuleEvents
        guard let bomb = events.first(where: { $0.kind == .bomb || $0.kind == .nuclearBomb }) else {
            return singleSpecialDeclaration(for: session).map { [$0] } ?? []
        }
        var declarations = [eventDeclaration(bomb, allEvents: [bomb], session: session)]
        let following = events.filter { $0.id != bomb.id }
        if let ppeok = following.first(where: { $0.kind == .ppeok }) {
            declarations.append(ppeokDeclaration(for: ppeok, session: session))
        } else if let special = primarySpecialEvent(following) {
            declarations.append(eventDeclaration(special, allEvents: following, session: session))
        }
        return declarations
    }

    static func specialDeclaration(for session: GameSession) -> NativeDeclarationEffect? {
        specialDeclarations(for: session).first
    }

    private static func singleSpecialDeclaration(for session: GameSession) -> NativeDeclarationEffect? {
        guard session.mode == .matgo, let notice = session.specialNotice else { return nil }
        if notice.contains("폭탄 보관패") || notice.contains("국진을") { return nil }
        if notice.contains("고!") { return goDeclaration(session) }
        if notice.hasPrefix("스톱!") { return settlementDeclaration(session) }
        if notice.contains("총통") { return chongtongDeclaration(session, notice: notice) }

        let events = session.lastRuleEvents
        if let ppeok = events.first(where: { $0.kind == .ppeok }) {
            return ppeokDeclaration(for: ppeok, session: session)
        }
        if let event = primarySpecialEvent(events) { return eventDeclaration(event, allEvents: events, session: session) }
        if notice.contains("보너스") { return bonusDeclaration(session, notice: notice) }
        if notice.contains("흔들") {
            let opponent = session.lastRuleEvents.first?.player != .human
            let month = monthInLastAction(session)
            let detail = opponent ? "상대가 \(month)월 세 장을 공개했습니다." : "\(month)월 세 장을 공개했습니다."
            return .init(kind: .shake, text: "흔들기!", detail: detail, durationMilliseconds: opponent ? 1_100 : 1_200)
        }
        return .init(kind: .score, text: notice, detail: nil, durationMilliseconds: 950)
    }

    private static func ppeokDeclaration(for event: NativeRuleEvent, session: GameSession) -> NativeDeclarationEffect {
        let count = session.ppeokCounts[event.player] ?? 1
        if count >= 3 { return .init(kind: .ppeokTriple, text: "삼연뻑!", detail: "세 번째 뻑 · 기본 7점 즉시 승리", durationMilliseconds: 1_750) }
        if count == 2 { return .init(kind: .ppeokChain, text: "연속뻑!", detail: "두 번째 뻑 · 한 번 더면 기본 7점 승리", durationMilliseconds: 1_350) }
        return .init(kind: .ppeok, text: "뻑!", detail: "첫 번째 뻑 · 바닥에 세 장 남김", durationMilliseconds: 950)
    }

    static func captureDeclaration(
        player: PlayerID,
        oldCards: [HwatuCard],
        newCards: [HwatuCard],
        session: GameSession
    ) -> NativeDeclarationEffect? {
        guard session.mode == .matgo, session.specialNotice == nil, session.lastRuleEvents.isEmpty else { return nil }
        let oldIDs = Set(oldCards.map(\.id))
        let added = newCards.filter { !oldIDs.contains($0.id) }
        guard !added.isEmpty else { return nil }
        let missionCount = added.filter { card in session.missionCards.contains(where: { $0.id == card.id }) }.count
        if missionCount > 0 {
            let multiplier = session.missionMultiplier(for: player)
            return .init(kind: .mission, text: "미션 ×\(multiplier)!", detail: "미션패 \(missionCount)장 획득", durationMilliseconds: 1_100)
        }
        let before = HwatuScoring.score(oldCards, gookjinAsPee: session.gookjinAsPee[player] == true)
        let after = session.score(for: player)
        if after.total > before.total, let line = changedHeadline(before: before, after: after) {
            let oldPoints = before.lines.first(where: { $0.label == line.label })?.points ?? 0
            return .init(kind: .score, text: "\(line.label)!", detail: "+\(line.points - oldPoints)점 · 현재 \(after.total)점", durationMilliseconds: 1_250)
        }
        return .init(kind: .capture, text: "짝!", detail: "\(added.count)장을 먹었습니다.", durationMilliseconds: 620)
    }

    private static func goDeclaration(_ session: GameSession) -> NativeDeclarationEffect {
        let player = session.mode.players.first(where: { $0 != session.currentPlayer }) ?? .human
        let count = session.goCounts[player] ?? 1
        let score = session.score(for: player)
        let detail = headline(score.lines).map { "\($0.label) · 현재 \(score.total)점" }
            ?? (player == .human ? "승부를 계속합니다." : "상대가 승부를 계속합니다.")
        return .init(kind: .go, text: "\(count)고!", detail: detail, durationMilliseconds: count >= 5 ? 1_800 : 1_150)
    }

    private static func settlementDeclaration(_ session: GameSession) -> NativeDeclarationEffect {
        guard let settlement = session.settlement, let winner = session.winner else {
            return .init(kind: .stop, text: "스톱!", detail: "점수를 확정했습니다.", durationMilliseconds: 1_600)
        }
        let baks = settlement.baks ?? []
        let title = baks.isEmpty ? "스톱!" : baks.map { "\($0) ×2" }.joined(separator: " · ") + "!"
        let line = headline(session.score(for: winner).lines)
        let scoreText = line.map { "\($0.label) +\($0.points)점 · 기본 \(settlement.baseScore)점" } ?? "기본 \(settlement.baseScore)점"
        return .init(kind: .settlement, text: title, detail: "\(scoreText) → 최종 \(settlement.finalScore)점", durationMilliseconds: 1_600)
    }

    private static func chongtongDeclaration(_ session: GameSession, notice: String) -> NativeDeclarationEffect {
        if notice.contains("흔들") {
            let opponent = session.currentPlayer != .human
            return .init(kind: .shake, text: "흔들기!", detail: opponent ? "상대가 총통을 공개했습니다." : "총통을 공개하고 계속합니다.", durationMilliseconds: 1_100)
        }
        if session.isEnded {
            return .init(kind: .stop, text: "스톱!", detail: "총통으로 7점 승리", durationMilliseconds: 1_200)
        }
        return .init(kind: .shake, text: "총통!", detail: "같은 월 네 장을 공개했습니다.", durationMilliseconds: 1_100)
    }

    private static func primarySpecialEvent(_ events: [NativeRuleEvent]) -> NativeRuleEvent? {
        let priorities: [NativeRuleEvent.Kind] = [.bomb, .nuclearBomb, .selfPpeok, .ppeokCapture, .ttadak, .jjok, .sweep, .shake]
        return events.min { left, right in
            (priorities.firstIndex(of: left.kind) ?? priorities.count) < (priorities.firstIndex(of: right.kind) ?? priorities.count)
        }
    }

    private static func eventDeclaration(_ event: NativeRuleEvent, allEvents: [NativeRuleEvent], session: GameSession) -> NativeDeclarationEffect {
        if event.kind == .bomb || event.kind == .nuclearBomb {
            let detail = [
                event.player == .human ? "\(monthInLastAction(session))월 패를 한꺼번에 냈습니다." : "상대가 패를 한꺼번에 냈습니다.",
                transferDescription(event.stolenPee, opponent: event.player != .human)
            ].filter { !$0.isEmpty }.joined(separator: " · ")
            return withPeeBurst(.init(kind: .bomb, text: "\(event.label)!", detail: detail, durationMilliseconds: 1_100), stolen: event.stolenPee, opponent: event.player != .human)
        }
        let kind: NativeDeclarationEffect.Kind
        switch event.kind {
        case .selfPpeok: kind = .selfPpeok
        case .ppeokCapture: kind = .ppeokCapture
        case .ttadak: kind = .ttadak
        case .jjok: kind = .jjok
        case .sweep: kind = .sweep
        case .shake: kind = .shake
        default: kind = .capture
        }
        let secondary = allEvents.filter { $0.id != event.id && $0.kind != .ppeok && $0.kind != .bomb && $0.kind != .nuclearBomb }
            .map { "\($0.label)까지" }
        let stolen = allEvents.flatMap(\.stolenPee)
        let details = secondary + [transferDescription(stolen, opponent: event.player != .human)].filter { !$0.isEmpty }
        let duration = strongestPee(in: stolen) == nil ? 1_100 : 1_350
        return withPeeBurst(.init(kind: kind, text: "\(event.label)!", detail: details.joined(separator: " · "), durationMilliseconds: duration), stolen: stolen, opponent: event.player != .human)
    }

    private static func bonusDeclaration(_ session: GameSession, notice: String) -> NativeDeclarationEffect {
        let player = session.lastRuleEvents.first?.player ?? session.currentPlayer
        let card = session.captured[player]?.last(where: \.isBonus)
        let value = max(2, card?.peeValue ?? (notice.contains("삼피") ? 3 : 2))
        let stolen = session.lastRuleEvents.flatMap(\.stolenPee)
        let title = value >= 3 ? "쓰리피!" : "쌍피!"
        let detail = "피 \(value)장 값" + (stolen.isEmpty ? "" : " · \(transferDescription(stolen, opponent: player != .human))")
        return .init(kind: value >= 3 ? .triplePee : .doublePee, text: title, detail: detail, durationMilliseconds: 1_250, peeBurstValue: value, peeBurstText: nil)
    }

    private static func withPeeBurst(_ effect: NativeDeclarationEffect, stolen: [HwatuCard], opponent: Bool) -> NativeDeclarationEffect {
        guard let strongest = strongestPee(in: stolen) else { return effect }
        return .init(
            kind: effect.kind,
            text: effect.text,
            detail: effect.detail,
            durationMilliseconds: effect.durationMilliseconds,
            peeBurstValue: strongest,
            peeBurstText: "\(strongest >= 3 ? "쓰리피" : "쌍피") \(opponent ? "뺏김" : "뺏기")!"
        )
    }

    private static func strongestPee(in cards: [HwatuCard]) -> Int? {
        let value = cards.map(\.peeValue).max() ?? 0
        return value >= 2 ? min(3, value) : nil
    }

    private static func transferDescription(_ cards: [HwatuCard], opponent: Bool) -> String {
        guard !cards.isEmpty else { return "" }
        let total = cards.reduce(0) { $0 + max(1, $1.peeValue) }
        let strongest = strongestPee(in: cards)
        let owner = opponent ? "내" : "상대"
        let action = opponent ? "뺏김" : "뺏기"
        if cards.count == 1, let strongest {
            return "\(owner) \(strongest >= 3 ? "쓰리피" : "쌍피") 1장(피 \(total)장 값) \(action)"
        }
        if let strongest {
            return "\(owner) \(strongest >= 3 ? "쓰리피" : "쌍피") 포함 · 피 \(total)장 값 \(action)"
        }
        return "\(owner) 피 \(cards.count)장 \(action)"
    }

    private static func changedHeadline(before: CapturedScore, after: CapturedScore) -> CapturedScore.Line? {
        let previous = Dictionary(uniqueKeysWithValues: before.lines.map { ($0.label, $0.points) })
        return headline(after.lines.filter { previous[$0.label] != $0.points })
    }

    private static func headline(_ lines: [CapturedScore.Line]) -> CapturedScore.Line? {
        let priority = ["오광", "사광", "삼광", "비삼광", "고도리", "홍단", "청단", "초단"]
        return lines.sorted { left, right in
            let leftIndex = priority.firstIndex(of: left.label)
            let rightIndex = priority.firstIndex(of: right.label)
            if leftIndex != nil || rightIndex != nil { return (leftIndex ?? priority.count) < (rightIndex ?? priority.count) }
            return left.points > right.points
        }.first
    }

    private static func monthInLastAction(_ session: GameSession) -> Int {
        let prefix = session.lastAction.components(separatedBy: "월").first ?? ""
        return Int(prefix.split(whereSeparator: { !$0.isNumber }).last ?? "") ?? 0
    }
}

struct WebParityDeclarationEffectView: View {
    let effect: NativeDeclarationEffect
    @State private var appeared = false
    @State private var burst = false
    @State private var layerVisible = false

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                if effect.kind == .ppeokChain || effect.kind == .ppeokTriple {
                    RadialGradient(colors: [Color.yellow.opacity(0.18), Color.red.opacity(0.36), Color.black.opacity(0.56)], center: .center, startRadius: 20, endRadius: 580)
                    impactRings
                }
                sparks(size: geometry.size)
                if let value = effect.peeBurstValue { peeBurst(value: value, size: geometry.size) }
                if effect.isFiveGo { fireworks(size: geometry.size) }
                VStack(spacing: 14) {
                    outlinedTitle
                    if let banner = effect.peeBurstText {
                        Text(banner).font(.system(size: 25, weight: .black, design: .rounded)).foregroundStyle(Color(red: 1, green: 0.96, blue: 0.35))
                            .padding(.horizontal, 18).padding(.vertical, 7)
                            .background(LinearGradient(colors: [Color(red: 0.93, green: 0.25, blue: 0.21), Color(red: 0.66, green: 0.05, blue: 0.10)], startPoint: .top, endPoint: .bottom), in: Capsule())
                            .overlay(Capsule().stroke(Color(red: 1, green: 0.95, blue: 0.54), lineWidth: 3))
                    }
                    if let detail = effect.detail, !detail.isEmpty {
                        Text(detail).font(.system(size: 15, weight: .black)).foregroundStyle(Color(red: 1, green: 0.97, blue: 0.62))
                            .padding(.horizontal, 18).padding(.vertical, 8)
                            .background(detailBackground, in: Capsule())
                            .overlay(Capsule().stroke(Color(red: 1, green: 1, blue: 0.63).opacity(0.72), lineWidth: 2))
                    }
                }
                .scaleEffect(appeared ? 1 : 0.52)
                .rotationEffect(.degrees(appeared ? -3 : -10))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .opacity(layerVisible ? 1 : 0)
        .allowsHitTesting(false)
        .onAppear {
            withAnimation(.easeOut(duration: 0.08)) { layerVisible = true }
            withAnimation(.spring(response: 0.44, dampingFraction: 0.58)) { appeared = true }
            withAnimation(.easeOut(duration: 0.82)) { burst = true }
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(max(160, Int(Double(effect.durationMilliseconds) * 0.72))))
                withAnimation(.easeOut(duration: Double(effect.durationMilliseconds) * 0.00028)) { layerVisible = false }
            }
        }
    }

    private var outlinedTitle: some View {
        Text(effect.text)
            .font(.system(size: titleSize, weight: .black, design: .serif))
            .tracking(-5)
            .foregroundStyle(titleColor)
            .shadow(color: strokeColor, radius: 0, x: 4, y: 0)
            .shadow(color: strokeColor, radius: 0, x: -4, y: 0)
            .shadow(color: strokeColor, radius: 0, x: 0, y: 4)
            .shadow(color: strokeColor, radius: 0, x: 0, y: -4)
            .shadow(color: lowerShadow, radius: 0, y: 8)
            .shadow(color: Color.black.opacity(0.42), radius: 12, y: 14)
    }

    private var impactRings: some View {
        ZStack {
            ForEach(0..<(effect.kind == .ppeokTriple ? 3 : 2), id: \.self) { index in
                Circle().stroke(Color(red: 1, green: 0.90, blue: 0.21).opacity(burst ? 0 : 0.88), lineWidth: 8)
                    .frame(width: 210, height: 210)
                    .scaleEffect(burst ? 1.7 + Double(index) * 0.65 : 0.72)
                    .animation(.easeOut(duration: 0.72).delay(Double(index) * 0.08), value: burst)
            }
        }
    }

    private func sparks(size: CGSize) -> some View {
        ForEach(0..<12, id: \.self) { index in
            let angle = Double(index) * .pi / 6
            Image(systemName: "sparkle").font(.system(size: 20, weight: .black)).foregroundStyle(Color(red: 1, green: 0.95, blue: 0.42))
                .position(x: size.width / 2, y: size.height / 2)
                .offset(x: burst ? cos(angle) * 230 : 0, y: burst ? sin(angle) * 150 : 0)
                .scaleEffect(burst ? 0.25 : 1.2).opacity(burst ? 0 : 1)
                .animation(.easeOut(duration: 0.82).delay(Double(index % 5) * 0.02), value: burst)
        }
    }

    private func peeBurst(value: Int, size: CGSize) -> some View {
        ForEach(0..<9, id: \.self) { index in
            let angle = Double(index) * .pi * 2 / 9
            VStack(spacing: -2) { Text("\(value)").font(.system(size: 27, weight: .black, design: .serif)); Text("피").font(.caption2.weight(.black)) }
                .foregroundStyle(Color(red: 1, green: 0.94, blue: 0.38)).frame(width: 54, height: 82)
                .background(LinearGradient(colors: [Color(red: 0.91, green: 0.16, blue: 0.22), Color(red: 0.53, green: 0.03, blue: 0.08)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 6))
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(red: 1, green: 0.84, blue: 0.51), lineWidth: 3))
                .position(x: size.width / 2, y: size.height / 2)
                .offset(x: burst ? cos(angle) * min(size.width * 0.38, 430) : 0, y: burst ? sin(angle) * min(size.height * 0.42, 280) : 0)
                .rotationEffect(.degrees(burst ? Double(index * 67 - 180) : 0)).opacity(burst ? 0 : 1)
                .animation(.easeOut(duration: 0.9).delay(Double(index % 4) * 0.025), value: burst)
        }
    }

    private func fireworks(size: CGSize) -> some View {
        ForEach(0..<36, id: \.self) { index in
            let angle = Double(index % 12) * .pi / 6
            let originX = [0.22, 0.50, 0.78][index / 12] * size.width
            let originY = [0.42, 0.24, 0.42][index / 12] * size.height
            let color = [Color.yellow, Color.red, Color.cyan, Color.orange][index % 4]
            let offsetX = burst ? cos(angle) * Double(125 + index % 4 * 24) : 0
            let offsetY = burst ? sin(angle) * Double(90 + index % 4 * 18) : 0
            Circle().fill(color).frame(width: 8, height: 8)
                .position(x: originX, y: originY)
                .offset(x: offsetX, y: offsetY)
                .opacity(burst ? 0 : 1)
                .animation(.easeOut(duration: 1.15).delay(Double(index / 12) * 0.12), value: burst)
        }
    }

    private var titleSize: CGFloat {
        switch effect.kind {
        case .capture: 92
        case .settlement: 82
        case .ppeokTriple: 132
        case .ppeokChain: 116
        default: 110
        }
    }

    private var titleColor: Color {
        switch effect.kind {
        case .stop, .settlement: Color(red: 1, green: 0.42, blue: 0.25)
        case .ppeok, .ppeokCapture: Color(red: 1, green: 0.47, blue: 0.66)
        case .ppeokChain, .ppeokTriple, .bomb, .ttadak: Color(red: 1, green: 0.94, blue: 0.28)
        case .sweep: Color(red: 0.56, green: 1, blue: 0.94)
        case .jjok: Color(red: 1, green: 0.96, blue: 0.50)
        default: Color(red: 1, green: 0.79, blue: 0.16)
        }
    }

    private var strokeColor: Color {
        switch effect.kind {
        case .jjok: Color(red: 0.09, green: 0.40, blue: 0.57)
        case .sweep: Color(red: 0.03, green: 0.44, blue: 0.41)
        case .ppeok, .ppeokCapture: Color(red: 0.44, green: 0.07, blue: 0.27)
        default: Color(red: 0.56, green: 0.07, blue: 0.02)
        }
    }

    private var lowerShadow: Color { effect.kind == .sweep ? Color.teal : Color(red: 0.86, green: 0.25, blue: 0) }
    private var detailBackground: Color { effect.kind == .settlement ? Color(red: 0.35, green: 0.09, blue: 0.07).opacity(0.96) : Color(red: 0.16, green: 0.39, blue: 0).opacity(0.94) }
}

struct WebParityDealEffectView: View {
    let mode: GameMode

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                PulsingDealDeck()
                    .position(x: geometry.size.width * 0.5, y: geometry.size.height * 0.35)
                if mode == .matgo {
                    ForEach(0..<20, id: \.self) { index in
                        DealFlyingCard(index: index, size: geometry.size)
                    }
                }
                Text("패를 나누고 있습니다").font(.system(size: 15, weight: .black)).foregroundStyle(Color(red: 1, green: 0.96, blue: 0.55))
                    .padding(.horizontal, 13).padding(.vertical, 6)
                    .background(Color(red: 0.16, green: 0.42, blue: 0).opacity(0.84), in: Capsule())
                    .overlay(Capsule().stroke(Color(red: 0.91, green: 1, blue: 0.70).opacity(0.66), lineWidth: 2))
                    .position(x: geometry.size.width * 0.5, y: geometry.size.height * 0.43)
            }
        }
        .allowsHitTesting(true)
    }
}

private struct PulsingDealDeck: View {
    @State private var pulse = false
    var body: some View {
        CardBackView(compact: true).scaleEffect(pulse ? 1.05 : 1).brightness(pulse ? 0.22 : 0)
            .animation(.easeInOut(duration: 0.68).repeatForever(autoreverses: true), value: pulse)
            .onAppear { pulse = true }
    }
}

private struct DealFlyingCard: View {
    let index: Int
    let size: CGSize
    @State private var dealt = false

    var body: some View {
        let handIndex = Double(index / 2) - 4.5
        let human = !index.isMultiple(of: 2)
        CardBackView(compact: true)
            .scaleEffect(dealt ? (human ? 1 : 0.72) : 0.62)
            .rotationEffect(.degrees(dealt ? handIndex * (human ? 2.8 : 1.2) : 0))
            .position(
                x: dealt ? size.width * 0.5 + handIndex * (human ? 52 : 23) : size.width * 0.5,
                y: dealt ? size.height * (human ? 0.93 : 0.08) : size.height * 0.35
            )
            .opacity(dealt ? 0 : 1)
            .animation(.timingCurve(0.18, 0.76, 0.22, 1, duration: 0.72).delay(Double(index) * 0.043), value: dealt)
            .onAppear { dealt = true }
    }
}

struct WebParityCardMotionEffectView: View {
    let event: NativeCardMotion
    let mode: GameMode
    @State private var progress = 0.0
    @State private var targetFlash = false

    var body: some View {
        GeometryReader { geometry in
            let start = startPoint(in: geometry.size)
            let end = endPoint(in: geometry.size)
            let point = curvePoint(start: start, end: end, progress: progress)
            ZStack {
                Circle().stroke(Color.white.opacity(targetFlash ? 0 : 0.72), lineWidth: 5)
                    .frame(width: 82, height: 82).scaleEffect(targetFlash ? 1.35 : 0.7).position(end)
                HwatuCardView(card: event.card, compact: true)
                    .rotation3DEffect(.degrees(event.kind == .drawn || event.kind == .replacement ? (1 - progress) * 170 : 0), axis: (x: 0, y: 1, z: 0))
                    .rotationEffect(.degrees(sin(progress * .pi) * (event.player == .human ? -7 : 7)))
                    .scaleEffect(1 + sin(progress * .pi) * 0.08)
                    .position(point)
                    .shadow(color: .black.opacity(0.48), radius: 9, y: 6)
            }
        }
        .allowsHitTesting(false)
        .onAppear {
            if event.delayMilliseconds > 0 {
                Task { @MainActor in
                    try? await Task.sleep(for: .milliseconds(event.delayMilliseconds))
                    startFlight()
                }
            } else { startFlight() }
        }
    }

    private func startFlight() {
        withAnimation(.timingCurve(0.2, 0.75, 0.18, 1, duration: duration)) { progress = 1 }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(Int(duration * 1_000)))
            withAnimation(.easeOut(duration: 0.17)) { targetFlash = true }
        }
    }

    private func startPoint(in size: CGSize) -> CGPoint {
        if event.kind == .drawn || event.kind == .replacement { return CGPoint(x: size.width * 0.145, y: size.height * 0.46) }
        if event.player == .human { return CGPoint(x: size.width * 0.50, y: size.height * 0.90) }
        return CGPoint(x: size.width * 0.76, y: size.height * 0.07)
    }

    private func endPoint(in size: CGSize) -> CGPoint {
        if event.kind == .replacement {
            switch event.player {
            case .human: return CGPoint(x: size.width * 0.50, y: size.height * 0.90)
            case .computer: return CGPoint(x: size.width * 0.76, y: size.height * 0.07)
            case .computerA: return CGPoint(x: size.width * 0.22, y: size.height * 0.09)
            case .computerB: return CGPoint(x: size.width * 0.78, y: size.height * 0.09)
            }
        }
        if event.card.isBonus {
            return event.player == .human ? CGPoint(x: size.width * 0.31, y: size.height * 0.72) : CGPoint(x: size.width * 0.31, y: size.height * 0.18)
        }
        return CGPoint(x: size.width * 0.47, y: size.height * 0.43)
    }

    private func curvePoint(start: CGPoint, end: CGPoint, progress: Double) -> CGPoint {
        let midpoint = CGPoint(x: (start.x + end.x) * 0.5, y: min(start.y, end.y) - 34)
        let inverse = 1 - progress
        return CGPoint(
            x: inverse * inverse * start.x + 2 * inverse * progress * midpoint.x + progress * progress * end.x,
            y: inverse * inverse * start.y + 2 * inverse * progress * midpoint.y + progress * progress * end.y
        )
    }

    private var duration: Double {
        Double(NativeGameTiming.cardFlightMilliseconds(for: mode, kind: event.kind, player: event.player)) / 1_000
    }
}
