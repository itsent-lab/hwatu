import SwiftUI

enum NativeCapturedCardGroup: String, CaseIterable, Identifiable {
    case bright, animal, ribbon, junk

    var id: String { rawValue }
    var label: String {
        switch self {
        case .bright: "광"
        case .animal: "열끗"
        case .ribbon: "띠"
        case .junk: "피"
        }
    }
}

struct NativeCapturedCardSection: Identifiable, Equatable {
    let group: NativeCapturedCardGroup
    let cards: [HwatuCard]
    let displayedCount: Int
    var id: String { group.id }
}

enum NativeCapturedCardGrouping {
    static func sections(cards: [HwatuCard], gookjinAsPee: Bool) -> [NativeCapturedCardSection] {
        NativeCapturedCardGroup.allCases.compactMap { group in
            let grouped = cards.filter { groupFor($0, gookjinAsPee: gookjinAsPee) == group }
                .sorted { ($0.month, $0.id) < ($1.month, $1.id) }
            guard !grouped.isEmpty else { return nil }
            let count = group == .junk ? grouped.reduce(0) { $0 + displayedPeeValue($1, gookjinAsPee: gookjinAsPee) } : grouped.count
            return NativeCapturedCardSection(group: group, cards: grouped, displayedCount: count)
        }
    }

    static func preferredGookjinAsPee(cards: [HwatuCard]) -> Bool {
        HwatuScoring.prefersGookjinAsPee(cards)
    }

    private static func groupFor(_ card: HwatuCard, gookjinAsPee: Bool) -> NativeCapturedCardGroup {
        if card.tags.contains("gookjin"), gookjinAsPee { return .junk }
        return switch card.kind {
        case .bright: .bright
        case .animal: .animal
        case .ribbon: .ribbon
        case .junk, .doubleJunk: .junk
        }
    }

    private static func displayedPeeValue(_ card: HwatuCard, gookjinAsPee: Bool) -> Int {
        card.tags.contains("gookjin") && gookjinAsPee ? 2 : card.peeValue
    }
}

enum NativeCapturedRackLayout {
    static let minimumGroupWidth = 46.0
    static let maximumGroupWidth = 240.0

    static func gap(for rackWidth: Double) -> Double {
        min(14, max(7, rackWidth * 0.01375))
    }

    static func cardWidth(for rackWidth: Double) -> Double {
        min(62, max(38, rackWidth * 0.06113))
    }

    static func groupWidths(cardCounts: [Int], rackWidth: Double, gap: Double) -> [Double] {
        guard !cardCounts.isEmpty else { return [] }
        let weights = cardCounts.map { Double(max(2, min($0, 12))) }
        let contentWidth = max(0, rackWidth - gap * Double(max(0, cardCounts.count - 1)))
        var remainingWidth = contentWidth
        var pending = Array(cardCounts.indices)
        var result = Array(repeating: 0.0, count: cardCounts.count)

        while !pending.isEmpty {
            let totalWeight = pending.reduce(0.0) { $0 + weights[$1] }
            var constrained: [Int] = []
            for index in pending {
                let proposed = totalWeight > 0 ? remainingWidth * weights[index] / totalWeight : 0
                if proposed > maximumGroupWidth {
                    result[index] = maximumGroupWidth
                    constrained.append(index)
                } else if proposed < minimumGroupWidth {
                    result[index] = minimumGroupWidth
                    constrained.append(index)
                }
            }
            if constrained.isEmpty {
                for index in pending {
                    result[index] = totalWeight > 0 ? remainingWidth * weights[index] / totalWeight : minimumGroupWidth
                }
                break
            }
            for index in constrained {
                remainingWidth -= result[index]
                pending.removeAll { $0 == index }
            }
        }
        return result
    }
}

struct WebParityCapturedRack: View {
    let cards: [HwatuCard]
    let owner: PlayerID
    var gookjinAsPee = false
    var selectGookjin: (() -> Void)?
    @Namespace private var cardMovement

    var body: some View {
        GeometryReader { geometry in
            let sections = NativeCapturedCardGrouping.sections(cards: cards, gookjinAsPee: gookjinAsPee)
            let rackWidth = geometry.size.width
            let gap = NativeCapturedRackLayout.gap(for: rackWidth)
            let widths = NativeCapturedRackLayout.groupWidths(
                cardCounts: sections.map(\.cards.count),
                rackWidth: rackWidth,
                gap: gap
            )
            HStack(alignment: .bottom, spacing: gap) {
                ForEach(Array(sections.enumerated()), id: \.element.id) { index, section in
                    WebParityCapturedGroup(
                        section: section,
                        width: widths[index],
                        height: geometry.size.height,
                        cardWidth: NativeCapturedRackLayout.cardWidth(for: rackWidth),
                        owner: owner,
                        gookjinAsPee: gookjinAsPee,
                        selectGookjin: selectGookjin,
                        cardMovement: cardMovement
                    )
                }
            }
            .frame(width: rackWidth, height: geometry.size.height, alignment: .leading)
        }
        .frame(minWidth: 160, minHeight: 70, alignment: .leading)
        .animation(.timingCurve(0.2, 0.8, 0.3, 1, duration: 0.44), value: gookjinAsPee)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(owner == .human ? "내 획득 패" : "상대 획득 패")
    }
}

private struct WebParityCapturedGroup: View {
    let section: NativeCapturedCardSection
    let width: Double
    let height: Double
    let cardWidth: Double
    let owner: PlayerID
    let gookjinAsPee: Bool
    let selectGookjin: (() -> Void)?
    let cardMovement: Namespace.ID
    @State private var gookjinHovered = false

    private var cardHeight: Double { cardWidth * 168.2 / 103.2 }
    private var fanBottom: Double { 15 }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            ZStack(alignment: .topLeading) {
                ForEach(Array(section.cards.enumerated()), id: \.element.id) { index, card in
                    capturedCard(card)
                        .matchedGeometryEffect(id: card.id, in: cardMovement)
                        .offset(
                            x: cardOffset(index: index),
                            y: height - fanBottom - cardHeight
                        )
                        .zIndex(Double(index))
                }
            }
            .frame(width: width, height: height, alignment: .topLeading)
            Text("\(section.group.label) \(section.displayedCount)")
                .font(.system(size: min(10.56, max(7.68, cardWidth * 0.206)), weight: .black))
                .foregroundStyle(Color(red: 1, green: 0.95, blue: 0.55))
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(Color(red: 0.18, green: 0.39, blue: 0).opacity(0.90), in: Capsule())
                .shadow(color: Color(red: 0.09, green: 0.26, blue: 0).opacity(0.4), radius: 1.5, y: 1)
                .zIndex(100)
        }
        .frame(width: width, height: height)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(section.group.label) \(section.displayedCount)")
    }

    private func cardOffset(index: Int) -> Double {
        guard section.cards.count > 1 else { return 0 }
        return Double(index) / Double(section.cards.count - 1) * max(0, width - cardWidth)
    }

    @ViewBuilder
    private func capturedCard(_ card: HwatuCard) -> some View {
        if card.tags.contains("gookjin"), owner == .human, let selectGookjin {
            Button(action: selectGookjin) { labeledGookjin(card) }
                .buttonStyle(.plain)
                .brightness(gookjinHovered ? 0.12 : 0)
                .scaleEffect(gookjinHovered ? 1.05 : 1)
                .offset(y: gookjinHovered ? -6 : 0)
                .onHover { gookjinHovered = $0 }
                .accessibilityLabel("국진은 현재 \(gookjinAsPee ? "쌍피" : "열끗"), 눌러서 변경")
        } else {
            WebCapturedCardFace(card: card, width: cardWidth, height: cardHeight)
        }
    }

    private func labeledGookjin(_ card: HwatuCard) -> some View {
        WebCapturedCardFace(card: card, width: cardWidth, height: cardHeight)
            .overlay(RoundedRectangle(cornerRadius: 5).stroke(Color(red: 1, green: 0.84, blue: 0.24), lineWidth: 3))
            .overlay(alignment: .top) {
                Text(gookjinAsPee ? "쌍피" : "열끗")
                    .font(.system(size: min(9.28, max(7.2, cardWidth * 0.175)), weight: .black)).foregroundStyle(.white)
                    .padding(.horizontal, 5).padding(.vertical, 2)
                    .background(LinearGradient(colors: [Color(red: 0.90, green: 0.28, blue: 0.18), Color(red: 0.62, green: 0.06, blue: 0.09)], startPoint: .top, endPoint: .bottom), in: Capsule())
                    .overlay(Capsule().stroke(Color(red: 1, green: 0.94, blue: 0.48), lineWidth: 2))
                    .offset(y: -10)
            }
    }
}

private struct WebCapturedCardFace: View {
    let card: HwatuCard
    let width: Double
    let height: Double

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 5).fill(Color(red: 1, green: 0.99, blue: 0.97))
            if card.isBonus {
                LinearGradient(
                    colors: [Color(red: 0.93, green: 0.13, blue: 0.17), Color(red: 0.65, green: 0.03, blue: 0.07)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                VStack(spacing: 2) {
                    Text(card.id == "bonus-triple" ? "三" : "雙")
                        .font(.system(size: width * 0.48, weight: .black, design: .serif))
                    Text(card.id == "bonus-triple" ? "삼피" : "쌍피")
                        .font(.system(size: width * 0.16, weight: .black))
                }
                .foregroundStyle(Color(red: 1, green: 0.95, blue: 0.45))
            } else if let image = CardResource.image(named: card.assetName) {
                Image(nsImage: image).resizable().scaledToFit().padding(1)
            }
        }
        .frame(width: width, height: height)
        .clipShape(RoundedRectangle(cornerRadius: 5))
        .shadow(color: Color(red: 0.18, green: 0.35, blue: 0).opacity(0.40), radius: 2.5, y: 2)
    }
}

struct CapturedRack: View {
    let cards: [HwatuCard]
    var compact = false
    var gookjinAsPee = false
    var toggleGookjin: (() -> Void)?
    var body: some View {
        HStack(spacing: compact ? -28 : -24) {
            ForEach(cards.suffix(compact ? 7 : 16)) { card in
                if card.tags.contains("gookjin"), let toggleGookjin {
                    HwatuCardView(card: card, compact: true, action: toggleGookjin)
                        .overlay(alignment: .bottom) {
                            Text(gookjinAsPee ? "쌍피" : "열끗").font(.system(size: 9, weight: .black)).foregroundStyle(.white)
                                .padding(.horizontal, 5).padding(.vertical, 2).background(HwatuTheme.red, in: Capsule()).offset(y: 5)
                        }
                } else { HwatuCardView(card: card, compact: true) }
            }
        }
        .frame(minWidth: compact ? 80 : 160, alignment: .leading)
    }
}
