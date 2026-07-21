import Foundation

enum HwatuDeck {
    private struct Definition {
        let month: Int
        let kind: CardKind
        let name: String
        let tags: [String]
    }

    private static let definitions: [Definition] = [
        .init(month: 1, kind: .bright, name: "송학광", tags: ["bright"]), .init(month: 1, kind: .ribbon, name: "홍단", tags: ["hongdan"]), .init(month: 1, kind: .junk, name: "피", tags: []), .init(month: 1, kind: .junk, name: "피", tags: []),
        .init(month: 2, kind: .animal, name: "매조", tags: ["godori"]), .init(month: 2, kind: .ribbon, name: "홍단", tags: ["hongdan"]), .init(month: 2, kind: .junk, name: "피", tags: []), .init(month: 2, kind: .junk, name: "피", tags: []),
        .init(month: 3, kind: .bright, name: "벚꽃광", tags: ["bright"]), .init(month: 3, kind: .ribbon, name: "홍단", tags: ["hongdan"]), .init(month: 3, kind: .junk, name: "피", tags: []), .init(month: 3, kind: .junk, name: "피", tags: []),
        .init(month: 4, kind: .animal, name: "흑싸리 고도리", tags: ["godori"]), .init(month: 4, kind: .ribbon, name: "초단", tags: ["chodan"]), .init(month: 4, kind: .junk, name: "피", tags: []), .init(month: 4, kind: .junk, name: "피", tags: []),
        .init(month: 5, kind: .animal, name: "난초 열끗", tags: []), .init(month: 5, kind: .ribbon, name: "초단", tags: ["chodan"]), .init(month: 5, kind: .junk, name: "피", tags: []), .init(month: 5, kind: .junk, name: "피", tags: []),
        .init(month: 6, kind: .animal, name: "모란 나비", tags: []), .init(month: 6, kind: .ribbon, name: "청단", tags: ["cheongdan"]), .init(month: 6, kind: .junk, name: "피", tags: []), .init(month: 6, kind: .junk, name: "피", tags: []),
        .init(month: 7, kind: .animal, name: "홍싸리 멧돼지", tags: []), .init(month: 7, kind: .ribbon, name: "초단", tags: ["chodan"]), .init(month: 7, kind: .junk, name: "피", tags: []), .init(month: 7, kind: .junk, name: "피", tags: []),
        .init(month: 8, kind: .bright, name: "공산광", tags: ["bright"]), .init(month: 8, kind: .animal, name: "기러기", tags: ["godori"]), .init(month: 8, kind: .junk, name: "피", tags: []), .init(month: 8, kind: .junk, name: "피", tags: []),
        .init(month: 9, kind: .animal, name: "국진", tags: ["gookjin"]), .init(month: 9, kind: .ribbon, name: "청단", tags: ["cheongdan"]), .init(month: 9, kind: .junk, name: "피", tags: []), .init(month: 9, kind: .junk, name: "피", tags: []),
        .init(month: 10, kind: .animal, name: "단풍 사슴", tags: []), .init(month: 10, kind: .ribbon, name: "청단", tags: ["cheongdan"]), .init(month: 10, kind: .junk, name: "피", tags: []), .init(month: 10, kind: .junk, name: "피", tags: []),
        .init(month: 11, kind: .bright, name: "오동광", tags: ["bright"]), .init(month: 11, kind: .doubleJunk, name: "쌍피", tags: []), .init(month: 11, kind: .junk, name: "피", tags: []), .init(month: 11, kind: .junk, name: "피", tags: []),
        .init(month: 12, kind: .bright, name: "비광", tags: ["bright", "rain"]), .init(month: 12, kind: .animal, name: "비 열끗", tags: []), .init(month: 12, kind: .ribbon, name: "비 띠", tags: []), .init(month: 12, kind: .doubleJunk, name: "쌍피", tags: [])
    ]

    static let cards: [HwatuCard] = {
        var monthIndexes: [Int: Int] = [:]
        var result = definitions.map { definition -> HwatuCard in
            monthIndexes[definition.month, default: 0] += 1
            let index = monthIndexes[definition.month]!
            return HwatuCard(id: String(format: "m%02d-%02d", definition.month, index), month: definition.month, kind: definition.kind, name: definition.name, tags: definition.tags)
        }
        result.append(HwatuCard(id: "bonus-double", month: 0, kind: .doubleJunk, name: "보너스 쌍피", tags: ["bonus"]))
        result.append(HwatuCard(id: "bonus-triple", month: 0, kind: .doubleJunk, name: "보너스 삼피", tags: ["bonus"]))
        return result
    }()

    static let gostopCards: [HwatuCard] = cards + [
        HwatuCard(id: "bonus-double-2", month: 0, kind: .doubleJunk, name: "보너스 쌍피", tags: ["bonus"])
    ]

    static let byID: [String: HwatuCard] = Dictionary(uniqueKeysWithValues: gostopCards.map { ($0.id, $0) })

    static func shuffled() -> [HwatuCard] { cards.shuffled() }
    static func shuffled(for mode: GameMode) -> [HwatuCard] { (mode == .gostop ? gostopCards : cards).shuffled() }
}
