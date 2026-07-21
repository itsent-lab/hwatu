import Foundation

enum NativeGostopMoney {
    static let defaultComputerBalance: Int64 = 500_000
    static let maximumBalance: Int64 = 999_999_999_999

    static func settlePointDeltas(
        balances: [PlayerID: Int64],
        pointDeltas: [PlayerID: Int],
        pointValue: Int
    ) -> [PlayerID: Int64] {
        var next = balances
        let unit = Int64(max(0, pointValue))
        var remainingCredits = Dictionary(uniqueKeysWithValues: GameMode.gostop.players.compactMap { player in
            let points = pointDeltas[player] ?? 0
            return points > 0 ? (player, Int64(points) * unit) : nil
        })

        for debtor in GameMode.gostop.players {
            var debt = Int64(max(0, -(pointDeltas[debtor] ?? 0))) * unit
            guard debt > 0 else { continue }
            for creditor in GameMode.gostop.players {
                let credit = remainingCredits[creditor] ?? 0
                guard credit > 0 else { continue }
                let debtorBalance = max(0, next[debtor] ?? 0)
                let creditorCapacity = max(0, maximumBalance - (next[creditor] ?? 0))
                let payment = min(debt, credit, debtorBalance, creditorCapacity)
                next[debtor, default: 0] -= payment
                next[creditor, default: 0] += payment
                debt -= payment
                remainingCredits[creditor] = credit - payment
                if debt <= 0 || next[debtor, default: 0] <= 0 { break }
            }
        }
        if next[.computerA] == 0 { next[.computerA] = defaultComputerBalance }
        if next[.computerB] == 0 { next[.computerB] = defaultComputerBalance }
        return next
    }
}
