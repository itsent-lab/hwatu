import SwiftUI
import AppKit

struct HwatuCardView: View {
    let card: HwatuCard
    var selected = false
    var compact = false
    var large = false
    var room = false
    var dealer = false
    var dealerCompact = false
    var action: (() -> Void)?
    @State private var hovering = false

    var body: some View {
        Group {
            if let action {
                Button(action: action) { cardBody }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(card.month)월 \(card.name) \(card.kind.label) 내기")
            } else { cardBody }
        }
        .help("\(card.month)월 · \(card.name) · \(card.kind.label)")
        .onHover { hovering = $0 }
    }

    private var cardBody: some View {
        ZStack {
            RoundedRectangle(cornerRadius: compact ? 5 : ((dealer || dealerCompact) ? 8 : 7))
                .fill(Color(red: 0.95, green: 0.91, blue: 0.79))
            if card.isBonus {
                VStack(spacing: 2) {
                    Text(card.id == "bonus-triple" ? "三" : "雙").font(.system(size: compact ? 18 : (dealerCompact ? 21 : 25), weight: .black, design: .serif))
                    Text(card.id == "bonus-triple" ? "삼피" : "쌍피").font(.system(size: compact ? 7 : 9, weight: .bold))
                }.foregroundStyle(HwatuTheme.red)
            } else if let image = CardResource.image(named: card.assetName) {
                Image(nsImage: image).resizable().scaledToFit().padding(2)
            } else {
                VStack(spacing: 2) {
                    Text("\(card.month)").font(.system(size: 20, weight: .black, design: .rounded))
                    Text(card.kind.label).font(.caption2.bold())
                }.foregroundStyle(HwatuTheme.red)
            }
        }
        .frame(
            width: compact ? 42 : (dealerCompact ? 58 : (dealer ? 84 : (large ? 82 : (room ? 72 : 62)))),
            height: compact ? 64 : (dealerCompact ? 95 : (dealer ? 137 : (large ? 134 : (room ? 118 : 94))))
        )
        .overlay(RoundedRectangle(cornerRadius: compact ? 5 : ((dealer || dealerCompact) ? 8 : 7)).stroke(selected ? HwatuTheme.gold : Color.black.opacity(0.35), lineWidth: selected ? 3 : 1))
        .offset(y: hovering && action != nil ? -5 : 0)
        .shadow(color: .black.opacity(0.3), radius: selected ? 8 : 3, y: 3)
        .animation(.easeOut(duration: 0.14), value: hovering)
    }
}

enum CardResource {
    private static var cache: [String: NSImage] = [:]
    static func image(named name: String) -> NSImage? {
        if let cached = cache[name] { return cached }
        let embeddedBundle = Bundle.main.resourceURL
            .map { $0.appendingPathComponent("FamilyHwatuMac_FamilyHwatu.bundle") }
            .flatMap(Bundle.init(url:))
        let url = embeddedBundle?.url(forResource: name, withExtension: "svg")
            ?? Bundle.module.url(forResource: name, withExtension: "svg")
        guard let url, let image = NSImage(contentsOf: url) else { return nil }
        cache[name] = image
        return image
    }
}

struct CardBackView: View {
    var compact = false
    var dealer = false
    var dealerCompact = false
    var body: some View {
        RoundedRectangle(cornerRadius: compact ? 5 : ((dealer || dealerCompact) ? 8 : 7))
            .fill(LinearGradient(colors: [Color(red: 0.88, green: 0.06, blue: 0.10), Color(red: 0.52, green: 0.01, blue: 0.04)], startPoint: .topLeading, endPoint: .bottomTrailing))
            .overlay(RoundedRectangle(cornerRadius: compact ? 3 : 5).stroke(HwatuTheme.gold.opacity(0.92), lineWidth: 2).padding(4))
            .overlay(Text("花").font(.system(size: compact ? 15 : (dealerCompact ? 25 : (dealer ? 38 : 25)), weight: .black, design: .serif)).foregroundStyle(HwatuTheme.gold))
            .frame(width: compact ? 42 : (dealerCompact ? 58 : (dealer ? 84 : 62)), height: compact ? 64 : (dealerCompact ? 95 : (dealer ? 137 : 94)))
            .shadow(color: .black.opacity(0.3), radius: 3, y: 3)
    }
}
