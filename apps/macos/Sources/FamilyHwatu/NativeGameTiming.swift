import Foundation

enum NativeGameTiming {
    static let dealerRevealMilliseconds = 1_800
    static let resultSoundMilliseconds = 520
    static let matgoRoundResultMilliseconds = 2_200
    static let targetFlashMilliseconds = 170
    static let peeTransferCardMilliseconds = 360

    static func dealMilliseconds(for mode: GameMode) -> Int {
        mode == .matgo ? 1_700 : 1_550
    }

    static func automaticHumanMilliseconds(for mode: GameMode) -> Int {
        mode == .matgo ? 1_200 : 1_300
    }

    static func aiMilliseconds(for mode: GameMode, plan: NativeAIThinkingPlan) -> Int {
        mode == .matgo ? plan.durationMilliseconds : 1_700
    }

    static func cardFlightMilliseconds(for mode: GameMode, kind: NativeCardMotion.Kind, player: PlayerID = .human) -> Int {
        switch (mode, kind, player) {
        case (.matgo, .played, .human): 320
        case (.matgo, .played, _): 360
        case (.matgo, .drawn, _): 260
        case (.matgo, .bomb, _): 360
        case (.matgo, .replacement, _): 240
        case (.gostop, .played, _): 280
        case (.gostop, .drawn, _): 230
        case (.gostop, .bomb, _): 280
        case (.gostop, .replacement, _): 230
        }
    }
}
