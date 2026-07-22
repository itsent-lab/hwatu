import SwiftUI
import AppKit

struct GameTableView: View {
    @EnvironmentObject private var appState: AppState
    let mode: GameMode
    let pointValue: Int
    let continueGame: Bool
    @State private var session: GameSession?
    @State private var selectedPointValue: Int
    @State private var showingDealerChoice: Bool
    @State private var settledGameUuid: String?
    @State private var lastSavedTurn = -1
    @State private var moneySyncState: GameMoneySyncState = .idle
    @State private var moneyTransfer: NativeMoneyTransfer?
    @State private var profileImageUploading = false
    private let matgoStore = MatgoLocalStore()
    private let pendingSettlementStore = PendingGostopSettlementStore()

    init(mode: GameMode, pointValue: Int, continueGame: Bool) {
        let savedDifficulty = AIDifficulty(rawValue: UserDefaults.standard.string(forKey: "FamilyHwatu.aiDifficulty") ?? "") ?? .normal
        self.mode = mode
        self.pointValue = pointValue
        self.continueGame = continueGame
        _session = State(initialValue: mode == .gostop && !continueGame ? GameSession(mode: mode, pointValue: pointValue, difficulty: savedDifficulty) : nil)
        _selectedPointValue = State(initialValue: pointValue)
        _showingDealerChoice = State(initialValue: mode == .matgo && !continueGame)
    }

    var body: some View {
        Group {
            if showingDealerChoice {
                DealerSelectionView(mode: mode, selectedPointValue: $selectedPointValue) { humanStarts, difficulty in
                    session = GameSession(
                        mode: mode,
                        pointValue: selectedPointValue,
                        startingPlayer: humanStarts ? .human : .computer,
                        difficulty: difficulty
                    )
                    showingDealerChoice = false
                } exit: {
                    appState.route = mode == .matgo ? .matgoLobby : .gostopLobby
                }
            } else if let session {
                GameBoard(
                    session: session,
                    displayName: appState.user?.displayName ?? "나",
                    balance: appState.user?.virtualBalance ?? 0,
                    opponentBalance: appState.user?.opponentBalance ?? 500_000,
                    gostopComputerBalances: [
                        .computerA: appState.user?.gostopComputerABalance ?? 500_000,
                        .computerB: appState.user?.gostopComputerBBalance ?? 500_000
                    ],
                    moneyTransfer: moneyTransfer,
                    profileImageURL: profileImageURL,
                    profileImageUploading: profileImageUploading,
                    selectProfileImage: selectProfileImage,
                    moneySyncState: displayedMoneySyncState(for: session),
                    retryMoneySync: { Task { await synchronize(session) } },
                    exit: { appState.route = mode == .matgo ? .matgoLobby : .gostopLobby },
                    newGame: {
                        guard isRoundSynchronized(session) else { return }
                        if mode == .matgo {
                            self.session = nil
                            showingDealerChoice = true
                        } else {
                            self.session = GameSession(
                                mode: .gostop,
                                pointValue: session.pointValue,
                                startingPlayer: session.nextStartingPlayer,
                                difficulty: session.difficulty,
                                roundMultiplier: session.nextRoundMultiplier
                            )
                        }
                        moneySyncState = .idle
                        settledGameUuid = nil
                        lastSavedTurn = -1
                        moneyTransfer = nil
                    }
                )
            } else {
                ProgressView("저장된 판을 불러오고 있습니다")
            }
        }
        .task {
            if continueGame, session == nil {
                do {
                    guard let userID = appState.user?.id else { throw APIError(status: 401, code: "AUTH_REQUIRED", message: "로그인이 필요합니다.") }
                    session = try await MatgoContinuationLoader.load(api: appState.api, userID: userID, pointValue: pointValue, store: matgoStore)
                } catch {
                    appState.errorMessage = error.localizedDescription
                    session = GameSession(mode: .matgo, pointValue: pointValue)
                }
            }
            await monitorGame()
        }
        .onReceive(NotificationCenter.default.publisher(for: NSApplication.didResignActiveNotification)) { _ in
            if mode == .matgo, let session, let userID = appState.user?.id { _ = try? matgoStore.save(session.snapshot(), userID: userID, pendingSync: true) }
            NativeGameSound.suspend()
        }
    }

    private func monitorGame() async {
        await retryPendingGostopSettlements()
        while !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(500))
            guard let session else { continue }
            if case .failed = moneySyncState { try? await Task.sleep(for: .seconds(2)) }
            await synchronize(session)
        }
    }

    private func isRoundSynchronized(_ session: GameSession) -> Bool {
        guard session.isEnded else { return true }
        return mode == .matgo
            ? lastSavedTurn == session.turnNumber && moneySyncState == .synced
            : settledGameUuid == session.gameUuid && moneySyncState == .synced
    }

    private func displayedMoneySyncState(for session: GameSession) -> GameMoneySyncState {
        session.isEnded && !isRoundSynchronized(session) && moneySyncState == .synced ? .syncing : moneySyncState
    }

    private func synchronize(_ session: GameSession) async {
        if mode == .matgo, session.turnNumber != lastSavedTurn {
            moneySyncState = .syncing
            do {
                guard let userID = appState.user?.id else { throw APIError(status: 401, code: "AUTH_REQUIRED", message: "로그인이 필요합니다.") }
                let snapshot = session.snapshot()
                try matgoStore.save(snapshot, userID: userID, pendingSync: true)
                let result = try await appState.api.saveMatgo(snapshot)
                updateMatgoBalances(result)
                try matgoStore.markSynced(gameUuid: snapshot.gameUuid, turnNumber: snapshot.turnNumber, userID: userID)
                lastSavedTurn = session.turnNumber
                moneySyncState = .synced
            } catch {
                moneySyncState = .failed(error.localizedDescription)
                appState.errorMessage = error.localizedDescription
            }
            return
        }
        guard mode == .gostop, session.isEnded, settledGameUuid != session.gameUuid else { return }
        let deltas = session.pointDeltas
        if deltas.values.allSatisfy({ $0 == 0 }) && session.winner != nil {
            settledGameUuid = session.gameUuid
            moneySyncState = .synced
            return
        }
        let request = GostopSettlementRequest(
            gameUuid: session.gameUuid,
            winner: session.winner?.rawValue,
            finalScore: session.settlement?.finalScore ?? 0,
            pointValue: session.pointValue,
            roundResult: session.winner == nil ? "nagari" : "win",
            humanPoints: deltas[.human] ?? 0,
            computerAPoints: deltas[.computerA] ?? 0,
            computerBPoints: deltas[.computerB] ?? 0,
            statistics: session.humanMatchStatistics
        )
        guard let userID = appState.user?.id else { return }
        do { try pendingSettlementStore.enqueue(request, userID: userID) }
        catch {
            moneySyncState = .failed(error.localizedDescription)
            appState.errorMessage = error.localizedDescription
            return
        }
        moneySyncState = .syncing
        do {
            let response = try await appState.api.settleGostop(request)
            updateGostopBalances(response)
            try pendingSettlementStore.remove(gameUuid: request.gameUuid, userID: userID)
            settledGameUuid = session.gameUuid
            moneySyncState = .synced
        } catch {
            moneySyncState = .failed(error.localizedDescription)
            appState.errorMessage = error.localizedDescription
        }
    }

    private func retryPendingGostopSettlements() async {
        guard mode == .gostop, let userID = appState.user?.id else { return }
        do {
            for request in try pendingSettlementStore.load(userID: userID) {
                do {
                    let response = try await appState.api.settleGostop(request)
                    updateGostopBalances(response)
                    try pendingSettlementStore.remove(gameUuid: request.gameUuid, userID: userID)
                } catch { break }
            }
        } catch {
            moneySyncState = .failed(error.localizedDescription)
            appState.errorMessage = error.localizedDescription
        }
        moneyTransfer = nil
    }

    private func updateMatgoBalances(_ result: MatgoSaveResult) {
        guard var user = appState.user else { return }
        let opponentAfter = result.opponentBalanceAfterSettlement ?? result.opponentBalance
        if result.settlementAmount != 0 || result.settlementApplied {
            moneyTransfer = .init(
                humanBefore: result.balance - result.settlementAmount,
                humanAfter: result.balance,
                opponentBefore: opponentAfter + result.settlementAmount,
                opponentAfter: opponentAfter,
                opponentRefillAfter: result.opponentRefilled == true ? result.opponentBalance : nil,
                amount: result.settlementAmount,
                appliedNow: result.settlementApplied
            )
        }
        user.virtualBalance = result.balance
        user.opponentBalance = result.opponentBalance
        appState.user = user
    }

    private func updateGostopBalances(_ result: GostopSettlementResult) {
        guard var user = appState.user else { return }
        moneyTransfer = .init(
            humanBefore: result.balance - result.settlementAmount,
            humanAfter: result.balance,
            opponentBefore: nil,
            opponentAfter: nil,
            opponentRefillAfter: nil,
            amount: result.settlementAmount,
            appliedNow: result.settlementApplied
        )
        user.virtualBalance = result.balance
        user.gostopComputerABalance = result.computerABalance
        user.gostopComputerBBalance = result.computerBBalance
        appState.user = user
    }

    private var profileImageURL: URL? {
        guard let path = appState.user?.profileImageUrl,
              let base = URL(string: appState.serverURLText) else { return nil }
        return URL(string: path, relativeTo: base)?.absoluteURL
    }

    private func selectProfileImage() {
        guard let data = ProfileImagePicker.selectJPEG() else { return }
        profileImageUploading = true
        Task {
            defer { profileImageUploading = false }
            do { appState.user = try await appState.api.uploadProfileImage(jpegData: data) }
            catch { appState.errorMessage = error.localizedDescription }
        }
    }
}

private struct GameBoard: View {
    @ObservedObject var session: GameSession
    let displayName: String
    let balance: Int64
    let opponentBalance: Int64
    let gostopComputerBalances: [PlayerID: Int64]
    let moneyTransfer: NativeMoneyTransfer?
    let profileImageURL: URL?
    let profileImageUploading: Bool
    let selectProfileImage: () -> Void
    let moneySyncState: GameMoneySyncState
    let retryMoneySync: () -> Void
    let exit: () -> Void
    let newGame: () -> Void
    @State private var autoPlay = false
    @State private var exitDialogOpen = false
    @State private var exitReserved = false
    @State private var pendingBomb: NativeBombOption?
    @State private var pendingBombCard: HwatuCard?
    @State private var pendingShake: NativeShakeOption?
    @State private var pendingShakeCard: HwatuCard?
    @State private var pendingDiscard: HwatuCard?
    @State private var isDealing = true
    @State private var hasStarted = false
    @State private var activeMotions: [NativeCardMotion] = []
    @State private var activeDeclaration: NativeDeclarationEffect?
    @State private var declarationQueue: [NativeDeclarationEffect] = []
    @State private var previousGostopScores: [PlayerID: Int] = [:]
    @State private var gostopScorePulses: [GostopScorePulse] = []
    @State private var showRoundResult = false
    @State private var gookjinChoiceOpen = false
    @AppStorage("FamilyHwatu.soundEnabled") private var soundEnabled = NativeAudioDefaults.soundEnabled
    @AppStorage("FamilyHwatu.voiceEnabled") private var voiceEnabled = NativeAudioDefaults.voiceEnabled
    @AppStorage("FamilyHwatu.backgroundMusicEnabled") private var backgroundMusicEnabled = NativeAudioDefaults.backgroundMusicEnabled
    @AppStorage("FamilyHwatu.soundVolume") private var soundVolume = NativeAudioDefaults.volume
    @AppStorage("FamilyHwatu.discardConfirmation") private var discardConfirmation = false

    var body: some View {
        ZStack {
            Group {
                if session.mode == .matgo {
                    MatgoBoardLayout(
                        session: session,
                        displayName: displayName,
                        balance: balance,
                        opponentBalance: opponentBalance,
                        profileImageURL: profileImageURL,
                        profileImageUploading: profileImageUploading,
                        selectProfileImage: selectProfileImage,
                        soundEnabled: $soundEnabled,
                        voiceEnabled: $voiceEnabled,
                        backgroundMusicEnabled: $backgroundMusicEnabled,
                        soundVolume: $soundVolume,
                        autoPlay: $autoPlay,
                        discardConfirmation: $discardConfirmation,
                        autoPlayDisabled: MatgoAutoPlayAvailability.isDisabled(
                            active: autoPlay, started: hasStarted, ended: session.isEnded, dealing: isDealing,
                            hasPendingChoice: pendingDiscard != nil || pendingBomb != nil || pendingShake != nil || session.pendingMatch != nil || isGookjinChoicePresented
                        ),
                        exitReserved: exitReserved,
                        openExit: { exitDialogOpen = true },
                        newGame: newGame,
                        openGookjinChoice: openGookjinChoice,
                        selectCard: selectHumanCard
                    )
                } else {
                    GostopBoardLayout(
                        session: session,
                        displayName: displayName,
                        balance: balance,
                        computerBalances: gostopComputerBalances,
                        soundEnabled: $soundEnabled,
                        voiceEnabled: $voiceEnabled,
                        backgroundMusicEnabled: $backgroundMusicEnabled,
                        soundVolume: $soundVolume,
                        autoPlay: $autoPlay,
                        exitReserved: exitReserved,
                        openExit: { exitDialogOpen = true },
                        newGame: newGame,
                        selectCard: selectHumanCard
                    )
                }
            }
            ForEach(activeMotions) { motion in
                WebParityCardMotionEffectView(event: motion, mode: session.mode)
                    .transition(.opacity)
            }
            if session.mode == .gostop { ForEach(gostopScorePulses) { GostopLegacyScorePulseView(pulse: $0) } }
            if !session.isTurnTransitioning, let pending = session.pendingMatch { matchChoice(pending) }
            if let card = pendingDiscard { discardChoice(card) }
            if let option = pendingBomb { bombChoice(option) }
            if let option = pendingShake { shakeChoice(option) }
            if !session.isTurnTransitioning, let chongtong = session.pendingChongtong, chongtong.player == .human { chongtongChoice(chongtong) }
            if isGookjinChoicePresented {
                if session.mode == .matgo {
                    WebParityGookjinChoiceView(currentAsPee: session.gookjinAsPee[.human] == true) {
                        session.setGookjin(for: .human, asPee: $0)
                        gookjinChoiceOpen = false
                    }
                } else {
                    GookjinChoiceView { session.setGookjin(for: .human, asPee: $0) }
                }
            }
            if !session.isTurnTransitioning, case .awaitingGoStop(.human) = session.phase, !isGookjinChoicePresented { goStopChoice }
            if !session.isTurnTransitioning, !isGookjinChoicePresented, case let .awaitingGoStop(player) = session.phase, player != .human {
                if session.mode == .matgo {
                    WebParityGoStopChoiceView(session: session, player: player, opponentBalance: nil, go: nil, stop: nil)
                } else {
                    AIChoiceWaitingView(player: player)
                }
            }
            if session.isEnded && !isGookjinChoicePresented && showRoundResult { roundResult }
            if exitDialogOpen { exitChoice }
            if session.mode == .matgo && session.isAIThinking && !autoPlay && hasStarted {
                WebParityAIThinkingView(plan: aiThinkingPlan)
                    .transition(.scale.combined(with: .opacity))
            }
            if session.mode == .matgo, let activeDeclaration {
                WebParityDeclarationEffectView(effect: activeDeclaration).id(activeDeclaration.id)
            }
            if session.mode == .gostop, let notice = session.specialNotice {
                GostopLegacyDeclarationEffectView(text: notice).id(notice).offset(y: -35)
            }
            if session.mode == .gostop, session.lastRuleEvents.count > 1 { GostopLegacyRuleEventView(events: session.lastRuleEvents).offset(y: 42) }
            if isDealing && hasStarted {
                if session.mode == .matgo { WebParityDealEffectView(mode: .matgo).transition(.opacity) }
                else { GostopLegacyDealEffectView().transition(.opacity) }
            }
        }
        .background(
            ZStack {
                tableGradient
                RadialGradient(
                    colors: session.mode == .matgo
                        ? [Color(red: 0.616, green: 1.0, blue: 0.286).opacity(0.72), .clear]
                        : [Color(red: 0.455, green: 0.659, blue: 0.337).opacity(0.85), .clear],
                    center: .center,
                    startRadius: 40,
                    endRadius: 760
                )
            }
        )
        .onAppear {
            if session.mode == .gostop {
                previousGostopScores = Dictionary(uniqueKeysWithValues: session.mode.players.map { ($0, session.score(for: $0).total) })
            }
            startGame()
        }
        .task(id: automaticTaskID) {
            session.setAutomaticPlayEnabled(autoPlay)
            guard autoPlay && hasStarted else { return }
            pendingBomb = nil
            pendingBombCard = nil
            pendingShake = nil
            pendingShakeCard = nil
            pendingDiscard = nil
            guard !session.isEnded, !isDealing, !exitDialogOpen else { return }
            await session.waitForVisualTransition()
            let effectsBlock = session.mode == .matgo && (activeDeclaration != nil || session.specialNotice != nil || !session.lastRuleEvents.isEmpty)
            guard !effectsBlock, !Task.isCancelled else { return }
            try? await Task.sleep(for: .milliseconds(NativeGameTiming.automaticHumanMilliseconds(for: session.mode)))
            let effectsStillBlock = session.mode == .matgo && (activeDeclaration != nil || session.specialNotice != nil || !session.lastRuleEvents.isEmpty)
            guard autoPlay, !Task.isCancelled, !session.isEnded, !isDealing, !session.isTurnTransitioning, !effectsStillBlock else { return }
            performAutomaticHumanStep()
        }
        .task(id: roundResultTaskID) {
            showRoundResult = false
            guard session.isEnded, !isGookjinChoicePresented else { return }
            autoPlay = false
            await session.waitForVisualTransition()
            if session.mode == .matgo { try? await Task.sleep(for: .milliseconds(NativeGameTiming.matgoRoundResultMilliseconds)) }
            guard session.isEnded, !isGookjinChoicePresented, !Task.isCancelled else { return }
            withAnimation(.easeOut(duration: 0.30)) { showRoundResult = true }
        }
        .onChange(of: session.turnNumber) { _, _ in
            if soundEnabled { NativeGameSound.play(.cardContact, volume: soundVolume) }
            NativeGameSound.setBackgroundMusic(enabled: backgroundMusicEnabled, volume: soundVolume, stage: NativeGameSound.musicStage(for: session))
        }
        .onReceive(session.$cardMotion) { motion in
            guard let motion else { return }
            activeMotions.append(motion)
            Task { @MainActor in
                let duration = NativeGameTiming.cardFlightMilliseconds(for: session.mode, kind: motion.kind, player: motion.player)
                try? await Task.sleep(for: .milliseconds(motion.delayMilliseconds + duration + NativeGameTiming.targetFlashMilliseconds))
                withAnimation(.easeOut(duration: 0.15)) { activeMotions.removeAll { $0.id == motion.id } }
            }
        }
        .onChange(of: session.specialNotice) { _, notice in
            guard let notice else { return }
            let declarations = NativeMatgoEffectFactory.specialDeclarations(for: session)
            activeDeclaration = declarations.first
            declarationQueue = Array(declarations.dropFirst())
            if let effect = activeDeclaration { playDeclarationSound(effect, fallback: notice) }
            else if session.mode == .matgo, notice.contains("국진"), soundEnabled {
                NativeGameSound.playNotice(notice, player: .human, volume: soundVolume, voiceEnabled: voiceEnabled, eventID: "\(session.gameUuid)-\(session.turnNumber)-\(notice)")
            }
            else if session.mode == .gostop, soundEnabled {
                NativeGameSound.playNotice(notice, player: session.currentPlayer, volume: soundVolume, voiceEnabled: voiceEnabled, eventID: "\(session.gameUuid)-\(session.turnNumber)-\(notice)")
                NativeGameSound.playPeeTransfer(for: session.lastRuleEvents, volume: soundVolume)
            }
        }
        .onChange(of: session.captured) { oldValue, newValue in
            if session.mode == .matgo { announceCaptureChange(from: oldValue, to: newValue) }
            else { announceGostopScoreChanges() }
        }
        .task(id: activeDeclaration?.id) {
            guard let effect = activeDeclaration else { return }
            try? await Task.sleep(for: .milliseconds(effect.durationMilliseconds))
            guard activeDeclaration?.id == effect.id else { return }
            if let next = declarationQueue.first {
                declarationQueue.removeFirst()
                activeDeclaration = next
                playDeclarationSound(next, fallback: next.text)
                return
            }
            activeDeclaration = nil
            session.dismissSpecialNotice()
            session.dismissRuleEvents()
        }
        .task(id: session.specialNotice) {
            guard session.specialNotice != nil, activeDeclaration == nil else { return }
            try? await Task.sleep(for: .milliseconds(session.mode == .gostop ? 1_600 : 260))
            guard activeDeclaration == nil else { return }
            session.dismissSpecialNotice()
            session.dismissRuleEvents()
        }
        .onChange(of: session.isEnded) { _, ended in
            if ended && soundEnabled {
                Task { @MainActor in
                    try? await Task.sleep(for: .milliseconds(NativeGameTiming.resultSoundMilliseconds))
                    let result: NativeGameSound.Effect = session.winner == nil ? .nagari : (session.winner == .human ? .win : .lose)
                    NativeGameSound.play(result, volume: soundVolume); NativeGameSound.setBackgroundMusic(enabled: backgroundMusicEnabled, volume: soundVolume, stage: .result)
                }
            }
        }
        .onChange(of: moneySyncState) { _, state in
            if session.isEnded && exitReserved && state == .synced { exit() }
        }
        .onChange(of: backgroundMusicEnabled) { _, enabled in
            NativeGameSound.setBackgroundMusic(enabled: enabled, volume: soundVolume, stage: NativeGameSound.musicStage(for: session))
        }
        .onChange(of: soundVolume) { _, volume in
            NativeGameSound.setBackgroundMusic(enabled: backgroundMusicEnabled, volume: volume, stage: NativeGameSound.musicStage(for: session))
        }
        .onChange(of: autoPlay) { _, enabled in
            if soundEnabled { NativeGameSound.play(enabled ? .autoplayOn : .autoplayOff, volume: soundVolume) }
        }
        .onDisappear {
            NativeGameSound.suspend()
        }
        .onReceive(NotificationCenter.default.publisher(for: NSApplication.didBecomeActiveNotification)) { _ in NativeGameSound.setBackgroundMusic(enabled: backgroundMusicEnabled, volume: soundVolume, stage: NativeGameSound.musicStage(for: session)) }
        .onChange(of: session.undosUsed) { _, _ in
            if soundEnabled { NativeGameSound.play(.undo, volume: soundVolume) }
        }
        .animation(.spring(response: 0.34, dampingFraction: 0.78), value: session.turnNumber)
        .animation(.easeInOut(duration: 0.18), value: session.isAIThinking)
    }

    private func startGame() {
        guard !hasStarted else { return }
        NativeGameSound.resetEventHistory()
        hasStarted = true
        UserDefaults.standard.set(session.difficulty.rawValue, forKey: "FamilyHwatu.aiDifficulty")
        guard session.turnNumber == 0 else {
            isDealing = false
            NativeGameSound.setBackgroundMusic(enabled: backgroundMusicEnabled, volume: soundVolume)
            session.startAIIfNeeded()
            return
        }
        isDealing = true
        if soundEnabled { NativeGameSound.play(.deal, volume: soundVolume) }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(NativeGameTiming.dealMilliseconds(for: session.mode)))
            withAnimation(.easeOut(duration: 0.24)) { isDealing = false }
            NativeGameSound.setBackgroundMusic(enabled: backgroundMusicEnabled, volume: soundVolume)
            session.startAIIfNeeded()
        }
    }

    private var roundResultTaskID: String {
        "\(session.isEnded)-\(isGookjinChoicePresented)"
    }

    private var automaticTaskID: String {
        let effectKey = session.mode == .matgo
            ? "\(session.specialNotice ?? "")|\(session.lastRuleEvents.map { $0.id.uuidString }.joined(separator: ","))|\(activeDeclaration?.id.uuidString ?? "")"
            : ""
        return [
            String(autoPlay), String(hasStarted), String(isDealing), String(exitDialogOpen),
            session.automaticPlayTaskStateKey, String(isGookjinChoicePresented), effectKey
        ].joined(separator: "|")
    }

    private var aiThinkingPlan: NativeAIThinkingPlan {
        let kind: NativeAIThinkingKind
        switch session.phase {
        case .awaitingGoStop: kind = .goStop
        case .awaitingChongtong: kind = .chongtong
        default: kind = .turn
        }
        return NativeAIThinkingPlan.make(
            difficulty: session.difficulty,
            gameIdentifier: session.gameUuid,
            turnNumber: session.turnNumber,
            kind: kind,
            automaticPlay: autoPlay
        )
    }

    private func performAutomaticHumanStep() {
        if isGookjinChoicePresented {
            let cards = session.captured[.human] ?? []
            session.setGookjin(for: .human, asPee: NativeCapturedCardGrouping.preferredGookjinAsPee(cards: cards))
            gookjinChoiceOpen = false
        } else if session.pendingChongtong?.player == .human {
            session.chooseChongtongWin()
        } else if let pending = session.pendingMatch, pending.player == .human {
            session.chooseSuggestedHumanMatch()
        } else if case .awaitingGoStop(.human) = session.phase {
            session.chooseSuggestedHumanGoStop()
        } else if session.isHumanTurn {
            session.playSuggestedHumanCard()
        }
    }

    private var isGookjinChoicePresented: Bool {
        session.needsGookjinChoice(for: .human) || (session.mode == .matgo && gookjinChoiceOpen)
    }

    private func openGookjinChoice() {
        guard session.captured[.human]?.contains(where: { $0.tags.contains("gookjin") }) == true else { return }
        if soundEnabled { NativeGameSound.play(.decision, volume: soundVolume) }
        gookjinChoiceOpen = true
    }

    private var tableGradient: LinearGradient {
        if session.mode == .matgo {
            return LinearGradient(
                stops: [
                    .init(color: Color(red: 0.325, green: 0.741, blue: 0.043), location: 0),
                    .init(color: Color(red: 0.412, green: 0.847, blue: 0.090), location: 0.47),
                    .init(color: Color(red: 0.310, green: 0.733, blue: 0.047), location: 0.48),
                    .init(color: Color(red: 0.459, green: 0.835, blue: 0.118), location: 1)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        }
        return LinearGradient(
            colors: [
                Color(red: 0.243, green: 0.545, blue: 0.318),
                Color(red: 0.114, green: 0.376, blue: 0.275),
                Color(red: 0.090, green: 0.290, blue: 0.235)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    @ViewBuilder
    private func matchChoice(_ pending: PendingMatch) -> some View {
        if session.mode == .matgo {
            WebParityMatchChoiceView(pending: pending, select: session.chooseMatch, cancel: session.cancelPendingMatch)
        } else {
            ModalCard(title: "가져올 패 선택", subtitle: "\(pending.card.month)월 패 두 장 중 하나를 골라 주세요.") {
                HStack(spacing: 18) { ForEach(pending.candidates) { card in HwatuCardView(card: card, selected: true) { session.chooseMatch(card) } } }
            }
        }
    }

    private func selectHumanCard(_ card: HwatuCard) {
        if soundEnabled { NativeGameSound.play(.select, volume: soundVolume) }
        if discardConfirmation {
            pendingDiscard = card
            return
        }
        performHumanCardSelection(card)
    }

    private func performHumanCardSelection(_ card: HwatuCard) {
        if let option = session.bombOption(for: card) {
            pendingBomb = option
            pendingBombCard = card
        } else if let option = session.shakeOption(for: card) {
            pendingShakeCard = card
            pendingShake = option
        } else {
            session.play(card)
        }
    }

    private func discardChoice(_ card: HwatuCard) -> some View {
        ModalCard(title: "이 패를 낼까요?", subtitle: "\(card.month)월 \(card.name) · 잘못 내는 것을 방지하기 위한 확인입니다.") {
            VStack(spacing: 12) {
                HwatuCardView(card: card, selected: true, large: true)
                HStack(spacing: 12) {
                    Button("취소") { pendingDiscard = nil }.buttonStyle(GameModalSecondaryButtonStyle())
                    Button("패 내기") {
                        pendingDiscard = nil
                        performHumanCardSelection(card)
                    }.buttonStyle(PrimaryButtonStyle())
                }
            }
        }
    }

    @ViewBuilder
    private func bombChoice(_ option: NativeBombOption) -> some View {
        let selected = pendingBombCard ?? option.handCards[0]
        if session.mode == .matgo {
            WebParityBombChoiceView(option: option, selectedCard: selected, bomb: { finishBombChoice(option, bomb: true) }, plain: { finishBombChoice(option, bomb: false) })
        } else {
            ModalCard(title: "\(option.month)월 \(option.kind.rawValue)을 쓸까요?", subtitle: "같은 월 패를 한꺼번에 먹고 이번 판 점수가 2배가 됩니다.") {
                HStack(spacing: 12) {
                    Button("한 장만 내기") { finishBombChoice(option, bomb: false) }.buttonStyle(GameModalSecondaryButtonStyle())
                    Button(option.kind.rawValue) { finishBombChoice(option, bomb: true) }.buttonStyle(PrimaryButtonStyle())
                }
            }
        }
    }

    private func finishBombChoice(_ option: NativeBombOption, bomb: Bool) {
        let card = pendingBombCard ?? option.handCards[0]
        pendingBomb = nil; pendingBombCard = nil
        if bomb { session.playBomb(option) } else { session.play(card) }
    }

    @ViewBuilder
    private func shakeChoice(_ option: NativeShakeOption) -> some View {
        if session.mode == .matgo {
            WebParityShakeChoiceView(option: option, selectedCard: pendingShakeCard ?? option.handCards[0], shake: { finishShakeChoice(declare: true) }, plain: { finishShakeChoice(declare: false) })
        } else {
            ModalCard(title: "\(option.month)월 세 장을 흔들까요?", subtitle: "세 장을 공개하면 이번 판 점수가 2배가 됩니다.") {
                HStack(spacing: 12) {
                    Button("그냥 내기") { finishShakeChoice(declare: false) }.buttonStyle(GameModalSecondaryButtonStyle())
                    Button("흔들기") { finishShakeChoice(declare: true) }.buttonStyle(PrimaryButtonStyle())
                }
            }
        }
    }

    private func finishShakeChoice(declare: Bool) {
        guard let option = pendingShake, let card = pendingShakeCard else { return }
        pendingShake = nil
        pendingShakeCard = nil
        if declare { session.declareShake(month: option.month) }
        session.play(card)
    }

    @ViewBuilder
    private func chongtongChoice(_ chongtong: NativeChongtong) -> some View {
        if session.mode == .matgo {
            WebParityChongtongChoiceView(chongtong: chongtong, score: 7, continueGame: session.chooseChongtongContinue, stop: session.chooseChongtongWin)
        } else {
            ModalCard(title: "총통!", subtitle: "바로 5점으로 끝내거나 네 장을 흔들고 계속 칠 수 있습니다.") {
                HStack(spacing: 12) {
                    Button("네 장 흔들고 계속") { session.chooseChongtongContinue() }.buttonStyle(GameModalSecondaryButtonStyle())
                    Button("5점으로 끝내기") { session.chooseChongtongWin() }.buttonStyle(PrimaryButtonStyle())
                }
            }
        }
    }

    @ViewBuilder
    private var goStopChoice: some View {
        if session.mode == .matgo {
            WebParityGoStopChoiceView(session: session, player: .human, opponentBalance: opponentBalance, go: session.chooseGo, stop: session.chooseStop)
        } else {
            ModalCard(title: "고 하시겠습니까?", subtitle: "현재 \(session.score(for: .human).total)점 · \(session.goCounts[.human] ?? 0)고") {
                HStack(spacing: 14) {
                    Button("고") { session.chooseGo() }.buttonStyle(GameModalSecondaryButtonStyle())
                    Button("스톱") { session.chooseStop() }.buttonStyle(PrimaryButtonStyle())
                }
            }
        }
    }

    private var roundResult: some View {
        WebParityRoundResultView(
            session: session,
            balance: balance,
            moneyTransfer: moneyTransfer,
            moneySyncState: moneySyncState,
            exitReserved: exitReserved,
            retryMoneySync: retryMoneySync,
            continueRound: newGame,
            exit: exit
        )
    }

    private var exitChoice: some View {
        ZStack {
            Color(red: 0.12, green: 0.31, blue: 0).opacity(0.80).ignoresSafeArea()
            VStack(spacing: 10) {
                Text("게임방에서 나갈까요?")
                    .font(.system(size: 30, weight: .black, design: .serif))
                    .foregroundStyle(Color(red: 0.20, green: 0.26, blue: 0.08))
                Text("현재 판을 마친 뒤 나가거나 지금 바로 나갈 수 있습니다.")
                    .font(.callout)
                    .foregroundStyle(Color(red: 0.41, green: 0.45, blue: 0.28))
                    .padding(.bottom, 5)
                Button {
                    exitReserved = true
                    exitDialogOpen = false
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("판 끝나고 나가기").font(.headline.weight(.black))
                        Text("현재 판을 끝까지 진행한 뒤 자동으로 나갑니다").font(.caption.weight(.bold))
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(ReserveExitButtonStyle())
                Button(action: exit) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("지금 나가기").font(.headline.weight(.black))
                        Text("현재 판을 중단하고 바로 나갑니다").font(.caption.weight(.bold))
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(ImmediateExitButtonStyle())
                Button("취소") { exitDialogOpen = false }
                    .buttonStyle(ExitCancelButtonStyle())
            }
            .padding(34)
            .frame(width: 390)
            .background(LinearGradient(colors: [Color(red: 1.0, green: 0.99, blue: 0.91), Color(red: 0.92, green: 0.87, blue: 0.68)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color(red: 0.36, green: 0.58, blue: 0.03), lineWidth: 4))
            .shadow(color: .black.opacity(0.52), radius: 25, y: 14)
        }
    }

    private func announceCaptureChange(from oldValue: [PlayerID: [HwatuCard]], to newValue: [PlayerID: [HwatuCard]]) {
        guard session.mode == .matgo, session.specialNotice == nil, session.lastRuleEvents.isEmpty else { return }
        for player in session.mode.players where oldValue[player] != newValue[player] {
            guard let effect = NativeMatgoEffectFactory.captureDeclaration(
                player: player,
                oldCards: oldValue[player] ?? [],
                newCards: newValue[player] ?? [],
                session: session
            ) else { continue }
            activeDeclaration = effect
            playDeclarationSound(effect, fallback: effect.text, player: player)
            return
        }
    }

    private func playDeclarationSound(_ effect: NativeDeclarationEffect, fallback: String, player: PlayerID? = nil) {
        guard soundEnabled else { return }
        let actor = player ?? session.lastRuleEvents.first?.player ?? session.currentPlayer
        let notice = effect.kind == .settlement || effect.kind == .stop ? fallback : effect.text
        NativeGameSound.playNotice(notice, player: actor, volume: soundVolume, voiceEnabled: voiceEnabled, eventID: effect.id.uuidString)
        guard effect.peeBurstValue != nil else { return }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(120))
            NativeGameSound.playPeeTransfer(for: session.lastRuleEvents, volume: soundVolume)
        }
    }

    private func announceGostopScoreChanges() {
        for player in session.mode.players {
            let score = session.score(for: player).total, previous = previousGostopScores[player] ?? 0
            previousGostopScores[player] = score
            guard score > previous else { continue }
            let pulse = GostopScorePulse(player: player, score: score, delta: score - previous)
            gostopScorePulses.append(pulse)
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(950))
                gostopScorePulses.removeAll { $0.id == pulse.id }
            }
        }
    }
}

private struct PlayerStrip: View {
    let player: PlayerID
    @ObservedObject var session: GameSession
    var body: some View {
        HStack(spacing: 11) {
            ZStack {
                Circle().fill(session.currentPlayer == player ? HwatuTheme.red : Color(red: 0.12, green: 0.30, blue: 0.34))
                Text(player == .computerA ? "A" : player == .computerB ? "B" : "花").font(.headline.bold())
            }.frame(width: 43, height: 43)
            VStack(alignment: .leading, spacing: 3) {
                HStack { Text(player.displayName).font(.headline.weight(.black)); Text("\(session.score(for: player).total)점").foregroundStyle(HwatuTheme.gold) }
                HStack(spacing: -28) { ForEach(0..<(session.hands[player]?.count ?? 0), id: \.self) { _ in CardBackView(compact: true) } }
                    .frame(width: 115, alignment: .leading)
            }
            CapturedRack(cards: session.captured[player] ?? [], compact: true)
        }
        .foregroundStyle(.white)
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(LinearGradient(colors: [Color(red: 0.122, green: 0.529, blue: 0.694), Color(red: 0.039, green: 0.294, blue: 0.439)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(session.currentPlayer == player ? Color(red: 1.0, green: 0.902, blue: 0.416) : Color(red: 0.357, green: 0.741, blue: 0.867), lineWidth: 2))
        .shadow(color: session.currentPlayer == player ? Color(red: 1.0, green: 0.886, blue: 0.267).opacity(0.68) : Color.black.opacity(0.22), radius: session.currentPlayer == player ? 6 : 3, y: 2)
    }
}

private struct GostopOpponentColumn: View {
    let player: PlayerID
    @ObservedObject var session: GameSession

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 7) {
                Circle()
                    .fill(session.currentPlayer == player ? HwatuTheme.red : Color(red: 0.12, green: 0.31, blue: 0.22))
                    .overlay(Text(player == .computerA ? "🐶" : "🐯").font(.title3))
                    .frame(width: 40, height: 40)
                VStack(alignment: .leading, spacing: 2) {
                    Text(player.displayName).font(.callout.weight(.black))
                    Text("500,000냥").font(.caption.weight(.black)).foregroundStyle(HwatuTheme.gold)
                }
            }
            ScorePanel(
                score: session.score(for: player),
                compact: true,
                shakeCount: session.shakeCounts[player] ?? 0,
                bombCount: session.bombCounts[player] ?? 0
            )
                .frame(maxWidth: .infinity)
            HStack(spacing: -29) {
                ForEach(0..<(session.hands[player]?.count ?? 0), id: \.self) { _ in CardBackView(compact: true) }
            }
            .frame(minHeight: 68)
            Text("획득패").font(.caption2.weight(.black)).foregroundStyle(Color(red: 0.76, green: 0.88, blue: 0.75))
            CapturedRack(cards: session.captured[player] ?? [], compact: true)
        }
        .foregroundStyle(.white)
        .padding(10)
        .frame(width: 185)
        .frame(minHeight: 250)
        .background(Color(red: 0.129, green: 0.263, blue: 0.212).opacity(0.92), in: RoundedRectangle(cornerRadius: 15))
        .overlay(RoundedRectangle(cornerRadius: 15).stroke(session.currentPlayer == player ? Color(red: 1.0, green: 0.922, blue: 0.333) : Color(red: 0.851, green: 0.741, blue: 0.333), lineWidth: session.currentPlayer == player ? 4 : 3))
    }
}
