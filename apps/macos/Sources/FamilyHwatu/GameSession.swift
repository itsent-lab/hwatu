import Foundation

@MainActor
final class GameSession: ObservableObject {
    let mode: GameMode
    @Published private(set) var pointValue: Int
    let gameUuid: String
    let createdAt: String
    let startingPlayer: PlayerID
    @Published private(set) var hands: [PlayerID: [HwatuCard]] = [:]
    @Published private(set) var captured: [PlayerID: [HwatuCard]] = [:]
    @Published private(set) var floorCards: [HwatuCard] = []
    @Published private(set) var drawPile: [HwatuCard] = []
    @Published private(set) var currentPlayer: PlayerID = .human
    @Published private(set) var phase: GamePhase = .playing
    @Published private(set) var turnNumber = 0
    @Published private(set) var lastAction = "패를 나누고 있습니다."
    @Published private(set) var goCounts: [PlayerID: Int] = [:]
    @Published private(set) var scoreAtLastGo: [PlayerID: Int] = [:]
    @Published private(set) var winner: PlayerID?
    @Published private(set) var settlement: NativeSettlement?
    @Published private(set) var undosUsed = 0
    @Published private(set) var specialNotice: String?
    @Published private(set) var shakeCounts: [PlayerID: Int] = [:]
    @Published private(set) var bombCounts: [PlayerID: Int] = [:]
    @Published private(set) var bombSkips: [PlayerID: Int] = [:]
    @Published private(set) var gookjinAsPee: [PlayerID: Bool] = [:]
    @Published private(set) var isAIThinking = false
    @Published var isTurnTransitioning = false
    @Published private(set) var automaticPlayEnabled = false
    @Published private(set) var pendingChongtong: NativeChongtong?
    @Published private(set) var cardMotion: NativeCardMotion?
    @Published private(set) var ppeokCounts: [PlayerID: Int] = [:]
    @Published private(set) var openingPpeokTotals: [PlayerID: Int] = [:]
    @Published private(set) var sweepCounts: [PlayerID: Int] = [:]
    @Published private(set) var lastRuleEvents: [NativeRuleEvent] = []
    @Published private(set) var roundMultiplier: Int
    @Published var difficulty: AIDifficulty
    @Published var pendingMatch: PendingMatch?
    private(set) var missionCards: [HwatuCard] = []
    private(set) var activePlayedCard: HwatuCard?
    private(set) var stagedPair: NativeStagedPair?
    private(set) var shakenMonths: [PlayerID: Set<Int>] = [:]
    private var undoStack: [NativeGameUndoState] = []
    private(set) var ppeokOwners: [Int: PlayerID] = [:]
    private(set) var emptyCaptureStreaks: [PlayerID: Int] = [:]
    private(set) var turnCounts: [PlayerID: Int] = [:]
    private(set) var openingPpeokCounts: [PlayerID: Int] = [:]
    private(set) var interimPointDeltas: [PlayerID: Int] = [:]
    private(set) var lastGoPlayer: PlayerID?
    private(set) var gookjinChoiceMade: [PlayerID: Bool] = [:]
    private(set) var lastDiscardedCardId: String?
    private(set) var lastDiscardedBy: PlayerID?
    private var capturedCountAtTurnStart = 0
    private var currentTurnIsFinalHand = false
    private var animateNextDraw = true
    var visualTransitionDeadline = Date.distantPast
    var visualTransitionGeneration = 0
    init(mode: GameMode, pointValue: Int, startingPlayer: PlayerID = .human, difficulty: AIDifficulty = .normal, roundMultiplier: Int = 1, deck: [HwatuCard]? = nil) {
        self.mode = mode
        self.pointValue = pointValue
        self.gameUuid = UUID().uuidString
        self.createdAt = ISO8601DateFormatter().string(from: Date())
        self.currentPlayer = startingPlayer
        self.startingPlayer = startingPlayer
        self.difficulty = difficulty
        self.roundMultiplier = max(1, roundMultiplier)
        if mode == .matgo { missionCards = Self.makeMission(gameUuid: gameUuid) }
        deal(deck: deck)
    }
    init(snapshot: NativeGameSnapshot) {
        mode = GameMode(rawValue: snapshot.gameMode) ?? .matgo
        pointValue = snapshot.pointValue
        gameUuid = snapshot.gameUuid
        createdAt = snapshot.createdAt
        difficulty = snapshot.computerDifficulty ?? .normal
        roundMultiplier = max(1, snapshot.roundMultiplier ?? 1)
        turnNumber = snapshot.turnNumber
        currentPlayer = snapshot.currentPlayer
        startingPlayer = snapshot.startingPlayer ?? snapshot.currentPlayer
        floorCards = snapshot.floorCards.compactMap { HwatuDeck.byID[$0] }
        drawPile = snapshot.drawPile.compactMap { HwatuDeck.byID[$0] }
        hands[.human] = snapshot.humanHand.compactMap { HwatuDeck.byID[$0] }
        hands[.computer] = snapshot.computerHand.compactMap { HwatuDeck.byID[$0] }
        if mode == .gostop {
            hands[.computerA] = (snapshot.computerAHand ?? []).compactMap { HwatuDeck.byID[$0] }
            hands[.computerB] = (snapshot.computerBHand ?? []).compactMap { HwatuDeck.byID[$0] }
        }
        captured[.human] = snapshot.humanCaptured.compactMap { HwatuDeck.byID[$0] }
        captured[.computer] = snapshot.computerCaptured.compactMap { HwatuDeck.byID[$0] }
        if mode == .gostop {
            captured[.computerA] = (snapshot.computerACaptured ?? []).compactMap { HwatuDeck.byID[$0] }
            captured[.computerB] = (snapshot.computerBCaptured ?? []).compactMap { HwatuDeck.byID[$0] }
        }
        goCounts[.human] = snapshot.humanGoCount
        goCounts[.computer] = snapshot.computerGoCount
        goCounts[.computerA] = snapshot.computerAGoCount ?? 0
        goCounts[.computerB] = snapshot.computerBGoCount ?? 0
        lastAction = snapshot.lastAction
        winner = snapshot.winner
        settlement = snapshot.settlement
        shakeCounts = Self.playerDictionary(snapshot.shakeCounts)
        bombCounts = Self.playerDictionary(snapshot.bombCounts)
        bombSkips = Self.playerDictionary(snapshot.bombSkips)
        gookjinAsPee = Self.playerDictionary(snapshot.gookjinAsPee)
        shakenMonths = Self.playerDictionary(snapshot.shakenMonths).mapValues(Set.init)
        missionCards = (snapshot.missionCardIds ?? []).compactMap { HwatuDeck.byID[$0] }
        if missionCards.isEmpty { missionCards = Self.makeMission(gameUuid: gameUuid) }
        ppeokCounts = Self.playerDictionary(snapshot.ppeokCounts)
        emptyCaptureStreaks = Self.playerDictionary(snapshot.emptyCaptureStreaks)
        turnCounts = Self.playerDictionary(snapshot.turnCounts)
        openingPpeokCounts = Self.playerDictionary(snapshot.openingPpeokCounts)
        openingPpeokTotals = Self.playerDictionary(snapshot.openingPpeokTotals)
        sweepCounts = Self.playerDictionary(snapshot.sweepCounts)
        interimPointDeltas = Self.playerDictionary(snapshot.interimPointDeltas)
        lastGoPlayer = snapshot.lastGoPlayer
        gookjinChoiceMade = Self.playerDictionary(snapshot.gookjinChoiceMade)
        lastDiscardedCardId = snapshot.lastDiscardedCardId
        lastDiscardedBy = snapshot.lastDiscardedBy
        ppeokOwners = Dictionary(uniqueKeysWithValues: (snapshot.ppeokOwners ?? [:]).compactMap { month, owner in
            guard let month = Int(month), let player = PlayerID(rawValue: owner) else { return nil }
            return (month, player)
        })
        phase = GamePhase(snapshotName: snapshot.phase, player: snapshot.phasePlayer)
        activePlayedCard = snapshot.activePlayedCardId.flatMap { HwatuDeck.byID[$0] }
        if let value = snapshot.stagedPairState,
           let newCard = HwatuDeck.byID[value.newCardId], let floorCard = HwatuDeck.byID[value.floorCardId] {
            stagedPair = .init(newCard: newCard, floorCard: floorCard, player: value.player)
        }
        if let value = snapshot.pendingMatchState, let card = HwatuDeck.byID[value.cardId] {
            pendingMatch = .init(card: card, candidates: value.candidateIds.compactMap { HwatuDeck.byID[$0] }, player: value.player, stage: value.stage)
        }
        pendingChongtong = snapshot.pendingChongtongState
    }
    var humanHand: [HwatuCard] { hands[.human] ?? [] }
    var isHumanTurn: Bool {
        currentPlayer == .human && phase == .playing && pendingMatch == nil && !isTurnTransitioning
    }
    var isEnded: Bool { phase == .ended }
    var remainingUndos: Int { max(0, 3 - undosUsed) }
    var canUndo: Bool { !undoStack.isEmpty && remainingUndos > 0 && phase != .ended }
    var pointDeltas: [PlayerID: Int] {
        if let values = settlement?.pointDeltas { return Self.playerDictionary(values) }
        return interimPointDeltas
    }

    func needsGookjinChoice(for player: PlayerID) -> Bool {
        captured[player]?.contains(where: { $0.tags.contains("gookjin") }) == true
            && gookjinChoiceMade[player] != true
    }

    func score(for player: PlayerID) -> CapturedScore {
        HwatuScoring.score(captured[player] ?? [], gookjinAsPee: gookjinAsPee[player] == true)
    }

    func bombOption(for card: HwatuCard) -> NativeBombOption? {
        NativeSpecialRules.bombOptions(hand: hands[currentPlayer] ?? [], floor: floorCards)
            .first { $0.handCards.contains(card) }
    }

    func shakeOption(for card: HwatuCard) -> NativeShakeOption? {
        NativeSpecialRules.shakeOptions(
            hand: hands[currentPlayer] ?? [],
            floor: floorCards,
            excluding: shakenMonths[currentPlayer] ?? []
        ).first { $0.handCards.contains(card) }
    }

    func declareShake(month: Int) {
        guard shakeOptionForCurrentPlayer(month: month) != nil else { return }
        shakenMonths[currentPlayer, default: []].insert(month)
        shakeCounts[currentPlayer, default: 0] += 1
        lastRuleEvents = [.init(kind: .shake, label: "흔들기", player: currentPlayer, stolenPee: [])]
        specialNotice = "흔들기!"
        lastAction = "\(currentPlayer.displayName)이 \(month)월 세 장을 흔들었습니다."
    }

    func playBomb(_ option: NativeBombOption) {
        let available = NativeSpecialRules.bombOptions(hand: hands[currentPlayer] ?? [], floor: floorCards)
        guard phase == .playing, pendingMatch == nil, available.contains(option) else { return }
        if currentPlayer == .human { captureUndoState() }
        beginTurnTracking(removingHandCards: option.handCards.count)
        let animateBomb = currentPlayer != .human || (mode == .gostop && automaticPlayEnabled)
        if animateBomb, let firstCard = option.handCards.first {
            cardMotion = scheduleCardMotion(card: firstCard, kind: .bomb)
        }
        animateNextDraw = mode == .gostop && animateBomb
        hands[currentPlayer]?.removeAll { option.handCards.contains($0) }
        floorCards.removeAll { option.floorCards.contains($0) }
        captured[currentPlayer, default: []].append(contentsOf: option.floorCards + option.handCards)
        bombCounts[currentPlayer, default: 0] += 1
        let alreadyShaken = shakenMonths[currentPlayer]?.contains(option.month) == true
        if mode == .matgo {
            shakeCounts[currentPlayer, default: 0] += option.kind == .fourCard && !alreadyShaken ? 2 : 1
            if option.kind == .fourCard { shakenMonths[currentPlayer, default: []].insert(option.month) }
        }
        bombSkips[currentPlayer, default: 0] += max(0, option.handCards.count - 1)
        activePlayedCard = nil
        let nuclear = mode == .matgo
            && lastDiscardedBy != nil && lastDiscardedBy != currentPlayer
            && option.floorCards.contains(where: { $0.id == lastDiscardedCardId })
        lastDiscardedCardId = nil
        lastDiscardedBy = nil
        let stolen = stealPee(for: currentPlayer, targetValue: nuclear ? 2 : 1)
        queuePeeTransfer(stolen)
        let label = nuclear ? "핵폭탄" : option.kind.rawValue
        lastRuleEvents = [.init(kind: nuclear ? .nuclearBomb : .bomb, label: label, player: currentPlayer, stolenPee: stolen)]
        specialNotice = stolen.isEmpty ? "\(label)!" : "\(label) · 피뺏기!"
        lastAction = "\(currentPlayer.displayName)이 \(option.month)월 \(option.kind.rawValue)을 썼습니다."
        drawNext()
    }

    func playBombSkip() {
        guard phase == .playing, pendingMatch == nil, (bombSkips[currentPlayer] ?? 0) > 0 else { return }
        if currentPlayer == .human { captureUndoState() }
        beginTurnTracking(removingHandCards: 0)
        animateNextDraw = true
        bombSkips[currentPlayer, default: 0] -= 1
        specialNotice = "폭탄 보관패 뒤집기"
        lastAction = "\(currentPlayer.displayName)이 폭탄 보관패 대신 더미를 뒤집습니다."
        activePlayedCard = nil
        drawNext()
    }

    func setGookjin(for player: PlayerID, asPee: Bool) {
        guard captured[player]?.contains(where: { $0.tags.contains("gookjin") }) == true else { return }
        gookjinAsPee[player] = asPee
        gookjinChoiceMade[player] = true
        let role = asPee ? "쌍피" : "열끗"
        specialNotice = "국진을 \(role)으로 변경"
        lastAction = asPee
            ? "국진을 쌍피로 바꿔 피 묶음으로 옮겼습니다."
            : "국진을 열끗으로 바꿔 열끗 묶음으로 옮겼습니다."
        reevaluateAfterGookjinChoice(for: player)
    }

    func toggleGookjin(for player: PlayerID) { setGookjin(for: player, asPee: !(gookjinAsPee[player] ?? false)) }

    func dismissSpecialNotice() { specialNotice = nil }
    func dismissRuleEvents() { lastRuleEvents = [] }
    func setAutomaticPlayEnabled(_ enabled: Bool) { automaticPlayEnabled = enabled }

    func chooseChongtongWin() {
        guard let pendingChongtong, case let .awaitingChongtong(player) = phase, player == pendingChongtong.player else { return }
        self.pendingChongtong = nil
        specialNotice = "총통!"
        finish(winner: pendingChongtong.player, forcedBaseScore: mode == .matgo ? 7 : 5, suppressMultipliers: true)
    }

    func chooseChongtongContinue() {
        guard let pendingChongtong, case let .awaitingChongtong(player) = phase, player == pendingChongtong.player else { return }
        shakenMonths[pendingChongtong.player, default: []].insert(pendingChongtong.month)
        shakeCounts[pendingChongtong.player, default: 0] += 1
        self.pendingChongtong = nil
        phase = .playing
        specialNotice = "총통 흔들기!"
        lastAction = "\(pendingChongtong.player.displayName)이 총통 네 장을 흔들고 계속합니다."
        runAIIfNeeded()
    }

    func changePointValue(_ value: Int) {
        guard [100, 1_000, 2_000, 5_000, 10_000].contains(value), phase != .ended else { return }
        pointValue = value
        lastAction = "점당 \(value.formatted())냥으로 변경했습니다."
    }

    func play(_ card: HwatuCard) {
        guard phase == .playing, pendingMatch == nil, hands[currentPlayer]?.contains(card) == true else { return }
        if currentPlayer == .human { captureUndoState() }
        beginTurnTracking(removingHandCards: 1)
        cardMotion = scheduleCardMotion(card: card, kind: .played)
        animateNextDraw = mode == .gostop || currentPlayer == .human
        specialNotice = nil
        hands[currentPlayer]?.removeAll { $0.id == card.id }
        activePlayedCard = card
        if card.isBonus {
            captured[currentPlayer, default: []].append(card)
            let stolen = stealPee(for: currentPlayer)
            lastRuleEvents = [.init(kind: .bonus, label: "보너스 피", player: currentPlayer, stolenPee: stolen)]
            if let replacement = drawPile.popLast() {
                hands[currentPlayer, default: []].append(replacement)
                cardMotion = scheduleCardMotion(card: replacement, kind: .replacement)
            }
            queuePeeTransfer(stolen)
            specialNotice = stolen.isEmpty ? "보너스 피!" : "보너스 피 · 피뺏기!"
            lastAction = "\(currentPlayer.displayName)이 보너스패를 얻고 대체 패를 받았습니다."
            if currentPlayer != .human { runAIIfNeeded() }
            return
        }
        lastDiscardedCardId = nil
        lastDiscardedBy = nil
        resolve(card, stage: .played)
    }

    func chooseMatch(_ card: HwatuCard) {
        guard let pending = pendingMatch, pending.candidates.contains(card) else { return }
        pendingMatch = nil
        if pending.stage == .played {
            stagedPair = NativeStagedPair(newCard: pending.card, floorCard: card, player: pending.player)
            drawNext()
        } else {
            capturePair(newCard: pending.card, floorCard: card, player: pending.player)
            finishTurn()
        }
    }

    func cancelPendingMatch() { guard pendingMatch?.player == .human else { return }; undoLastHumanTurn(); undosUsed = max(0, undosUsed - 1) }

    func chooseGo() {
        guard case let .awaitingGoStop(player) = phase else { return }
        goCounts[player, default: 0] += 1
        scoreAtLastGo[player] = score(for: player).total
        lastGoPlayer = player
        let count = goCounts[player] ?? 1
        specialNotice = count >= 5 ? "오고!" : "\(count)고!"
        lastAction = "\(player.displayName)이 \(goCounts[player] ?? 0)고를 선언했습니다."
        advancePlayer()
    }

    func chooseStop() {
        guard case let .awaitingGoStop(player) = phase else { return }
        specialNotice = "스톱!"
        finish(winner: player)
    }

    func startAIIfNeeded() {
        switch phase {
        case .playing: runAIIfNeeded()
        case .awaitingGoStop: decideAIStop()
        case let .awaitingChongtong(player) where player != .human: scheduleAIChongtong()
        default: break
        }
    }

    func playAutomaticStep() {
        if let pendingMatch {
            if let card = pendingMatch.candidates.max(by: { cardPriority($0) < cardPriority($1) }) { chooseMatch(card) }
            return
        }
        if case .awaitingGoStop = phase { chooseStop(); return }
        if case .awaitingChongtong = phase { chooseChongtongWin(); return }
        guard phase == .playing else { return }
        if (bombSkips[currentPlayer] ?? 0) > 0 { playBombSkip(); return }
        if let bomb = NativeSpecialRules.bombOptions(hand: hands[currentPlayer] ?? [], floor: floorCards).first {
            playBomb(bomb)
            return
        }
        if let card = suggestedCard(for: currentPlayer) { play(card) }
        else { finishTurn() }
    }

    func playSuggestedHumanCard() {
        guard isHumanTurn else { return }
        if (bombSkips[.human] ?? 0) > 0 {
            playBombSkip()
            return
        }
        if let bomb = NativeSpecialRules.bombOptions(hand: humanHand, floor: floorCards).first {
            playBomb(bomb)
            return
        }
        guard let card = suggestedCard(for: .human) else { return }
        if let shake = shakeOption(for: card) { declareShake(month: shake.month) }
        play(card)
    }

    func chooseSuggestedHumanMatch() {
        guard let pending = pendingMatch, pending.player == .human else { return }
        let best = pending.candidates.max { cardPriority($0) < cardPriority($1) }
        if let best { chooseMatch(best) }
    }

    func chooseSuggestedHumanGoStop() {
        guard case .awaitingGoStop(.human) = phase else { return }
        let score = self.score(for: .human).total
        if mode == .gostop {
            let remaining = mode.players.reduce(0) { $0 + (hands[$1]?.count ?? 0) }
            if (goCounts[.human] ?? 0) == 0 && score < 6 && remaining >= 6 { chooseGo() }
            else { chooseStop() }
            return
        }
        let cardsLeft = hands[.human]?.count ?? 0
        if score < mode.stopThreshold + 2 && cardsLeft > 2 && (goCounts[.human] ?? 0) < 2 { chooseGo() }
        else { chooseStop() }
    }

    func undoLastHumanTurn() {
        guard canUndo, let state = undoStack.popLast() else { return }
        hands = state.hands
        captured = state.captured
        floorCards = state.floorCards
        drawPile = state.drawPile
        currentPlayer = state.currentPlayer
        phase = state.phase
        turnNumber = state.turnNumber
        lastAction = "마지막 수를 무르고 다시 선택합니다."
        goCounts = state.goCounts
        scoreAtLastGo = state.scoreAtLastGo
        winner = state.winner
        settlement = state.settlement
        specialNotice = state.specialNotice
        shakeCounts = state.shakeCounts
        bombCounts = state.bombCounts
        bombSkips = state.bombSkips
        gookjinAsPee = state.gookjinAsPee
        shakenMonths = state.shakenMonths
        ppeokCounts = state.ppeokCounts
        ppeokOwners = state.ppeokOwners
        emptyCaptureStreaks = state.emptyCaptureStreaks
        turnCounts = state.turnCounts
        openingPpeokCounts = state.openingPpeokCounts
        openingPpeokTotals = state.openingPpeokTotals
        sweepCounts = state.sweepCounts
        interimPointDeltas = state.interimPointDeltas
        lastGoPlayer = state.lastGoPlayer
        gookjinChoiceMade = state.gookjinChoiceMade
        lastDiscardedCardId = state.lastDiscardedCardId
        lastDiscardedBy = state.lastDiscardedBy
        lastRuleEvents = []
        pendingMatch = nil
        activePlayedCard = nil
        stagedPair = nil
        isAIThinking = false
        undosUsed += 1
    }

    private func deal(deck suppliedDeck: [HwatuCard]? = nil) {
        var deck = suppliedDeck ?? HwatuDeck.shuffled(for: mode)
        for player in mode.players {
            hands[player] = []
            captured[player] = []
            goCounts[player] = 0
            shakeCounts[player] = 0
            bombCounts[player] = 0
            bombSkips[player] = 0
            gookjinAsPee[player] = false
            shakenMonths[player] = []
            ppeokCounts[player] = 0
            emptyCaptureStreaks[player] = 0
            turnCounts[player] = 0
            openingPpeokCounts[player] = 0
            openingPpeokTotals[player] = 0
            sweepCounts[player] = 0
            interimPointDeltas[player] = 0
            gookjinChoiceMade[player] = false
        }
        for _ in 0..<mode.handSize {
            for player in mode.players {
                if let card = deck.popLast() { hands[player, default: []].append(card) }
            }
        }
        while floorCards.filter({ !$0.isBonus }).count < mode.floorSize, let card = deck.popLast() {
            if card.isBonus { captured[.human, default: []].append(card) } else { floorCards.append(card) }
        }
        drawPile = deck
        for player in mode.players { hands[player]?.sort { ($0.month, $0.id) < ($1.month, $1.id) } }
        lastAction = currentPlayer == .human
            ? "\(roundMultiplier > 1 ? "나가리 이월 ×\(roundMultiplier). " : "")내 차례입니다. 손패에서 한 장을 골라 주세요."
            : "\(roundMultiplier > 1 ? "나가리 이월 ×\(roundMultiplier). " : "")상대가 선입니다. 첫 수를 기다려 주세요."
        evaluateInitialChongtong()
    }

    private func resolve(_ card: HwatuCard, stage: PendingMatch.Stage) {
        let matches = floorCards.filter { $0.month == card.month }
        switch matches.count {
        case 0:
            floorCards.append(card)
            if stage == .played {
                lastDiscardedCardId = card.id
                lastDiscardedBy = currentPlayer
            }
            lastAction = "\(card.month)월 패를 바닥에 놓았습니다."
            continueAfterResolution(stage: stage)
        case 1:
            if stage == .played {
                stagedPair = NativeStagedPair(newCard: card, floorCard: matches[0], player: currentPlayer)
                lastAction = "\(card.month)월 패를 맞추고 뒤집습니다."
                drawNext()
            } else {
                let isJjok = activePlayedCard?.month == card.month
                capturePair(newCard: card, floorCard: matches[0], player: currentPlayer)
                if isJjok {
                    let stolen = currentTurnIsFinalHand && mode == .matgo ? [] : stealPee(for: currentPlayer)
                    queuePeeTransfer(stolen)
                    appendRuleEvent(.jjok, label: "쪽", stolen: stolen)
                    specialNotice = stolen.isEmpty ? "쪽!" : "쪽 · 피뺏기!"
                    lastAction = "\(currentPlayer.displayName)이 쪽으로 패를 가져갔습니다."
                }
                applySweepIfNeeded(suppressForFinalMatgo: true)
                finishTurn()
            }
        case 2:
            if currentPlayer == .human {
                pendingMatch = PendingMatch(card: card, candidates: matches, player: currentPlayer, stage: stage)
                lastAction = "같은 월 패 중 가져올 패를 선택해 주세요."
            } else {
                let choice = matches.max { cardPriority($0) < cardPriority($1) } ?? matches[0]
                if stage == .played {
                    stagedPair = NativeStagedPair(newCard: card, floorCard: choice, player: currentPlayer)
                    drawNext()
                } else {
                    capturePair(newCard: card, floorCard: choice, player: currentPlayer)
                    applySweepIfNeeded(suppressForFinalMatgo: true)
                    finishTurn()
                }
            }
        default:
            let ppeokOwner = ppeokOwners.removeValue(forKey: card.month)
            floorCards.removeAll { $0.month == card.month }
            captured[currentPlayer, default: []].append(contentsOf: matches + [card])
            if let ppeokOwner {
                let notice = NativeSpecialRules.ppeokCaptureNotice(owner: ppeokOwner, captor: currentPlayer)
                let targetValue = ppeokOwner == currentPlayer && mode == .matgo ? 2 : 1
                let stolen = currentTurnIsFinalHand && mode == .matgo ? [] : stealPee(for: currentPlayer, targetValue: targetValue)
                queuePeeTransfer(stolen)
                appendRuleEvent(ppeokOwner == currentPlayer ? .selfPpeok : .ppeokCapture, label: notice.replacingOccurrences(of: "!", with: ""), stolen: stolen)
                specialNotice = stolen.isEmpty ? notice : "\(notice.dropLast()) · 피뺏기!"
                lastAction = "\(currentPlayer.displayName)이 \(card.month)월 싼 패를 가져갔습니다."
            } else {
                lastAction = "\(currentPlayer.displayName)이 \(card.month)월 패를 모두 가져갔습니다."
            }
            applySweepIfNeeded(suppressForFinalMatgo: true)
            continueAfterResolution(stage: stage)
        }
    }

    private func capturePair(newCard: HwatuCard, floorCard: HwatuCard, player: PlayerID) {
        floorCards.removeAll { $0.id == floorCard.id }
        captured[player, default: []].append(contentsOf: [floorCard, newCard])
        lastAction = "\(player.displayName)이 \(newCard.month)월 패를 가져갔습니다."
    }

    private func continueAfterResolution(stage: PendingMatch.Stage) {
        if stage == .played { drawNext() } else { finishTurn() }
    }

    private func drawNext() {
        guard let card = drawPile.popLast() else { finishTurn(); return }
        if animateNextDraw { cardMotion = scheduleCardMotion(card: card, kind: .drawn) }
        if card.isBonus {
            captured[currentPlayer, default: []].append(card)
            let stolen = stealPee(for: currentPlayer)
            specialNotice = stolen.isEmpty ? "뒤집은 보너스 피!" : "뒤집은 보너스 피 · 피뺏기!"
            lastAction = "뒤집은 보너스패를 얻었습니다."
            drawNext()
            queuePeeTransfer(stolen)
            return
        }
        if let stagedPair {
            let sameMonthOnFloor = floorCards.filter { $0.month == stagedPair.newCard.month }
            if card.month == stagedPair.newCard.month && sameMonthOnFloor.count == 1 {
                self.stagedPair = nil
                floorCards.append(stagedPair.newCard)
                floorCards.append(card)
                ppeokOwners[card.month] = currentPlayer
                ppeokCounts[currentPlayer, default: 0] += 1
                if mode == .matgo, turnNumber < 2 { openingPpeokTotals[currentPlayer, default: 0] += 1 }
                let declaration = NativeSpecialRules.ppeokDeclaration(count: ppeokCounts[currentPlayer] ?? 1)
                appendRuleEvent(.ppeok, label: declaration.notice.replacingOccurrences(of: "!", with: ""), stolen: [])
                specialNotice = declaration.notice
                lastAction = "\(currentPlayer.displayName)이 \(ppeokCounts[currentPlayer] ?? 1)번째 뻑을 했습니다."
                finishTurn()
                return
            }
            if card.month == stagedPair.newCard.month && sameMonthOnFloor.count == 2 {
                self.stagedPair = nil
                floorCards.removeAll { $0.month == card.month }
                captured[currentPlayer, default: []].append(contentsOf: sameMonthOnFloor + [stagedPair.newCard, card])
                let stolen = currentTurnIsFinalHand && mode == .matgo ? [] : stealPee(for: currentPlayer)
                queuePeeTransfer(stolen)
                appendRuleEvent(.ttadak, label: "따닥", stolen: stolen)
                specialNotice = stolen.isEmpty ? "따닥!" : "따닥 · 피뺏기!"
                lastAction = "\(currentPlayer.displayName)이 따닥으로 \(card.month)월 패를 모두 가져갔습니다."
                if mode == .gostop, (turnCounts[currentPlayer] ?? 0) == 0 {
                    awardImmediatePoints(to: currentPlayer, pointsPerOpponent: 3)
                }
                applySweepIfNeeded(suppressForFinalMatgo: true)
                finishTurn()
                return
            }
            self.stagedPair = nil
            capturePair(newCard: stagedPair.newCard, floorCard: stagedPair.floorCard, player: stagedPair.player)
        }
        resolve(card, stage: .drawn)
    }

    private func finishTurn() {
        updateTurnTracking()
        stagedPair = nil
        activePlayedCard = nil
        turnNumber += 1
        if currentPlayer != .human, needsGookjinChoice(for: currentPlayer) {
            gookjinAsPee[currentPlayer] = HwatuScoring.prefersGookjinAsPee(captured[currentPlayer] ?? [])
            gookjinChoiceMade[currentPlayer] = true
        }
        if (ppeokCounts[currentPlayer] ?? 0) >= 3 {
            finish(winner: currentPlayer, forcedBaseScore: mode == .matgo ? 7 : 3, suppressMultipliers: true)
            return
        }
        if mode == .gostop, (emptyCaptureStreaks[currentPlayer] ?? 0) >= 5 {
            appendRuleEvent(.emptyCapture, label: "허당 5회", stolen: [])
            finish(winner: currentPlayer, forcedBaseScore: 3, suppressMultipliers: true)
            return
        }
        let currentScore = score(for: currentPlayer).total
        let lastGo = scoreAtLastGo[currentPlayer] ?? -1
        let allComplete = mode.players.allSatisfy {
            hands[$0]?.isEmpty != false && (bombSkips[$0] ?? 0) == 0
        }
        if allComplete || drawPile.isEmpty {
            if currentScore >= mode.stopThreshold && currentScore > lastGo {
                finish(winner: currentPlayer)
                lastAction = "\(currentPlayer.displayName)이 마지막 패를 내고 자동으로 스톱했습니다."
            } else {
                phase = .ended
                winner = nil
                settlement = nil
                lastAction = "아무도 새 점수를 내지 못해 나가리입니다. 다음 판은 \(nextRoundMultiplier)배입니다."
            }
            return
        }
        if currentScore >= mode.stopThreshold && currentScore > lastGo {
            phase = .awaitingGoStop(currentPlayer)
            if currentPlayer != .human { decideAIStop() }
            return
        }
        advancePlayer()
    }

    private func advancePlayer() {
        phase = .playing
        guard let index = mode.players.firstIndex(of: currentPlayer) else { return }
        currentPlayer = mode.players[(index + 1) % mode.players.count]
        lastAction = "\(currentPlayer.displayName)의 차례입니다."
        runAIIfNeeded()
    }

    private func runAIIfNeeded() {
        guard currentPlayer != .human, phase == .playing, pendingMatch == nil else { return }
        let player = currentPlayer
        Task { @MainActor [weak self] in
            await self?.waitForVisualTransition()
            guard let self, self.currentPlayer == player, self.phase == .playing, self.pendingMatch == nil else { return }
            self.isAIThinking = true
            let plan = NativeAIThinkingPlan.make(difficulty: self.difficulty, gameIdentifier: self.gameUuid, turnNumber: self.turnNumber, kind: .turn, automaticPlay: self.automaticPlayEnabled)
            let delay = NativeGameTiming.aiMilliseconds(for: self.mode, plan: plan)
            try? await Task.sleep(for: .milliseconds(delay))
            self.isAIThinking = false
            guard self.currentPlayer == player, self.phase == .playing else { return }
            if (self.bombSkips[player] ?? 0) > 0 {
                self.playBombSkip()
                return
            }
            if let bomb = NativeSpecialRules.bombOptions(hand: self.hands[player] ?? [], floor: self.floorCards).first,
               self.difficulty != .easy {
                self.playBomb(bomb)
                return
            }
            let selected = self.suggestedCard(for: player)
            if let selected {
                if self.difficulty != .easy, let shake = self.shakeOption(for: selected) {
                    self.declareShake(month: shake.month)
                }
                self.play(selected)
            } else {
                self.finishTurn()
            }
        }
    }

    private func decideAIStop() {
        guard case let .awaitingGoStop(player) = phase else { return }
        Task { @MainActor [weak self] in
            await self?.waitForVisualTransition()
            guard let self, case .awaitingGoStop(player) = self.phase else { return }
            self.isAIThinking = true
            let plan = NativeAIThinkingPlan.make(difficulty: self.difficulty, gameIdentifier: self.gameUuid, turnNumber: self.turnNumber, kind: .goStop, automaticPlay: self.automaticPlayEnabled)
            let delay = NativeGameTiming.aiMilliseconds(for: self.mode, plan: plan)
            try? await Task.sleep(for: .milliseconds(delay))
            self.isAIThinking = false
            guard case .awaitingGoStop(player) = self.phase else { return }
            let score = self.score(for: player).total
            let cardsLeft = self.hands[player]?.count ?? 0
            let margin: Int
            switch self.difficulty {
            case .easy: margin = 0
            case .normal: margin = 2
            case .hard: margin = 3
            case .expert: margin = 4
            }
            if score < self.mode.stopThreshold + margin && cardsLeft > 2 && (self.goCounts[player] ?? 0) < (self.difficulty == .expert ? 3 : 2) {
                self.chooseGo()
            } else {
                self.chooseStop()
            }
        }
    }

    private func finish(winner player: PlayerID, forcedBaseScore: Int? = nil, suppressMultipliers: Bool = false) {
        winner = player
        let losers = mode.players.filter { $0 != player }
        settlement = NativeSpecialRules.settlement(
            winnerScore: score(for: player),
            loserScores: losers.map { score(for: $0) },
            goCount: goCounts[player] ?? 0,
            loserGoCounts: losers.map { goCounts[$0] ?? 0 },
            shakeCount: (shakeCounts[player] ?? 0) + (mode == .gostop ? bombCounts[player] ?? 0 : 0),
            mode: mode,
            pointValue: pointValue,
            forcedBaseScore: forcedBaseScore,
            missionMultiplier: missionMultiplier(for: player),
            roundMultiplier: roundMultiplier,
            loserPlayers: losers,
            loserCapturedCounts: losers.map { captured[$0]?.count ?? 0 },
            scoreAtLastGo: scoreAtLastGo,
            lastGoPlayer: lastGoPlayer,
            interimPointDeltas: interimPointDeltas,
            suppressMultipliers: suppressMultipliers
        )
        phase = .ended
        lastAction = "\(player.displayName)이 \(settlement?.finalScore ?? 0)점으로 승리했습니다."
    }

    private func aiValue(_ card: HwatuCard) -> Int {
        let matching = floorCards.filter { $0.month == card.month }
        return matching.reduce(cardPriority(card)) { $0 + cardPriority($1) } + matching.count * 10
    }

    private func suggestedCard(for player: PlayerID) -> HwatuCard? {
        let hand = hands[player] ?? []
        guard !hand.isEmpty else { return nil }
        switch difficulty {
        case .easy:
            return Bool.random() ? hand.randomElement() : hand.min { aiValue($0) < aiValue($1) }
        case .normal:
            return hand.max { aiValue($0) < aiValue($1) }
        case .hard:
            return hand.max { strategicValue($0, player: player) < strategicValue($1, player: player) }
        case .expert:
            return hand.max { expertValue($0, player: player) < expertValue($1, player: player) }
        }
    }

    private func strategicValue(_ card: HwatuCard, player: PlayerID) -> Int {
        let ownScore = score(for: player).total
        let matching = floorCards.filter { $0.month == card.month }
        let captureBonus = matching.reduce(0) { $0 + cardPriority($1) * 3 }
        return aiValue(card) * 2 + captureBonus + (ownScore >= mode.stopThreshold - 1 ? cardPriority(card) * 2 : 0)
    }

    private func expertValue(_ card: HwatuCard, player: PlayerID) -> Int {
        let opponents = mode.players.filter { $0 != player }
        let opponentThreat = opponents.map { score(for: $0).total }.max() ?? 0
        let remainingSameMonth = drawPile.filter { $0.month == card.month }.count
        return strategicValue(card, player: player) * 2 + remainingSameMonth * 3 + opponentThreat * cardPriority(card)
    }

    private func beginTurnTracking(removingHandCards count: Int) {
        capturedCountAtTurnStart = captured[currentPlayer]?.count ?? 0
        currentTurnIsFinalHand = mode.players.allSatisfy { player in
            let remaining = (hands[player]?.count ?? 0) - (player == currentPlayer ? count : 0)
            return remaining == 0 && (bombSkips[player] ?? 0) == 0
        }
        lastRuleEvents = []
    }

    private func appendRuleEvent(_ kind: NativeRuleEvent.Kind, label: String, stolen: [HwatuCard]) {
        lastRuleEvents.append(.init(kind: kind, label: label, player: currentPlayer, stolenPee: stolen))
    }

    private func applySweepIfNeeded(suppressForFinalMatgo: Bool) {
        guard floorCards.isEmpty, !(suppressForFinalMatgo && mode == .matgo && currentTurnIsFinalHand) else { return }
        let stolen = stealPee(for: currentPlayer)
        queuePeeTransfer(stolen)
        appendRuleEvent(.sweep, label: "싹쓸이", stolen: stolen)
        sweepCounts[currentPlayer, default: 0] += 1
        let prefix = specialNotice.map { "\($0.replacingOccurrences(of: "!", with: "")) · " } ?? ""
        specialNotice = "\(prefix)싹쓸이\(stolen.isEmpty ? "!" : " · 피뺏기!")"
        lastAction = "\(currentPlayer.displayName)이 바닥패를 싹쓸이했습니다."
    }

    private func updateTurnTracking() {
        guard mode == .gostop else { return }
        let capturedThisTurn = max(0, (captured[currentPlayer]?.count ?? 0) - capturedCountAtTurnStart)
        let isPpeok = lastRuleEvents.contains { $0.kind == .ppeok }
        if isPpeok {
            if (openingPpeokCounts[currentPlayer] ?? 0) == (turnCounts[currentPlayer] ?? 0) {
                openingPpeokCounts[currentPlayer, default: 0] += 1
                openingPpeokTotals[currentPlayer, default: 0] += 1
                awardImmediatePoints(to: currentPlayer, pointsPerOpponent: (openingPpeokCounts[currentPlayer] ?? 1) * 3)
            }
        } else if (openingPpeokCounts[currentPlayer] ?? 0) == (turnCounts[currentPlayer] ?? 0) {
            openingPpeokCounts[currentPlayer] = -1
        }
        turnCounts[currentPlayer, default: 0] += 1
        emptyCaptureStreaks[currentPlayer] = capturedThisTurn > 0 ? 0 : (emptyCaptureStreaks[currentPlayer] ?? 0) + 1
    }

    private func awardImmediatePoints(to winner: PlayerID, pointsPerOpponent: Int) {
        for opponent in mode.players where opponent != winner {
            interimPointDeltas[opponent, default: 0] -= pointsPerOpponent
            interimPointDeltas[winner, default: 0] += pointsPerOpponent
        }
    }

    private func reevaluateAfterGookjinChoice(for player: PlayerID) {
        let choiceAction = lastAction
        let total = score(for: player).total
        let canDecide = total >= mode.stopThreshold && total > (scoreAtLastGo[player] ?? -1)
        let allComplete = mode.players.allSatisfy { hands[$0]?.isEmpty != false && (bombSkips[$0] ?? 0) == 0 }
        if allComplete {
            if canDecide {
                finish(winner: player)
                lastAction = "\(choiceAction) 마지막 패까지 모두 내서 자동으로 스톱했습니다."
            }
            else {
                phase = .ended
                winner = nil
                settlement = nil
                lastAction = "\(choiceAction) 모든 패를 냈지만 \(mode.stopThreshold)점에 도달하지 못해 나가리입니다."
            }
        } else if case .awaitingGoStop(player) = phase, !canDecide {
            advancePlayer()
            lastAction = "\(choiceAction) 현재 \(total)점이라 승부 선택 없이 상대 차례로 넘어갑니다."
        } else if phase == .playing, canDecide {
            phase = .awaitingGoStop(player)
            if currentPlayer == player, let index = mode.players.firstIndex(of: player) {
                currentPlayer = mode.players[(index + 1) % mode.players.count]
            }
            lastAction += " 현재 \(total)점입니다. 고 또는 스톱을 선택하세요."
            if player != .human { decideAIStop() }
        }
    }

    @discardableResult
    private func stealPee(for player: PlayerID, targetValue: Int = 1) -> [HwatuCard] {
        var stolen: [HwatuCard] = []
        for opponent in mode.players where opponent != player {
            var stolenValue = 0
            while stolenValue < targetValue {
                guard let index = captured[opponent]?.firstIndex(where: { $0.kind == .junk })
                    ?? captured[opponent]?.firstIndex(where: { $0.kind == .doubleJunk }) else { break }
                let card = captured[opponent]!.remove(at: index)
                captured[player, default: []].append(card)
                stolen.append(card)
                stolenValue += max(1, card.peeValue)
            }
        }
        return stolen
    }

    private func captureUndoState() {
        guard remainingUndos > 0 else { return }
        undoStack.append(NativeGameUndoState(
            hands: hands,
            captured: captured,
            floorCards: floorCards,
            drawPile: drawPile,
            currentPlayer: currentPlayer,
            phase: phase,
            turnNumber: turnNumber,
            lastAction: lastAction,
            goCounts: goCounts,
            scoreAtLastGo: scoreAtLastGo,
            winner: winner,
            settlement: settlement,
            specialNotice: specialNotice,
            shakeCounts: shakeCounts,
            bombCounts: bombCounts,
            bombSkips: bombSkips,
            gookjinAsPee: gookjinAsPee,
            shakenMonths: shakenMonths,
            ppeokCounts: ppeokCounts,
            ppeokOwners: ppeokOwners,
            emptyCaptureStreaks: emptyCaptureStreaks,
            turnCounts: turnCounts,
            openingPpeokCounts: openingPpeokCounts,
            openingPpeokTotals: openingPpeokTotals,
            sweepCounts: sweepCounts,
            interimPointDeltas: interimPointDeltas,
            lastGoPlayer: lastGoPlayer,
            gookjinChoiceMade: gookjinChoiceMade,
            lastDiscardedCardId: lastDiscardedCardId,
            lastDiscardedBy: lastDiscardedBy
        ))
        if undoStack.count > 3 { undoStack.removeFirst() }
    }

    private func evaluateInitialChongtong() {
        if let floorMonth = Dictionary(grouping: floorCards, by: \.month).first(where: { $0.value.count == 4 })?.key {
            phase = .ended
            lastAction = "바닥 \(floorMonth)월 총통으로 나가리입니다."
            specialNotice = "바닥 총통 · 나가리"
            return
        }
        let totals = mode.players.compactMap { player -> NativeChongtong? in
            guard let group = Dictionary(grouping: hands[player] ?? [], by: \.month).first(where: { $0.value.count == 4 }) else { return nil }
            return NativeChongtong(player: player, month: group.key, cards: group.value)
        }
        if totals.count > 1 {
            phase = .ended
            lastAction = "두 명 이상 총통으로 나가리입니다."
            specialNotice = "양쪽 총통 · 나가리"
        } else if let total = totals.first {
            pendingChongtong = total
            phase = .awaitingChongtong(total.player)
            lastAction = "\(total.player.displayName)의 \(total.month)월 총통 선택을 기다립니다."
        }
    }

    private func scheduleAIChongtong() {
        guard case let .awaitingChongtong(player) = phase, player != .human else { return }
        Task { @MainActor [weak self] in
            await self?.waitForVisualTransition()
            guard let self, case .awaitingChongtong(player) = self.phase else { return }
            self.isAIThinking = true
            let plan = NativeAIThinkingPlan.make(difficulty: self.difficulty, gameIdentifier: self.gameUuid, turnNumber: self.turnNumber, kind: .chongtong, automaticPlay: self.automaticPlayEnabled)
            let delay = NativeGameTiming.aiMilliseconds(for: self.mode, plan: plan)
            try? await Task.sleep(for: .milliseconds(delay))
            self.isAIThinking = false
            guard case .awaitingChongtong(player) = self.phase else { return }
            self.chooseChongtongWin()
        }
    }

    private func shakeOptionForCurrentPlayer(month: Int) -> NativeShakeOption? {
        NativeSpecialRules.shakeOptions(
            hand: hands[currentPlayer] ?? [],
            floor: floorCards,
            excluding: shakenMonths[currentPlayer] ?? []
        ).first { $0.month == month }
    }

}
