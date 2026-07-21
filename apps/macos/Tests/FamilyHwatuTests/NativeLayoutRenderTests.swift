import SwiftUI
import XCTest
import ImageIO
import UniformTypeIdentifiers
@testable import FamilyHwatu

final class NativeLayoutRenderTests: XCTestCase {
    @MainActor
    func testMatgoAndGostopBoardsRenderAtWebReferenceSize() throws {
        let deck = deterministicDeck()
        let matgo = GameSession(mode: .matgo, pointValue: 1_000, deck: deck)
        let gostop = GameSession(mode: .gostop, pointValue: 1_000, deck: deck)

        let matgoView = MatgoBoardLayout(
            session: matgo, displayName: "시화원", balance: 1_066_100, opponentBalance: 500_000,
            profileImageURL: nil, profileImageUploading: false, selectProfileImage: {},
            soundEnabled: .constant(true), voiceEnabled: .constant(true),
            backgroundMusicEnabled: .constant(NativeAudioDefaults.backgroundMusicEnabled), soundVolume: .constant(NativeAudioDefaults.volume),
            autoPlay: .constant(false), discardConfirmation: .constant(false), autoPlayDisabled: false,
            exitReserved: false,
            openExit: {}, newGame: {}, openGookjinChoice: {}, selectCard: { _ in }
        )
        .frame(width: 1_280, height: 720)

        let gostopView = GostopBoardLayout(
            session: gostop, displayName: "시화원", balance: 1_066_100,
            computerBalances: [.computerA: 510_000, .computerB: 490_000],
            soundEnabled: .constant(true), voiceEnabled: .constant(true),
            backgroundMusicEnabled: .constant(NativeAudioDefaults.backgroundMusicEnabled), soundVolume: .constant(NativeAudioDefaults.volume),
            autoPlay: .constant(false), exitReserved: false,
            openExit: {}, newGame: {}, selectCard: { _ in }
        )
        .frame(width: 1_280, height: 720)

        try assertRendered(matgoView, named: "matgo-board")
        try assertRendered(gostopView, named: "gostop-board")
    }

    @MainActor
    func testMatgoCapturedRacksRenderAtWebReferenceSize() throws {
        let session = GameSession(snapshot: capturedRackSnapshot())
        let view = MatgoBoardLayout(
            session: session, displayName: "시화원", balance: 1_066_100, opponentBalance: 500_000,
            profileImageURL: nil, profileImageUploading: false, selectProfileImage: {},
            soundEnabled: .constant(true), voiceEnabled: .constant(true),
            backgroundMusicEnabled: .constant(NativeAudioDefaults.backgroundMusicEnabled), soundVolume: .constant(NativeAudioDefaults.volume),
            autoPlay: .constant(false), discardConfirmation: .constant(false), autoPlayDisabled: false,
            exitReserved: false,
            openExit: {}, newGame: {}, openGookjinChoice: {}, selectCard: { _ in }
        )
        .frame(width: 1_280, height: 720)

        try assertRendered(view, named: "matgo-captured-racks")
    }

    @MainActor
    func testEntryFlowViewsRenderAtWebReferenceSize() throws {
        let appState = AppState()
        let user = UserProfile(
            id: 1, username: "preview", displayName: "어머니", role: "member",
            virtualBalance: 136_000, opponentBalance: 500_000,
            gostopComputerABalance: 500_000, gostopComputerBBalance: 500_000,
            profileImageUrl: nil
        )
        appState.user = user
        appState.route = .home
        appState.dashboard = DashboardData(
            user: user,
            activeSave: .init(gameUuid: "preview", turnNumber: 12, updatedAt: "2026-07-21T00:00:00Z"),
            today: .init(games: 0, wins: 0, settlement: 0)
        )

        let home = RootView(launchOnAppear: false)
            .environmentObject(appState)
            .frame(width: 1_280, height: 720)
        let dealer = DealerSelectionView(
            mode: .matgo,
            selectedPointValue: .constant(100),
            start: { _, _ in },
            exit: {}
        )
        .frame(width: 1_280, height: 720)

        try assertRendered(home, named: "home")
        try assertRendered(dealer, named: "dealer-selection")
    }

    @MainActor
    func testDifficultyViewsRenderEveryWebLevel() throws {
        let difficultyViews = ZStack {
            Color(red: 0.04, green: 0.13, blue: 0.20)
            HStack(spacing: 36) {
                WebParityDealerDifficultyPanel(selection: .hard, disabled: false) { _ in }
                VStack(spacing: 14) {
                    ForEach(AIDifficulty.allCases) { level in
                        WebParityCompactDifficultyButton(level: level, disabled: false) {}
                            .frame(width: 230)
                    }
                }
            }
        }
        .frame(width: 1_280, height: 720)

        try assertRendered(difficultyViews, named: "difficulty-levels")
    }

    @MainActor
    func testResponsiveAndAccessibilityReferenceSizesRender() throws {
        for width in [760, 720, 640, 520, 470] {
            let view = DealerSelectionView(
                mode: .matgo,
                selectedPointValue: .constant(100),
                start: { _, _ in },
                exit: {}
            )
            .environment(\.dynamicTypeSize, .accessibility2)
            .frame(width: CGFloat(width), height: 620)
            try assertRendered(view, named: "macos-\(width)x620-dealer-accessibility-ko", width: width, height: 620)
        }
    }

    @MainActor
    func testAutomaticThinkingAndSettlementViewsRenderAtWebReferenceSize() throws {
        let automatic = ZStack(alignment: .bottomTrailing) {
            Color(red: 0.28, green: 0.78, blue: 0.05)
            HStack(spacing: 24) {
                WebParityMatgoAutoPlayZone(autoPlay: .constant(false), discardConfirmation: .constant(false), autoPlayDisabled: false)
                    .frame(height: 142)
                WebParityMatgoAutoPlayZone(autoPlay: .constant(true), discardConfirmation: .constant(true), autoPlayDisabled: false)
                    .frame(height: 142)
                WebParityMatgoAutoPlayZone(autoPlay: .constant(false), discardConfirmation: .constant(false), autoPlayDisabled: true)
                    .frame(height: 142)
            }
            .padding(18)
        }
        .frame(width: 1_280, height: 720)

        let thinking = ZStack {
            Color(red: 0.28, green: 0.78, blue: 0.05)
            WebParityAIThinkingView(plan: .init(durationMilliseconds: 1_350, label: "낼 패를 고르는 중…"))
        }
        .frame(width: 1_280, height: 720)

        let resultSession = GameSession(mode: .matgo, pointValue: 100, difficulty: .expert, deck: deterministicDeck())
        var steps = 0
        while !resultSession.isEnded && steps < 250 {
            resultSession.playAutomaticStep()
            steps += 1
        }
        let result = WebParityRoundResultView(
            session: resultSession,
            balance: 514_400,
            moneyTransfer: .init(
                humanBefore: 500_000,
                humanAfter: 514_400,
                opponentBefore: 500_000,
                opponentAfter: 485_600,
                opponentRefillAfter: nil,
                amount: 14_400,
                appliedNow: true
            ),
            moneySyncState: .synced,
            exitReserved: false,
            retryMoneySync: {},
            continueRound: {},
            exit: {}
        )
        .frame(width: 1_280, height: 720)

        try assertRendered(automatic, named: "auto-play-states")
        try assertRendered(thinking, named: "ai-thinking")
        try assertRendered(result, named: "round-result")
    }

    @MainActor
    func testMatgoEffectsAndActionPanelsRenderAtWebReferenceSize() throws {
        let session = GameSession(mode: .matgo, pointValue: 1_000, deck: deterministicDeck())
        let background = Color(red: 0.28, green: 0.78, blue: 0.05)
        let declaration = ZStack {
            background
            WebParityDeclarationEffectView(effect: .init(
                kind: .ttadak,
                text: "따닥!",
                detail: "싹쓸이까지 · 상대 쌍피 1장(피 2장 값) 뺏기",
                durationMilliseconds: 1_350,
                peeBurstValue: 2,
                peeBurstText: "쌍피 뺏기!"
            ))
        }.frame(width: 1_280, height: 720)
        let deal = ZStack { background; WebParityDealEffectView(mode: .matgo) }.frame(width: 1_280, height: 720)
        let gostopDeal = ZStack { background; GostopLegacyDealEffectView() }.frame(width: 1_280, height: 720)
        let shakeCards = ["m03-01", "m03-02", "m03-03"].compactMap { HwatuDeck.byID[$0] }
        let shake = WebParityShakeChoiceView(
            option: .init(month: 3, handCards: shakeCards),
            selectedCard: shakeCards[1], shake: {}, plain: {}
        ).frame(width: 1_280, height: 720)
        let goStop = ZStack {
            background
            WebParityGoStopChoiceView(session: session, player: .human, opponentBalance: 500_000, go: {}, stop: {})
        }.frame(width: 1_280, height: 720)
        let gookjin = ZStack { background; WebParityGookjinChoiceView(currentAsPee: true) { _ in } }.frame(width: 1_280, height: 720)
        let captured = ZStack {
            background
            WebParityCapturedRack(
                cards: ["m09-01", "m02-01", "m01-03"].compactMap { HwatuDeck.byID[$0] },
                owner: .human, gookjinAsPee: true, selectGookjin: {}
            )
        }.frame(width: 1_280, height: 720)

        try assertRendered(declaration, named: "matgo-declaration-effect")
        try assertRendered(deal, named: "matgo-deal-effect")
        try assertRendered(gostopDeal, named: "gostop-deal-effect")
        try assertRendered(shake, named: "matgo-shake-action")
        try assertRendered(goStop, named: "matgo-go-stop-action")
        try assertRendered(gookjin, named: "matgo-gookjin-choice")
        try assertRendered(captured, named: "matgo-gookjin-captured-rack")
    }

    @MainActor
    private func assertRendered<Content: View>(_ content: Content, named name: String, width: Int = 1_280, height: Int = 720) throws {
        let hostingView = NSHostingView(rootView: content)
        hostingView.frame = NSRect(x: 0, y: 0, width: width, height: height)
        hostingView.layoutSubtreeIfNeeded()
        let representation = try XCTUnwrap(hostingView.bitmapImageRepForCachingDisplay(in: hostingView.bounds))
        hostingView.cacheDisplay(in: hostingView.bounds, to: representation)
        let image = try XCTUnwrap(representation.cgImage)
        XCTAssertEqual(image.width, width)
        XCTAssertEqual(image.height, height)
        try saveSnapshotIfRequested(image, named: name)
    }

    private func saveSnapshotIfRequested(_ image: CGImage, named name: String) throws {
        guard let directory = ProcessInfo.processInfo.environment["FAMILY_HWATU_SNAPSHOT_DIR"] else { return }
        let folder = URL(fileURLWithPath: directory, isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let destinationURL = folder.appendingPathComponent("\(name).png")
        let destination = try XCTUnwrap(CGImageDestinationCreateWithURL(
            destinationURL as CFURL,
            UTType.png.identifier as CFString,
            1,
            nil
        ))
        CGImageDestinationAddImage(destination, image, nil)
        XCTAssertTrue(CGImageDestinationFinalize(destination))
    }

    private func deterministicDeck() -> [HwatuCard] {
        HwatuDeck.cards.sorted {
            let leftIndex = Int($0.id.suffix(2)) ?? 0
            let rightIndex = Int($1.id.suffix(2)) ?? 0
            return (leftIndex, $0.month, $0.id) < (rightIndex, $1.month, $1.id)
        }
    }

    private func capturedRackSnapshot() -> NativeGameSnapshot {
        NativeGameSnapshot(
            stateVersion: 1, gameUuid: UUID().uuidString, gameMode: "matgo", turnNumber: 12,
            pointValue: 100, computerDifficulty: .normal, phase: "playing", currentPlayer: .human,
            humanHand: ["m10-03"], computerHand: ["m10-04", "m11-03", "m11-04"],
            computerAHand: nil, computerBHand: nil,
            floorCards: ["m12-01", "m12-02"], drawPile: ["m12-03"],
            humanCaptured: [
                "m01-01", "m03-01", "m08-01",
                "m02-01", "m04-01", "m05-01", "m09-01",
                "m01-02", "m02-02", "m03-02",
                "m01-03", "m01-04", "m02-03", "m02-04", "m03-03", "m03-04",
                "m04-03", "m04-04", "m05-03", "m05-04"
            ],
            computerCaptured: ["m06-01", "m06-02", "m06-03", "m07-02", "m07-03"],
            computerACaptured: nil, computerBCaptured: nil,
            humanGoCount: 3, computerGoCount: 1, computerAGoCount: nil, computerBGoCount: nil,
            winner: nil, roundResult: nil, settlement: nil,
            lastAction: "획득패 UI 렌더 검증", createdAt: ISO8601DateFormatter().string(from: Date()),
            shakeCounts: nil, bombCounts: nil, bombSkips: nil,
            gookjinAsPee: [PlayerID.human.rawValue: true], shakenMonths: nil,
            missionCardIds: ["m07-01", "m08-02", "m09-02"], ppeokCounts: nil, ppeokOwners: nil,
            gookjinChoiceMade: [PlayerID.human.rawValue: true], startingPlayer: .human
        )
    }
}
