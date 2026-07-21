import SwiftUI

struct GostopBoardLayout: View {
    @ObservedObject var session: GameSession
    let displayName: String
    let balance: Int64
    let computerBalances: [PlayerID: Int64]
    @Binding var soundEnabled: Bool
    @Binding var voiceEnabled: Bool
    @Binding var backgroundMusicEnabled: Bool
    @Binding var soundVolume: Double
    @Binding var autoPlay: Bool
    let exitReserved: Bool
    let openExit: () -> Void
    let newGame: () -> Void
    let selectCard: (HwatuCard) -> Void

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                LinearGradient(colors: [Color(red: 0.22, green: 0.52, blue: 0.31), Color(red: 0.10, green: 0.31, blue: 0.22)], startPoint: .topLeading, endPoint: .bottomTrailing)
                Text("花")
                    .font(.system(size: 230, weight: .black, design: .serif))
                    .foregroundStyle(Color(red: 0.71, green: 0.80, blue: 0.43).opacity(0.13))
                    .rotationEffect(.degrees(-8))

                opponentSeat(player: .computerA, icon: "🐶")
                    .frame(width: 230)
                    .position(x: 141, y: 124)
                opponentSeat(player: .computerB, icon: "🐯")
                    .frame(width: 230)
                    .position(x: geometry.size.width - 141, y: 124)

                opponentCaptured(player: .computerA)
                    .frame(width: 307, height: 58)
                    .position(x: 421, y: 49)
                opponentCaptured(player: .computerB)
                    .frame(width: 307, height: 58)
                    .position(x: geometry.size.width - 421, y: 49)

                statusBanner
                    .frame(width: min(620, geometry.size.width - 600))
                    .position(x: geometry.size.width / 2, y: 115)

                floorArea
                    .frame(width: min(760, geometry.size.width - 500), height: 170)
                    .position(x: geometry.size.width / 2, y: 323)

                roomInfo
                    .frame(width: 190)
                    .position(x: 121, y: 364)
                rightControls
                    .frame(width: 78)
                    .position(x: geometry.size.width - 65, y: 345)

                humanSeat
                    .frame(width: 190, height: 228)
                    .position(x: 121, y: geometry.size.height - 135)
                bottomStatus
                    .frame(width: max(480, geometry.size.width - 348), height: 58)
                    .position(x: geometry.size.width / 2 + 56, y: geometry.size.height - 214)
                humanHand
                    .frame(width: max(480, geometry.size.width - 348), height: 155)
                    .position(x: geometry.size.width / 2 + 56, y: geometry.size.height - 96)
                autoPlayButton
                    .frame(width: 78, height: 228)
                    .position(x: geometry.size.width - 65, y: geometry.size.height - 121)
            }
            .overlay(RoundedRectangle(cornerRadius: 0).stroke(Color(red: 0.45, green: 0.64, blue: 0.28).opacity(0.65), lineWidth: 2))
        }
        .padding(.horizontal, 30)
        .background(Color(red: 0.04, green: 0.19, blue: 0.15))
    }

    private func opponentSeat(player: PlayerID, icon: String) -> some View {
        VStack(spacing: 8) {
            playerSummary(player: player, icon: icon, balance: computerBalances[player] ?? 500_000, active: session.currentPlayer == player)
            compactScore(player)
            HStack(spacing: -27) { ForEach(0..<(session.hands[player]?.count ?? 0), id: \.self) { _ in CardBackView(compact: true) } }
                .frame(maxWidth: .infinity, minHeight: 66, alignment: .leading)
        }
    }

    private func opponentCaptured(player: PlayerID) -> some View {
        VStack(spacing: 3) {
            Text("획득패").font(.caption2.weight(.black)).foregroundStyle(HwatuTheme.gold)
            if (session.captured[player] ?? []).isEmpty {
                Text("아직 없음").font(.system(size: 9, weight: .bold)).foregroundStyle(Color.white.opacity(0.65))
            } else {
                CapturedRack(cards: session.captured[player] ?? [], compact: true)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 0.06, green: 0.27, blue: 0.18).opacity(0.9), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(red: 0.69, green: 0.66, blue: 0.30), lineWidth: 2))
    }

    private var statusBanner: some View {
        VStack(spacing: 2) {
            Text(session.isHumanTurn ? "내 차례" : "\(session.currentPlayer.displayName) 차례").font(.headline.weight(.black)).foregroundStyle(HwatuTheme.gold)
            Text(session.lastAction).font(.caption2.weight(.bold)).foregroundStyle(.white).lineLimit(1)
        }
        .frame(maxWidth: .infinity, minHeight: 52)
        .background(Color(red: 0.05, green: 0.27, blue: 0.18).opacity(0.92), in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(red: 0.71, green: 0.69, blue: 0.30), lineWidth: 2))
    }

    private var floorArea: some View {
        HStack(spacing: 22) {
            ForEach(session.floorCards.prefix(3)) { HwatuCardView(card: $0, room: true) }
            ZStack {
                CardBackView()
                Text("\(session.drawPile.count)").font(.caption.weight(.black)).foregroundStyle(.white).padding(6).background(Color.black.opacity(0.65), in: Circle()).offset(x: 29, y: 43)
            }
            ForEach(session.floorCards.dropFirst(3)) { HwatuCardView(card: $0, room: true) }
        }
    }

    private var roomInfo: some View {
        VStack(alignment: .leading, spacing: 4) {
            VStack(alignment: .leading, spacing: 3) {
                Text("3인 고스톱").font(.headline.weight(.black))
                Text("점 \(session.pointValue.formatted())냥").font(.caption.weight(.black)).foregroundStyle(HwatuTheme.gold)
            }
            .padding(.horizontal, 12).frame(maxWidth: .infinity, minHeight: 62, alignment: .leading)
            .background(LinearGradient(colors: [Color(red: 0.06, green: 0.30, blue: 0.20).opacity(0.92), Color(red: 0.06, green: 0.30, blue: 0.20).opacity(0.08)], startPoint: .leading, endPoint: .trailing), in: RoundedRectangle(cornerRadius: 6))
            .overlay(alignment: .leading) { Rectangle().fill(HwatuTheme.gold.opacity(0.82)).frame(width: 3) }
            VStack(spacing: 4) {
                Text("난이도").font(.caption.weight(.black)).foregroundStyle(HwatuTheme.gold)
                HStack(spacing: 3) {
                    ForEach(AIDifficulty.allCases) { level in
                        Button(level.title) {
                            session.difficulty = level
                            UserDefaults.standard.set(level.rawValue, forKey: "FamilyHwatu.aiDifficulty")
                        }
                        .buttonStyle(GostopDifficultyStyle(selected: level == session.difficulty, level: level))
                    }
                }
            }
            .padding(.horizontal, 6)
            .padding(.vertical, 12)
            .background(Color(red: 0.07, green: 0.23, blue: 0.18).opacity(0.90), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(red: 0.87, green: 0.79, blue: 0.41).opacity(0.72), lineWidth: 2))
        }
    }

    private var rightControls: some View {
        VStack(spacing: 6) {
            VStack(spacing: 2) {
                Button {
                    soundEnabled.toggle()
                    voiceEnabled = soundEnabled
                } label: {
                    VStack(spacing: 0) {
                        Image(systemName: soundEnabled ? "speaker.wave.2.fill" : "speaker.slash.fill")
                        Text(soundEnabled ? "소리 켜짐" : "음소거")
                    }
                }
                VStack(spacing: 0) {
                    Text("음량 \(Int(soundVolume * 100))%").font(.system(size: 8, weight: .black))
                    CompactVolumeSlider(value: $soundVolume)
                }
                Button { backgroundMusicEnabled.toggle() } label: {
                    VStack(spacing: 0) {
                        Image(systemName: "music.note")
                        Text(backgroundMusicEnabled ? "배경음 켬" : "배경음 끔")
                    }
                }
            }
            .padding(3)
            .background(Color(red: 0.12, green: 0.24, blue: 0.20).opacity(0.92), in: RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(Color(red: 0.85, green: 0.74, blue: 0.40), lineWidth: 2))
            Button(exitReserved ? "예약됨" : "나가기", action: openExit).disabled(exitReserved)
            Button("새 판", action: newGame)
        }
        .buttonStyle(GostopControlStyle())
    }

    private var humanSeat: some View {
        VStack(spacing: 8) {
            playerSummary(player: .human, icon: "🙂", balance: balance, active: session.currentPlayer == .human, name: displayName)
            compactScore(.human).frame(maxHeight: .infinity)
        }
    }

    private var bottomStatus: some View {
        HStack(spacing: 8) {
            Text("내가 먹은 패").font(.caption.weight(.black)).foregroundStyle(HwatuTheme.gold)
            if (session.captured[.human] ?? []).isEmpty {
                Text("아직 획득한 패가 없습니다").font(.caption2.weight(.bold)).foregroundStyle(Color.white.opacity(0.65))
            } else {
                CapturedRack(cards: session.captured[.human] ?? [], compact: true, gookjinAsPee: session.gookjinAsPee[.human] == true, toggleGookjin: session.isEnded ? nil : { session.toggleGookjin(for: .human) })
            }
        }
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(Color(red: 0.04, green: 0.24, blue: 0.16).opacity(0.92), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(red: 0.66, green: 0.65, blue: 0.28), lineWidth: 2))
    }

    private var humanHand: some View {
        HStack(spacing: 36) {
            ForEach(Array(session.humanHand.enumerated()), id: \.element.id) { index, card in
                ZStack(alignment: .top) {
                    HwatuCardView(card: card, room: true, action: session.isHumanTurn ? { selectCard(card) } : nil)
                        .keyboardShortcut(KeyEquivalent(Character("\(index + 1)")), modifiers: [])
                    if session.isHumanTurn && (card.isBonus || session.floorCards.contains { $0.month == card.month }) {
                        Text(card.isBonus ? "★" : "▼")
                            .font(.system(size: 31, weight: .black))
                            .foregroundStyle(card.isBonus ? HwatuTheme.gold : Color(red: 0.34, green: 0.80, blue: 1.0))
                            .shadow(color: Color(red: 0.04, green: 0.24, blue: 0.34), radius: 0, x: 2, y: 2)
                            .offset(y: -20)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(red: 0.08, green: 0.30, blue: 0.20).opacity(0.85), in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(red: 0.65, green: 0.66, blue: 0.29), lineWidth: 3))
    }

    private var autoPlayButton: some View {
        NativeAutoPlayButton(active: $autoPlay, disabled: session.isEnded, compact: true)
    }

    private func playerSummary(player: PlayerID, icon: String, balance: Int64, active: Bool, name: String? = nil) -> some View {
        HStack(spacing: 9) {
            Text(icon).font(.title2)
            VStack(alignment: .leading, spacing: 2) {
                Text(name ?? player.displayName).font(.headline.weight(.black))
                Text("\(balance.koreanMoney)냥").font(.caption.weight(.black)).foregroundStyle(HwatuTheme.gold)
            }
        }
        .disabled(session.isEnded)
        .foregroundStyle(.white)
        .padding(.horizontal, 10)
        .frame(maxWidth: .infinity, minHeight: player == .human ? 66 : 62, alignment: .leading)
        .background(Color(red: 0.07, green: 0.26, blue: 0.19).opacity(0.94), in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(active ? HwatuTheme.gold : Color(red: 0.68, green: 0.64, blue: 0.28), lineWidth: active ? 4 : 3))
    }

    private func compactScore(_ player: PlayerID) -> some View {
        let score = session.score(for: player)
        return VStack(alignment: .leading, spacing: 3) {
            Text("\(score.total)점").font(.title2.weight(.black)).foregroundStyle(HwatuTheme.gold).contentTransition(.numericText())
            Text("광 \(score.brightCount) · 열끗 \(score.animalCount) · 띠 \(score.ribbonCount) · 피 \(score.junkCount)")
                .font(.caption2.weight(.black)).foregroundStyle(.white)
        }
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity, minHeight: 64, maxHeight: player == .human ? .infinity : nil, alignment: .leading)
        .background(Color(red: 0.04, green: 0.27, blue: 0.18).opacity(0.92), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(red: 0.68, green: 0.65, blue: 0.28), lineWidth: 2))
    }
}

private struct GostopDifficultyStyle: ButtonStyle {
    let selected: Bool
    let level: AIDifficulty
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 9, weight: .black)).foregroundStyle(.white).frame(maxWidth: .infinity, minHeight: 34)
            .background(color, in: RoundedRectangle(cornerRadius: 7))
            .overlay(RoundedRectangle(cornerRadius: 7).stroke(selected ? HwatuTheme.gold : Color.black.opacity(0.35), lineWidth: selected ? 3 : 1))
    }
    private var color: Color { switch level { case .easy: .green; case .normal: .cyan; case .hard: .orange; case .expert: .purple } }
}

private struct GostopControlStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 10, weight: .black)).foregroundStyle(.white).frame(maxWidth: .infinity, minHeight: 39)
            .background(Color(red: 0.10, green: 0.32, blue: 0.24), in: RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(HwatuTheme.gold, lineWidth: 2))
    }
}

private struct CompactVolumeSlider: View {
    @Binding var value: Double

    var body: some View {
        GeometryReader { geometry in
            let fraction = min(1, max(0, value))
            ZStack(alignment: .leading) {
                Capsule().fill(Color(red: 0.12, green: 0.24, blue: 0.20)).frame(height: 8)
                Capsule().fill(HwatuTheme.gold).frame(width: max(8, geometry.size.width * fraction), height: 8)
                Circle()
                    .fill(Color(red: 1.0, green: 0.88, blue: 0.20))
                    .overlay(Circle().stroke(Color(red: 0.42, green: 0.31, blue: 0.04), lineWidth: 1))
                    .frame(width: 13, height: 13)
                    .offset(x: max(0, min(geometry.size.width - 13, geometry.size.width * fraction - 6.5)))
            }
            .frame(maxHeight: .infinity)
            .contentShape(Rectangle())
            .gesture(DragGesture(minimumDistance: 0).onChanged { gesture in
                value = min(1, max(0, gesture.location.x / max(1, geometry.size.width)))
            })
        }
        .frame(height: 16)
        .accessibilityLabel("게임 음량")
        .accessibilityValue("\(Int(value * 100))퍼센트")
    }
}
