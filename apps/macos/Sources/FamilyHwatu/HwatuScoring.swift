import Foundation

enum HwatuScoring {
    static func prefersGookjinAsPee(_ cards: [HwatuCard]) -> Bool {
        score(cards, gookjinAsPee: true).total >= score(cards, gookjinAsPee: false).total
    }

    static func score(_ cards: [HwatuCard], gookjinAsPee: Bool = false) -> CapturedScore {
        let brights = cards.filter { $0.kind == .bright }
        let animals = cards.filter { $0.kind == .animal && !($0.tags.contains("gookjin") && gookjinAsPee) }
        let ribbons = cards.filter { $0.kind == .ribbon }
        let pee = cards.reduce(0) { total, card in
            if card.tags.contains("gookjin") && gookjinAsPee { return total + 2 }
            return total + card.peeValue
        }
        var lines: [CapturedScore.Line] = []
        switch brights.count {
        case 3: lines.append(.init(label: brights.contains(where: { $0.tags.contains("rain") }) ? "비삼광" : "삼광", points: brights.contains(where: { $0.tags.contains("rain") }) ? 2 : 3))
        case 4: lines.append(.init(label: "사광", points: 4))
        case 5...: lines.append(.init(label: "오광", points: 15))
        default: break
        }
        if animals.count >= 5 { lines.append(.init(label: "열끗", points: animals.count - 4)) }
        if [2, 4, 8].allSatisfy({ month in animals.contains(where: { $0.month == month && $0.tags.contains("godori") }) }) {
            lines.append(.init(label: "고도리", points: 5))
        }
        if ribbons.count >= 5 { lines.append(.init(label: "띠", points: ribbons.count - 4)) }
        appendRibbonSet("홍단", tag: "hongdan", ribbons: ribbons, lines: &lines)
        appendRibbonSet("청단", tag: "cheongdan", ribbons: ribbons, lines: &lines)
        appendRibbonSet("초단", tag: "chodan", ribbons: ribbons, lines: &lines)
        if pee >= 10 { lines.append(.init(label: "피", points: pee - 9)) }
        return CapturedScore(brightCount: brights.count, animalCount: animals.count, ribbonCount: ribbons.count, junkCount: pee, lines: lines)
    }

    static func finalScore(baseScore: Int, goCount: Int, mode: GameMode) -> Int {
        if mode == .gostop { return max(1, baseScore + goCount) }
        let goMultiplier = goCount >= 3 ? Int(pow(2.0, Double(goCount - 2))) : 1
        return max(1, (baseScore + goCount) * goMultiplier)
    }

    private static func appendRibbonSet(_ label: String, tag: String, ribbons: [HwatuCard], lines: inout [CapturedScore.Line]) {
        if ribbons.filter({ $0.tags.contains(tag) }).count == 3 { lines.append(.init(label: label, points: 3)) }
    }
}
