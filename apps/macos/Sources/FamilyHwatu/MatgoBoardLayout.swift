import SwiftUI

struct MatgoBoardLayout: View {
    @ObservedObject var session: GameSession
    let displayName: String
    let balance: Int64
    let opponentBalance: Int64
    let profileImageURL: URL?
    let profileImageUploading: Bool
    let selectProfileImage: () -> Void
    @Binding var soundEnabled: Bool
    @Binding var voiceEnabled: Bool
    @Binding var backgroundMusicEnabled: Bool
    @Binding var soundVolume: Double
    @Binding var autoPlay: Bool
    @Binding var discardConfirmation: Bool
    let autoPlayDisabled: Bool
    let exitReserved: Bool
    let openExit: () -> Void
    let newGame: () -> Void
    let openGookjinChoice: () -> Void
    let selectCard: (HwatuCard) -> Void
    @State private var stakeSelectorOpen = false

    var body: some View {
        GeometryReader { geometry in
            let railWidth = min(270, max(220, geometry.size.width * 0.18))
            ZStack(alignment: .topLeading) {
                HStack(alignment: .top, spacing: 0) {
                    gameField(containerSize: geometry.size)
                        .frame(width: geometry.size.width - railWidth, height: geometry.size.height)
                    sideRail
                        .frame(width: railWidth, height: max(0, geometry.size.height - 158))
                }
                humanDock
                    .frame(width: geometry.size.width)
                    .frame(maxHeight: .infinity, alignment: .bottom)
                    .padding(4)
            }
        }
    }

    private func gameField(containerSize: CGSize) -> some View {
        GeometryReader { geometry in
            let rackHeight = min(112, max(70, geometry.size.height * 0.10))
            let rackWidth = geometry.size.width * 0.79
            let rackCenterX = geometry.size.width * 0.04 + rackWidth / 2
            let opponentRackTop = min(70, max(48, geometry.size.height * 0.07))
            let bottomDockHeight = min(170, max(148, containerSize.width * 0.135))
            ZStack {
            LinearGradient(
                stops: [
                    .init(color: Color(red: 0.325, green: 0.741, blue: 0.043), location: 0),
                    .init(color: Color(red: 0.412, green: 0.847, blue: 0.090), location: 0.47),
                    .init(color: Color(red: 0.310, green: 0.733, blue: 0.047), location: 0.48),
                    .init(color: Color(red: 0.459, green: 0.835, blue: 0.118), location: 1)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            RadialGradient(colors: [Color(red: 0.62, green: 1.0, blue: 0.29).opacity(0.72), .clear], center: .center, startRadius: 30, endRadius: 570)

            stakeButton
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .padding(.top, 120)

            if stakeSelectorOpen {
                stakeSelector
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .padding(.top, 163)
                    .padding(.leading, 8)
            }

            undoButton
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)

            opponentHand
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                .padding(.top, max(10, geometry.size.height * 0.015))
                .padding(.trailing, geometry.size.width * 0.016)

            opponentCaptured
                .frame(width: rackWidth, height: rackHeight, alignment: .leading)
                .position(x: rackCenterX, y: opponentRackTop + rackHeight / 2)

            floorArea
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(.bottom, 125)

            humanCaptured
                .frame(width: rackWidth, height: rackHeight, alignment: .leading)
                .position(
                    x: rackCenterX,
                    y: geometry.size.height - bottomDockHeight - 8 - rackHeight / 2
                )

            scoreBadge(player: .computer)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                .padding(.top, 85)
                .padding(.trailing, 18)

            scoreBadge(player: .human)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                .padding(.trailing, 18)
                .padding(.bottom, 170)
            }
        }
        .clipped()
    }

    private var stakeButton: some View {
        Button { stakeSelectorOpen.toggle() } label: {
            HStack(spacing: 7) {
                Text("점 \(session.pointValue.formatted())냥").font(.callout.weight(.black))
                Divider().frame(height: 18)
                Text("변경 ▾").font(.caption2.weight(.black))
            }
            .foregroundStyle(session.pointValue == 100 ? Color(red: 0.31, green: 0.19, blue: 0) : .white)
            .padding(.leading, 9)
            .padding(.trailing, 14)
            .frame(minHeight: 38)
            .background(stakeGradient, in: UnevenRoundedRectangle(bottomTrailingRadius: 18, topTrailingRadius: 18))
            .overlay(UnevenRoundedRectangle(bottomTrailingRadius: 18, topTrailingRadius: 18).stroke(Color.black.opacity(0.34), lineWidth: 2))
        }
        .buttonStyle(.plain)
        .help("점당 금액은 새 판에서 변경할 수 있습니다")
    }

    private var stakeSelector: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("점당 게임머니").font(.caption.weight(.black))
                Spacer()
                Button("닫기") { stakeSelectorOpen = false }.buttonStyle(.plain)
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 6) {
                ForEach([100, 1_000, 2_000, 5_000, 10_000], id: \.self) { value in
                    Button("점 \(value.formatted())냥") {
                        session.changePointValue(value)
                        stakeSelectorOpen = false
                    }
                    .buttonStyle(MatgoStakeChoiceStyle(selected: value == session.pointValue))
                }
            }
            Text("이번 판과 저장 상태에 바로 반영됩니다.").font(.caption2.weight(.bold)).foregroundStyle(Color(red: 0.80, green: 0.94, blue: 1.0))
        }
        .foregroundStyle(.white)
        .padding(10)
        .frame(width: 330)
        .background(LinearGradient(colors: [Color(red: 0.15, green: 0.23, blue: 0.36), Color(red: 0.08, green: 0.16, blue: 0.25)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 0.50, green: 0.82, blue: 0.91), lineWidth: 3))
        .shadow(color: .black.opacity(0.5), radius: 12, y: 7)
        .zIndex(40)
    }

    private var stakeGradient: LinearGradient {
        switch session.pointValue {
        case 100: LinearGradient(colors: [Color(red: 1.0, green: 0.83, blue: 0.29), Color(red: 0.91, green: 0.60, blue: 0.05)], startPoint: .top, endPoint: .bottom)
        case 1_000: LinearGradient(colors: [Color(red: 0.35, green: 0.84, blue: 0.82), Color(red: 0.09, green: 0.55, blue: 0.61)], startPoint: .top, endPoint: .bottom)
        case 2_000: LinearGradient(colors: [Color(red: 0.42, green: 0.66, blue: 1.0), Color(red: 0.20, green: 0.37, blue: 0.78)], startPoint: .top, endPoint: .bottom)
        default: LinearGradient(colors: [Color(red: 1.0, green: 0.61, blue: 0.29), Color(red: 0.85, green: 0.31, blue: 0.13)], startPoint: .top, endPoint: .bottom)
        }
    }

    private var undoButton: some View {
        Button { session.undoLastHumanTurn() } label: {
            VStack(spacing: 2) {
                Text("마지막 수").font(.caption2.weight(.black))
                Text("무르기 \(session.remainingUndos)회").font(.callout.weight(.black))
                Text("다시 선택").font(.caption2.weight(.black))
            }
            .foregroundStyle(.white)
            .frame(width: 102, height: 70)
            .background(LinearGradient(colors: [Color(red: 1.0, green: 0.43, blue: 0.21), Color(red: 0.72, green: 0.11, blue: 0.08)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(HwatuTheme.gold, lineWidth: 3))
        }
        .buttonStyle(.plain)
        .disabled(!session.canUndo)
        .opacity(session.canUndo ? 1 : 0.72)
        .padding(.leading, 12)
    }

    private var opponentHand: some View {
        let count = session.hands[.computer]?.count ?? 0
        return ZStack(alignment: .bottomTrailing) {
            LazyHGrid(rows: [GridItem(.fixed(25), spacing: 2), GridItem(.fixed(25), spacing: 2)], spacing: 2) {
                ForEach(0..<count, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(LinearGradient(colors: [Color(red: 0.88, green: 0.06, blue: 0.10), Color(red: 0.52, green: 0.01, blue: 0.04)], startPoint: .topLeading, endPoint: .bottomTrailing))
                        .overlay(RoundedRectangle(cornerRadius: 1).stroke(HwatuTheme.gold.opacity(0.9), lineWidth: 1).padding(2))
                        .frame(width: 20, height: 25)
                }
            }
            .padding(.leading, 8)
            .padding(.trailing, 29)
            .padding(.vertical, 7)
            Text("\(count)")
                .font(.caption2.weight(.black))
                .foregroundStyle(Color(red: 0.18, green: 0.28, blue: 0))
                .frame(width: 22, height: 22)
                .background(Color(red: 0.96, green: 0.95, blue: 0.90), in: Circle())
                .padding(5)
        }
        .background(LinearGradient(colors: [Color(red: 0.19, green: 0.39, blue: 0.02), Color(red: 0.11, green: 0.27, blue: 0)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(red: 0.42, green: 0.60, blue: 0.11).opacity(0.84), lineWidth: 2))
        .shadow(color: Color(red: 0.09, green: 0.23, blue: 0).opacity(0.42), radius: 3.5, y: 3)
        .fixedSize()
    }

    private var opponentCaptured: some View {
        WebParityCapturedRack(
            cards: session.captured[.computer] ?? [],
            owner: .computer,
            gookjinAsPee: session.gookjinAsPee[.computer] == true
        )
    }

    private var floorArea: some View {
        HStack(spacing: 28) {
            ZStack {
                CardBackView()
                Text("\(session.drawPile.count)")
                    .font(.caption.weight(.black))
                    .foregroundStyle(.white)
                    .padding(6)
                    .background(Color.black.opacity(0.72), in: Circle())
                    .offset(x: 28, y: -41)
            }
            LazyVGrid(columns: Array(repeating: GridItem(.fixed(62), spacing: 8), count: 6), spacing: 8) {
                ForEach(session.floorCards) { HwatuCardView(card: $0) }
            }
            .frame(width: 412)
        }
    }

    private var humanCaptured: some View {
        WebParityCapturedRack(
            cards: session.captured[.human] ?? [],
            owner: .human,
            gookjinAsPee: session.gookjinAsPee[.human] == true,
            selectGookjin: openGookjinChoice
        )
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var humanDock: some View {
        HStack(spacing: 12) {
            HStack(spacing: 8) {
                ForEach(Array(session.humanHand.enumerated()), id: \.element.id) { index, card in
                    ZStack(alignment: .top) {
                        HwatuCardView(card: card, large: true, action: session.isHumanTurn ? { selectCard(card) } : nil)
                            .keyboardShortcut(KeyEquivalent(Character(index == 9 ? "0" : "\(index + 1)")), modifiers: [])
                        if session.isHumanTurn && (card.isBonus || session.floorCards.contains { $0.month == card.month }) {
                            Text(card.isBonus ? "★" : (session.bombOption(for: card) == nil ? "▼" : "💣"))
                                .font(.system(size: card.isBonus ? 31 : 25, weight: .black))
                                .foregroundStyle(card.isBonus ? HwatuTheme.gold : Color(red: 0.20, green: 0.69, blue: 1.0))
                                .shadow(color: .black.opacity(0.65), radius: 1, x: 2, y: 2)
                                .offset(y: -20)
                        }
                    }
                }
                ForEach(0..<(session.bombSkips[.human] ?? 0), id: \.self) { index in
                    Button { if index == 0 { session.playBombSkip() } } label: {
                        VStack { Image(systemName: "burst.fill"); Text(index == 0 ? "뒤집기" : "폭탄 보관").font(.caption2) }
                            .frame(width: 62, height: 94)
                            .foregroundStyle(HwatuTheme.gold)
                            .background(Color(red: 0.10, green: 0.23, blue: 0.07), in: RoundedRectangle(cornerRadius: 7))
                    }.buttonStyle(.plain).disabled(index != 0 || !session.isHumanTurn)
                }
            }
            .frame(maxWidth: .infinity)
            WebParityMatgoAutoPlayZone(
                autoPlay: $autoPlay,
                discardConfirmation: $discardConfirmation,
                autoPlayDisabled: autoPlayDisabled
            )
            .frame(height: 142)
            .padding(.trailing, 4)
        }
        .padding(6)
        .frame(minHeight: 150)
        .background(LinearGradient(colors: [Color(red: 0.24, green: 0.46, blue: 0.05), Color(red: 0.12, green: 0.30, blue: 0.01)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 11))
        .overlay(RoundedRectangle(cornerRadius: 11).stroke(Color(red: 0.20, green: 0.40, blue: 0.01), lineWidth: 2))
    }

    private func scoreBadge(player: PlayerID) -> some View {
        let count = session.shakeCounts[player] ?? 0
        return VStack(alignment: .trailing, spacing: 3) {
            HStack(alignment: .lastTextBaseline, spacing: 3) {
                Text("\(session.score(for: player).total)").font(.system(size: 34, weight: .black, design: .serif))
                Text("점").font(.callout.weight(.black))
            }
            if count > 0 { Text("🔔 \(max(0, count - (session.bombCounts[player] ?? 0)))  💣 \(session.bombCounts[player] ?? 0)").font(.caption2.weight(.black)) }
        }
        .foregroundStyle(HwatuTheme.gold)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(LinearGradient(colors: [Color(red: 0.19, green: 0.37, blue: 0.04), Color(red: 0.09, green: 0.23, blue: 0)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 11))
        .overlay(RoundedRectangle(cornerRadius: 11).stroke(Color(red: 0.45, green: 0.64, blue: 0.11), lineWidth: 3))
    }

    private var sideRail: some View {
        VStack(spacing: 8) {
            playerCard(name: PlayerID.computer.displayName, balance: opponentBalance, human: false, active: session.currentPlayer == .computer, first: session.startingPlayer == .computer)
            MatgoMissionPanel(session: session)
            Spacer(minLength: 2)
            difficultyPanel
            HStack(spacing: 6) {
                Button("새 판", action: newGame)
                Button(exitReserved ? "나가기 예약됨" : "나가기", action: openExit).disabled(exitReserved)
            }
            .buttonStyle(MatgoRailButtonStyle())
            HStack(spacing: 6) {
                Button { soundEnabled.toggle() } label: { Label(soundEnabled ? "효과음" : "음소거", systemImage: soundEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill") }
                Button { voiceEnabled.toggle() } label: { Label(voiceEnabled ? "음성" : "음성 끔", systemImage: "waveform") }
                Button { backgroundMusicEnabled.toggle() } label: { Label(backgroundMusicEnabled ? "배경음" : "배경음 끔", systemImage: "music.note") }
            }
            .buttonStyle(MatgoAudioButtonStyle(active: soundEnabled))
            HStack(spacing: 6) {
                Image(systemName: "speaker.fill").font(.caption2)
                Slider(value: $soundVolume, in: 0...1)
                Text("\(Int(soundVolume * 100))").font(.caption2.monospacedDigit())
            }
            .foregroundStyle(Color(red: 0.86, green: 0.97, blue: 1.0))
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(Color(red: 0.03, green: 0.27, blue: 0.43), in: RoundedRectangle(cornerRadius: 8))
            Spacer(minLength: 2)
            playerCard(name: displayName, balance: balance, human: true, active: session.currentPlayer == .human, first: session.startingPlayer == .human)
        }
        .padding(6)
        .background(LinearGradient(colors: [Color(red: 0.03, green: 0.22, blue: 0.37), Color(red: 0.05, green: 0.38, blue: 0.55), Color(red: 0.02, green: 0.18, blue: 0.32)], startPoint: .leading, endPoint: .trailing))
        .overlay(alignment: .leading) { Rectangle().fill(Color(red: 0.44, green: 0.82, blue: 0.95).opacity(0.68)).frame(width: 2) }
    }

    private func playerCard(name: String, balance: Int64, human: Bool, active: Bool, first: Bool) -> some View {
        HStack(spacing: 10) {
            playerPortrait(human: human)
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 5) {
                    Text(name).font(.headline.weight(.black)).lineLimit(1)
                    if first { Text("선").font(.caption2.weight(.black)).padding(4).background(HwatuTheme.gold, in: Circle()).foregroundStyle(Color.brown) }
                }
                Text("\(balance.koreanMoney)냥").font(.callout.weight(.black)).foregroundStyle(HwatuTheme.gold)
            }
        }
        .foregroundStyle(.white)
        .padding(9)
        .frame(maxWidth: .infinity, minHeight: 92, alignment: .leading)
        .background(LinearGradient(colors: [Color(red: 0.12, green: 0.53, blue: 0.69), Color(red: 0.04, green: 0.29, blue: 0.44)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(active ? HwatuTheme.gold : Color(red: 0.36, green: 0.74, blue: 0.87), lineWidth: active ? 3 : 2))
    }

    @ViewBuilder
    private func playerPortrait(human: Bool) -> some View {
        if human {
            Button(action: selectProfileImage) {
                AsyncImage(url: profileImageURL) { phase in
                    if case let .success(image) = phase { image.resizable().scaledToFill() }
                    else { Circle().fill(Color.orange).overlay(Text("🙂").font(.title2)) }
                }
                .frame(width: 58, height: 58).clipShape(Circle())
                .overlay { if profileImageUploading { ProgressView().controlSize(.small) } }
            }
            .buttonStyle(.plain)
            .disabled(profileImageUploading)
            .help("눌러서 프로필 사진 선택")
        } else {
            Circle().fill(Color(red: 0.84, green: 0.70, blue: 0.42)).overlay(Text("花").font(.title2)).frame(width: 58, height: 58)
        }
    }

    private var difficultyPanel: some View {
        WebParityCompactDifficultyButton(level: session.difficulty, disabled: session.isEnded) {
            let next = session.difficulty.nextWebDifficulty
            session.difficulty = next
            UserDefaults.standard.set(next.rawValue, forKey: "FamilyHwatu.aiDifficulty")
        }
    }
}

private struct MatgoRailButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.caption.weight(.black)).foregroundStyle(.white).frame(maxWidth: .infinity, minHeight: 42)
            .background(LinearGradient(colors: [Color(red: 0.25, green: 0.78, blue: 0.94), Color(red: 0.07, green: 0.52, blue: 0.77)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(Color(red: 0.75, green: 0.94, blue: 1.0), lineWidth: 2))
    }
}

private struct MatgoAudioButtonStyle: ButtonStyle {
    let active: Bool
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.caption2.weight(.black)).foregroundStyle(active ? HwatuTheme.gold : .white).frame(maxWidth: .infinity, minHeight: 38)
            .background(Color(red: 0.04, green: 0.43, blue: 0.65), in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(red: 0.51, green: 0.87, blue: 0.95), lineWidth: 2))
    }
}

private struct MatgoStakeChoiceStyle: ButtonStyle {
    let selected: Bool
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.caption2.weight(.black)).foregroundStyle(selected ? Color(red: 0.29, green: 0.18, blue: 0) : .white)
            .frame(maxWidth: .infinity, minHeight: 40)
            .background(selected ? Color(red: 1.0, green: 0.78, blue: 0.20) : Color(red: 0.20, green: 0.48, blue: 0.66), in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(selected ? HwatuTheme.gold : Color.white.opacity(0.25), lineWidth: 2))
    }
}
