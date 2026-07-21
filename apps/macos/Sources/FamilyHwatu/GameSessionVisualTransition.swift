import Foundation

@MainActor
extension GameSession {
    func scheduleCardMotion(card: HwatuCard, kind: NativeCardMotion.Kind) -> NativeCardMotion {
        let delay = max(0, Int(visualTransitionDeadline.timeIntervalSinceNow * 1_000))
        let motion = NativeCardMotion(card: card, player: currentPlayer, kind: kind, delayMilliseconds: delay)
        beginVisualTransition(for: kind)
        return motion
    }

    func beginVisualTransition(for kind: NativeCardMotion.Kind) {
        let milliseconds = NativeGameTiming.cardFlightMilliseconds(for: mode, kind: kind, player: currentPlayer)
        extendVisualTransition(by: milliseconds)
    }

    func queuePeeTransfer(_ cards: [HwatuCard]) {
        guard mode == .matgo, !cards.isEmpty else { return }
        extendVisualTransition(by: cards.count * NativeGameTiming.peeTransferCardMilliseconds)
    }

    private func extendVisualTransition(by milliseconds: Int) {
        let now = Date()
        let base = visualTransitionDeadline > now ? visualTransitionDeadline : now
        visualTransitionDeadline = base.addingTimeInterval(Double(milliseconds) / 1_000)
        visualTransitionGeneration += 1
        let generation = visualTransitionGeneration
        isTurnTransitioning = true
        Task { @MainActor [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                let remaining = self.visualTransitionDeadline.timeIntervalSinceNow
                if remaining <= 0 { break }
                try? await Task.sleep(for: .milliseconds(max(1, Int(remaining * 1_000))))
            }
            guard generation == self.visualTransitionGeneration else { return }
            self.isTurnTransitioning = false
        }
    }

    func waitForVisualTransition() async {
        while isTurnTransitioning && !Task.isCancelled {
            let remaining = max(1, Int(visualTransitionDeadline.timeIntervalSinceNow * 1_000))
            try? await Task.sleep(for: .milliseconds(min(remaining, 50)))
        }
    }
}
