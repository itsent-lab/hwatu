import SwiftUI

struct WebParityMatchChoiceView: View {
    let pending: PendingMatch
    let select: (HwatuCard) -> Void
    let cancel: () -> Void
    @State private var bounce = false

    var body: some View {
        ZStack {
            HStack(spacing: 74) {
                ForEach(pending.candidates) { card in
                    VStack(spacing: 3) {
                        Text("▼").font(.system(size: 42, weight: .black)).foregroundStyle(Color(red: 0.19, green: 0.66, blue: 1))
                            .shadow(color: .white, radius: 2).offset(y: bounce ? -8 : 0)
                        HwatuCardView(card: card, selected: true, large: true) { select(card) }
                            .padding(7).background(Color(red: 0.14, green: 0.61, blue: 0.95), in: RoundedRectangle(cornerRadius: 10))
                            .shadow(color: Color(red: 0.20, green: 0.70, blue: 1).opacity(0.9), radius: 20)
                    }
                }
            }
            .offset(y: -34)
            HStack(spacing: 15) {
                if pending.stage == .drawn {
                    VStack(spacing: 3) {
                        HwatuCardView(card: pending.card, compact: true)
                        Text("뒤집은 패").font(.caption2.weight(.black)).foregroundStyle(.white)
                    }
                }
                VStack(spacing: 3) {
                    Text(pending.stage == .drawn ? "뒤집은 \(pending.card.month)월 패, 어느 패를 먹을까요?" : "\(pending.card.month)월, 어느 패를 먹을까요?")
                        .font(.system(size: 19, weight: .black)).foregroundStyle(Color(red: 1, green: 0.97, blue: 0.53))
                    Text("파란 화살표가 있는 바닥패를 누르세요").font(.caption.weight(.black)).foregroundStyle(.white)
                }
                if pending.stage == .played {
                    Button("다른 손패 고르기", action: cancel).buttonStyle(WebBlueSmallButtonStyle())
                }
            }
            .padding(.horizontal, 18).padding(.vertical, 13)
            .background(LinearGradient(colors: [Color(red: 0.09, green: 0.56, blue: 0.85), Color(red: 0.03, green: 0.38, blue: 0.68)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 19))
            .overlay(RoundedRectangle(cornerRadius: 19).stroke(Color(red: 0.85, green: 0.97, blue: 1), lineWidth: 4))
            .shadow(color: .black.opacity(0.38), radius: 18, y: 9).offset(y: 145)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.clear)
        .onAppear { withAnimation(.easeInOut(duration: 0.68).repeatForever(autoreverses: true)) { bounce = true } }
    }
}

struct WebParityShakeChoiceView: View {
    let option: NativeShakeOption
    let selectedCard: HwatuCard
    let shake: () -> Void
    let plain: () -> Void

    var body: some View {
        MatgoActionOverlay {
            VStack(spacing: 10) {
                actionHeading(kicker: "흔들기 기회!", title: "\(option.month)월 세 장을 흔들까요?")
                HStack(spacing: 9) { ForEach(option.handCards) { choiceCard($0, selected: $0.id == selectedCard.id) } }
                Text("흔들면 세 장을 공개하고 이번 판 점수가 ").font(.caption.weight(.bold))
                    + Text("2배").font(.caption.weight(.black)).foregroundColor(HwatuTheme.red)
                    + Text("가 됩니다.").font(.caption.weight(.bold))
                HStack(spacing: 12) {
                    WebActionButton(kicker: "배수 올리기", title: "흔들기!", detail: "세 장 공개 · 점수 ×2", color: .orange, action: shake)
                    WebActionButton(kicker: "그대로 진행", title: "그냥 내기", detail: "선택한 패만 냅니다", color: .green, action: plain)
                }
            }
        }
    }
}

struct WebParityBombChoiceView: View {
    let option: NativeBombOption
    let selectedCard: HwatuCard
    let bomb: () -> Void
    let plain: () -> Void

    var body: some View {
        MatgoActionOverlay {
            VStack(spacing: 8) {
                actionHeading(kicker: "폭탄 기회!", title: "\(option.month)월 \(option.kind.rawValue)을 쓸까요?")
                HStack(alignment: .top, spacing: 34) {
                    cardGroup(label: "내 패", cards: option.handCards, selectedID: selectedCard.id)
                    cardGroup(label: "바닥패", cards: option.floorCards, selectedID: nil)
                }
                Text(bombGuide).font(.caption.weight(.bold)).foregroundStyle(Color(red: 0.40, green: 0.44, blue: 0.22)).multilineTextAlignment(.center)
                HStack(spacing: 12) {
                    WebActionButton(kicker: "한꺼번에 먹기", title: "\(option.kind.rawValue)!", detail: "같은 월 패 모두 획득 · 점수 ×\(bombMultiplier)", color: .red, action: bomb)
                    WebActionButton(kicker: "그대로 진행", title: "그냥 내기", detail: "선택한 패 한 장만 냅니다", color: .green, action: plain)
                }
            }
        }
    }

    private var bombMultiplier: Int { option.kind == .fourCard ? 4 : 2 }
    private var bombGuide: String {
        (option.kind == .fourCard ? "같은 월 네 장을 공개하고 한꺼번에 내면 흔들기와 폭탄이 함께 적용됩니다." : "폭탄으로 내면 같은 월 패를 한꺼번에 먹습니다.")
            + " 이번 판 점수가 \(bombMultiplier)배가 됩니다."
    }
}

struct WebParityChongtongChoiceView: View {
    let chongtong: NativeChongtong
    let score: Int
    let continueGame: () -> Void
    let stop: () -> Void

    var body: some View {
        MatgoActionOverlay {
            VStack(spacing: 10) {
                Text("총통 선택").font(.caption.weight(.black)).tracking(1.5).foregroundStyle(Color(red: 0.42, green: 0.56, blue: 0.09))
                Text("총통!").font(.system(size: 58, weight: .black, design: .serif)).foregroundStyle(HwatuTheme.red).shadow(color: Color.yellow.opacity(0.6), radius: 2, y: 2)
                HStack(spacing: 8) {
                    ForEach(Array(chongtong.cards.enumerated()), id: \.element.id) { index, card in
                        HwatuCardView(card: card, compact: true).rotationEffect(.degrees(index.isMultiple(of: 2) ? -3 : 3)).offset(y: index.isMultiple(of: 2) ? 0 : -5)
                    }
                }
                Text("\(chongtong.month)월 네 장입니다. 바로 끝내거나 네 장을 공개하고 계속 칠 수 있습니다.")
                    .font(.caption.weight(.bold)).foregroundStyle(Color(red: 0.33, green: 0.39, blue: 0.18)).multilineTextAlignment(.center)
                HStack(spacing: 12) {
                    WebActionButton(kicker: "배수 올리고 계속", title: "4장 흔들기 후 폭탄", detail: "네 장 공개 · 흔들기 적용", color: .green, action: continueGame)
                    WebActionButton(kicker: "바로 승리", title: "\(score)점 승리", detail: "총통 점수로 판을 끝냅니다", color: .red, action: stop)
                }
            }
        }
    }
}

struct WebParityGookjinChoiceView: View {
    let currentAsPee: Bool
    let choose: (Bool) -> Void

    var body: some View {
        MatgoActionOverlay {
            VStack(spacing: 12) {
                Text("국진 선택").font(.caption.weight(.black)).tracking(1.5).foregroundStyle(Color(red: 0.42, green: 0.56, blue: 0.09))
                Text("어디에 사용할까요?").font(.system(size: 27, weight: .black, design: .serif)).foregroundStyle(Color(red: 0.20, green: 0.27, blue: 0.05))
                if let card = HwatuDeck.byID["m09-01"] {
                    VStack(spacing: 5) { HwatuCardView(card: card, large: true); Text("국진").font(.caption.weight(.black)).foregroundStyle(HwatuTheme.red) }
                }
                Text("점수 상황을 보고 열끗 또는 쌍피로 사용할 수 있습니다.")
                    .font(.caption.weight(.bold)).foregroundStyle(Color(red: 0.33, green: 0.39, blue: 0.18))
                HStack(spacing: 12) {
                    WebActionButton(kicker: "동물패로 계산", title: "열끗으로 사용", detail: "열끗 묶음으로 이동", color: .green, selected: !currentAsPee, minHeight: 105, action: { choose(false) })
                    WebActionButton(kicker: "피 2장으로 계산", title: "쌍피로 사용", detail: "피 묶음으로 이동", color: .red, selected: currentAsPee, minHeight: 105, action: { choose(true) })
                }
            }
        }
    }
}

struct WebParityGoStopChoiceView: View {
    @ObservedObject var session: GameSession
    let player: PlayerID
    let opponentBalance: Int64?
    let go: (() -> Void)?
    let stop: (() -> Void)?
    @State private var thinking = false

    var body: some View {
        VStack(spacing: 11) {
            HStack(spacing: 13) {
                Text(isHuman ? "승부 선택" : "상대 선택").font(.caption.weight(.black)).foregroundStyle(Color(red: 0.90, green: 1, blue: 0.71))
                    .padding(.horizontal, 10).padding(.vertical, 5).background(Color(red: 0.35, green: 0.61, blue: 0.05), in: Capsule())
                Text(isHuman ? "고를 하시겠습니까?" : "상대가 고 · 스톱을 결정 중입니다").font(.headline.weight(.black)).foregroundStyle(.white)
            }
            if let allInAmount {
                HStack { Text("상대가 올인입니다").font(.headline.weight(.black)).foregroundStyle(Color.yellow); Text("스톱 시 \(allInAmount.koreanMoney)냥 전액 획득").font(.caption.weight(.black)).foregroundStyle(.white) }
                    .padding(8).background(Color.red.opacity(0.72), in: RoundedRectangle(cornerRadius: 10))
            }
            HStack(spacing: 17) {
                WebActionButton(kicker: "한 판 더", title: "\(nextGoCount)고!", detail: "점수와 배수에 도전", color: .orange, disabled: !isHuman, action: { go?() })
                WebActionButton(kicker: "지금 끝내기", title: "스톱!", detail: "\(stopScore)점 · \(confirmedAmount.koreanMoney)냥 확정", color: .red, disabled: !isHuman, action: { stop?() })
            }.opacity(isHuman ? 1 : 0.55).saturation(isHuman ? 1 : 0.55)
            if isHuman {
                Text("◈  바닥패를 보며 천천히 결정하세요").font(.caption.weight(.black)).foregroundStyle(Color(red: 0.87, green: 1, blue: 0.63))
            } else {
                HStack(spacing: 5) {
                    ForEach(0..<3, id: \.self) { index in Circle().fill(Color.yellow).frame(width: 7, height: 7).offset(y: thinking ? -4 : 0).opacity(thinking ? 0.35 : 1).animation(.easeInOut(duration: 0.45).repeatForever(autoreverses: true).delay(Double(index) * 0.15), value: thinking) }
                    Text("고와 스톱을 생각하고 있습니다").font(.caption2.weight(.black)).foregroundStyle(Color(red: 0.90, green: 1, blue: 0.70))
                }
            }
        }
        .padding(.top, 49).padding(.horizontal, 18).padding(.bottom, 17).frame(width: 620)
        .background(LinearGradient(colors: [Color(red: 0.14, green: 0.36, blue: 0), Color(red: 0.09, green: 0.27, blue: 0)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color(red: 0.55, green: 0.80, blue: 0.18), lineWidth: 5))
        .shadow(color: .black.opacity(0.55), radius: 24, y: 14)
        .overlay(alignment: .top) { scoreMedal.offset(y: -55) }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top).padding(.top, 112)
        .onAppear { thinking = true }
    }

    private var isHuman: Bool { player == .human }
    private var nextGoCount: Int { (session.goCounts[player] ?? 0) + 1 }
    private var settlement: NativeSettlement {
        let losers = session.mode.players.filter { $0 != player }
        return NativeSpecialRules.settlement(
            winnerScore: session.score(for: player), loserScores: losers.map { session.score(for: $0) },
            goCount: session.goCounts[player] ?? 0, loserGoCounts: losers.map { session.goCounts[$0] ?? 0 },
            shakeCount: session.shakeCounts[player] ?? 0, mode: .matgo, pointValue: session.pointValue,
            missionMultiplier: session.missionMultiplier(for: player), roundMultiplier: session.roundMultiplier,
            loserPlayers: losers, loserCapturedCounts: losers.map { session.captured[$0]?.count ?? 0 }
        )
    }
    private var stopScore: Int { settlement.finalScore }
    private var allInAmount: Int64? {
        guard isHuman, let opponentBalance, opponentBalance > 0, settlement.displayAmount >= opponentBalance else { return nil }
        return opponentBalance
    }
    private var confirmedAmount: Int64 { allInAmount ?? settlement.displayAmount }
    private var scoreMedal: some View {
        ZStack {
            Circle().fill(RadialGradient(colors: [Color.yellow, Color.orange, Color(red: 0.68, green: 0.16, blue: 0)], center: .topLeading, startRadius: 5, endRadius: 70))
            Circle().stroke(Color(red: 1, green: 0.89, blue: 0.42), lineWidth: 5)
            VStack(spacing: -5) { Text(isHuman ? "현재" : "상대").font(.caption2.weight(.black)).foregroundStyle(Color(red: 0.43, green: 0.17, blue: 0)); HStack(alignment: .lastTextBaseline, spacing: 3) { Text("\(session.score(for: player).total)").font(.system(size: 46, weight: .black, design: .serif)); Text("점").font(.caption.weight(.black)) }.foregroundStyle(.white) }
        }.frame(width: 116, height: 96).shadow(color: .black.opacity(0.5), radius: 12, y: 8)
    }
}

private struct MatgoActionOverlay<Content: View>: View {
    @ViewBuilder let content: Content
    var body: some View {
        ZStack {
            Color(red: 0.09, green: 0.27, blue: 0).opacity(0.50).background(.ultraThinMaterial).ignoresSafeArea()
            content.padding(20).frame(width: 570)
                .background(LinearGradient(colors: [Color(red: 1, green: 0.98, blue: 0.86), Color(red: 0.92, green: 0.86, blue: 0.57)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 22))
                .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color(red: 1, green: 0.86, blue: 0.27), lineWidth: 5))
                .shadow(color: .black.opacity(0.55), radius: 28, y: 16)
        }
    }
}

private struct WebActionButton: View {
    enum ColorKind { case orange, red, green }
    let kicker: String
    let title: String
    let detail: String
    let color: ColorKind
    var disabled = false
    var selected = false
    var minHeight: Double = 90
    let action: () -> Void
    var body: some View {
        Button(action: action) { VStack(spacing: 3) { Text(kicker).font(.caption2.weight(.black)); Text(title).font(.system(size: 28, weight: .black)); Text(detail).font(.caption2.weight(.black)) }.frame(maxWidth: .infinity, minHeight: minHeight) }
            .buttonStyle(WebActionButtonStyle(color: color, selected: selected)).disabled(disabled)
    }
}

private struct WebActionButtonStyle: ButtonStyle {
    let color: WebActionButton.ColorKind
    let selected: Bool
    func makeBody(configuration: Configuration) -> some View {
        let colors: [Color] = switch color {
        case .orange: [Color(red: 1, green: 0.78, blue: 0.19), Color(red: 0.85, green: 0.48, blue: 0)]
        case .red: [Color(red: 0.94, green: 0.27, blue: 0.24), Color(red: 0.65, green: 0.06, blue: 0.09)]
        case .green: [Color(red: 0.40, green: 0.74, blue: 0.09), Color(red: 0.18, green: 0.46, blue: 0.02)]
        }
        configuration.label.foregroundStyle(.white).background(LinearGradient(colors: colors, startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 15))
            .overlay(RoundedRectangle(cornerRadius: 15).stroke(Color(red: 1, green: 0.94, blue: 0.61).opacity(0.86), lineWidth: 4))
            .overlay(RoundedRectangle(cornerRadius: 15).stroke(selected ? Color(red: 0.20, green: 0.68, blue: 0.94) : .clear, lineWidth: 5).padding(-2))
            .shadow(color: .black.opacity(0.34), radius: 5, y: 5).scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

private struct WebBlueSmallButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.caption.weight(.black)).foregroundStyle(.white).padding(10)
            .background(Color(red: 0.03, green: 0.26, blue: 0.49).opacity(0.72), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(.white.opacity(0.7), lineWidth: 2)).opacity(configuration.isPressed ? 0.75 : 1)
    }
}

@ViewBuilder
private func actionHeading(kicker: String, title: String) -> some View {
    Text(kicker).font(.caption.weight(.black)).tracking(1.5).foregroundStyle(HwatuTheme.red)
    Text(title).font(.system(size: 27, weight: .black, design: .serif)).foregroundStyle(Color(red: 0.20, green: 0.27, blue: 0.05))
}

private func choiceCard(_ card: HwatuCard, selected: Bool) -> some View {
    HwatuCardView(card: card, compact: true).padding(5)
        .background(selected ? Color(red: 0.27, green: 0.79, blue: 1) : .clear, in: RoundedRectangle(cornerRadius: 7))
        .offset(y: selected ? -7 : 0)
        .overlay(alignment: .bottom) { if selected { Text("선택한 패").font(.system(size: 9, weight: .black)).foregroundStyle(.white).padding(.horizontal, 7).padding(.vertical, 2).background(Color(red: 0.09, green: 0.55, blue: 0.79), in: Capsule()).offset(y: 7) } }
}

private func cardGroup(label: String, cards: [HwatuCard], selectedID: String?) -> some View {
    VStack(spacing: 5) { Text(label).font(.caption.weight(.black)).foregroundStyle(Color(red: 0.44, green: 0.29, blue: 0.05)); HStack(spacing: 7) { ForEach(cards) { choiceCard($0, selected: $0.id == selectedID) } } }
}
