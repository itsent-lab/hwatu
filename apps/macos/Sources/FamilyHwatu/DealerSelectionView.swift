import SwiftUI

struct DealerSelectionView: View {
    let mode: GameMode
    @Binding var selectedPointValue: Int
    let start: (Bool, AIDifficulty) -> Void
    let exit: () -> Void
    @State private var difficulty: AIDifficulty = .normal
    @State private var pickedIndex: Int?
    @State private var revealedCard = HwatuDeck.cards[0]
    @State private var resultText = ""
    @State private var humanStarts = true

    private let pointValues = [100, 1_000, 2_000, 5_000, 10_000]
    private let pointLabels = ["가볍게", "신나게", "짜릿하게", "화끈하게", "큰 승부"]
    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(red: 0.02, green: 0.19, blue: 0.13), Color(red: 0.01, green: 0.08, blue: 0.07)], startPoint: .topLeading, endPoint: .bottomTrailing)
                .ignoresSafeArea()
            GeometryReader { geometry in
                let compactLayout = geometry.size.width < 1_040
                Group {
                    if compactLayout {
                        ScrollView {
                            VStack(spacing: 10) {
                                title(compact: true)
                                compactPointColumn
                                cardColumn(compactCards: geometry.size.width < 620, compactLayout: true)
                                    .frame(maxWidth: geometry.size.width < 620 ? 430 : 620)
                                compactDifficultyColumn
                            }
                            .frame(width: max(1, geometry.size.width - 28))
                        }
                    } else {
                        VStack(spacing: 23) {
                            title(compact: false)
                            HStack(alignment: .top, spacing: 18) {
                                pointColumn
                                cardColumn(compactCards: false, compactLayout: false)
                                difficultyColumn
                            }
                        }
                    }
                }
                .padding(.horizontal, compactLayout ? 8 : 22)
                .padding(.vertical, compactLayout ? 8 : 20)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background {
                    RoundedRectangle(cornerRadius: compactLayout ? 14 : 25)
                        .fill(LinearGradient(colors: [Color(red: 0.08, green: 0.24, blue: 0.35), Color(red: 0.03, green: 0.11, blue: 0.19)], startPoint: .topLeading, endPoint: .bottomTrailing))
                        .shadow(color: .black.opacity(0.58), radius: 20, y: 10)
                }
                .overlay(RoundedRectangle(cornerRadius: compactLayout ? 14 : 25).stroke(Color(red: 0.19, green: 0.42, blue: 0.55), lineWidth: compactLayout ? 2 : 4))
                .padding(.horizontal, compactLayout ? 4 : 20)
                .padding(.vertical, compactLayout ? 4 : 42)
            }
        }
        .onAppear {
            let saved = UserDefaults.standard.string(forKey: "FamilyHwatu.aiDifficulty")
            difficulty = AIDifficulty(rawValue: saved ?? "") ?? .normal
        }
    }

    private func title(compact: Bool) -> some View {
        VStack(spacing: compact ? 2 : 6) {
            Text("새 판 · 선 정하기").font(.caption.weight(.black)).foregroundStyle(Color(red: 0.80, green: 0.13, blue: 0.17))
            Text("바닥의 패를 고르세요")
                .font(.system(size: compact ? 30 : 49, weight: .black, design: .serif))
                .foregroundStyle(.white).minimumScaleFactor(0.65).lineLimit(1)
                .shadow(color: .black.opacity(0.55), radius: 0, y: 3)
            Text("한 장을 뒤집으면 선공과 후공이 정해집니다.")
                .font(.system(size: compact ? 12 : 17, weight: .black))
                .foregroundStyle(Color(red: 0.88, green: 0.94, blue: 0.94))
        }
    }

    private var pointColumn: some View {
        VStack(spacing: 10) {
            Text("점당 게임머니").font(.headline.weight(.black)).foregroundStyle(Color(red: 1.0, green: 0.91, blue: 0.83))
            ForEach(Array(pointValues.enumerated()), id: \.offset) { index, value in
                let selected = selectedPointValue == value
                Button {
                    guard pickedIndex == nil else { return }
                    selectedPointValue = value
                } label: {
                    VStack(spacing: 3) {
                        Text("점 \(Int64(value).koreanMoney)냥").font(.headline.weight(.black))
                        Text(pointLabels[index]).font(.caption.weight(.bold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 76)
                    .background {
                        RoundedRectangle(cornerRadius: 9)
                            .fill(pointGradient(index))
                            .shadow(color: .black.opacity(0.28), radius: 3, y: 3)
                    }
                    .overlay(RoundedRectangle(cornerRadius: 9).stroke(selected ? HwatuTheme.gold : Color.white.opacity(0.16), lineWidth: selected ? 4 : 1))
                    .overlay(alignment: .topTrailing) {
                        if selected { selectionBadge(compact: false) }
                    }
                    .opacity(selected ? 1 : 0.70)
                    .scaleEffect(selected ? 1 : 0.975)
                }
                .buttonStyle(.plain)
                .disabled(pickedIndex != nil)
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
        .padding(13)
        .frame(width: 276)
        .background(Color(red: 0.20, green: 0.10, blue: 0.22).opacity(0.92), in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(red: 0.71, green: 0.37, blue: 0.68), lineWidth: 3))
    }

    private var compactPointColumn: some View {
        VStack(spacing: 6) {
            Text("점당 게임머니").font(.subheadline.weight(.black)).foregroundStyle(Color(red: 1.0, green: 0.91, blue: 0.83))
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 5), count: 3), spacing: 5) {
                ForEach(Array(pointValues.enumerated()), id: \.offset) { index, value in
                    let selected = selectedPointValue == value
                    Button {
                        guard pickedIndex == nil else { return }
                        selectedPointValue = value
                    } label: {
                        VStack(spacing: 1) {
                            Text("점 \(Int64(value).koreanMoney)냥").font(.system(size: 12, weight: .black)).minimumScaleFactor(0.75)
                            Text(pointLabels[index]).font(.system(size: 9, weight: .bold))
                        }
                        .foregroundStyle(.white).frame(maxWidth: .infinity, minHeight: 50)
                        .background(pointGradient(index), in: RoundedRectangle(cornerRadius: 7))
                        .overlay(RoundedRectangle(cornerRadius: 7).stroke(selected ? HwatuTheme.gold : Color.white.opacity(0.16), lineWidth: selected ? 3 : 1))
                        .overlay(alignment: .topTrailing) {
                            if selected { selectionBadge(compact: true) }
                        }
                        .opacity(selected ? 1 : 0.70)
                    }
                    .buttonStyle(.plain).disabled(pickedIndex != nil)
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
        }
        .padding(7)
        .background(Color(red: 0.20, green: 0.10, blue: 0.22).opacity(0.92), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(red: 0.71, green: 0.37, blue: 0.68), lineWidth: 2))
    }

    private func cardColumn(compactCards: Bool, compactLayout: Bool) -> some View {
        VStack(spacing: 0) {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: compactLayout ? 5 : 9), count: 6), spacing: compactLayout ? 5 : 9) {
                ForEach(0..<12, id: \.self) { index in
                    Button { pick(index) } label: {
                        ZStack(alignment: .bottomTrailing) {
                            if pickedIndex == index { HwatuCardView(card: revealedCard, selected: true, dealer: !compactCards, dealerCompact: compactCards) }
                            else { CardBackView(dealer: !compactCards, dealerCompact: compactCards) }
                            Text("\(index + 1)")
                                .font(.caption2.weight(.black))
                                .foregroundStyle(.white)
                                .padding(4)
                                .background(Color.black.opacity(0.60), in: Circle())
                                .offset(x: 3, y: 3)
                        }
                    }
                    .buttonStyle(.plain)
                    .disabled(pickedIndex != nil)
                }
            }
            .padding(.top, compactLayout ? 18 : 24)
            .offset(y: compactLayout ? -10 : -18)
            Button("나가기", action: exit)
                .buttonStyle(ArcadeExitButtonStyle())
                .frame(width: 190)
                .padding(.top, compactLayout ? 16 : 38)
                .offset(y: compactLayout ? -8 : -16)
                .disabled(pickedIndex != nil)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity)
        .frame(minHeight: compactLayout ? (compactCards ? 290 : 390) : 474)
        .background(Color(red: 0.02, green: 0.20, blue: 0.27).opacity(0.92), in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(red: 0.29, green: 0.67, blue: 0.76), lineWidth: 3))
        .overlay(alignment: .top) {
            Text(pickedIndex == nil ? "낮장 · 높은 월이 선입니다" : resultText)
                .font(.system(size: 17, weight: .black))
                .foregroundStyle(HwatuTheme.gold)
                .padding(.horizontal, 8)
                .background(Color(red: 0.02, green: 0.20, blue: 0.27))
                .offset(y: -2)
        }
    }

    private var difficultyColumn: some View {
        WebParityDealerDifficultyPanel(selection: difficulty, disabled: pickedIndex != nil) { level in
            difficulty = level
            UserDefaults.standard.set(level.rawValue, forKey: "FamilyHwatu.aiDifficulty")
        }
    }

    private var compactDifficultyColumn: some View {
        VStack(spacing: 6) {
            Text("컴퓨터 난이도").font(.subheadline.weight(.black)).foregroundStyle(Color(red: 1.0, green: 0.90, blue: 0.77))
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 2), spacing: 6) {
                ForEach(AIDifficulty.allCases) { level in
                    WebParityDifficultyCard(level: level, selected: difficulty == level, disabled: pickedIndex != nil, select: {
                        difficulty = level
                        UserDefaults.standard.set(level.rawValue, forKey: "FamilyHwatu.aiDifficulty")
                    }, compact: true)
                }
            }
        }
        .padding(7)
        .background(Color(red: 0.32, green: 0.18, blue: 0.11).opacity(0.94), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(red: 0.92, green: 0.68, blue: 0.44).opacity(0.78), lineWidth: 2))
    }

    private func pick(_ index: Int) {
        guard pickedIndex == nil else { return }
        let standardCards = HwatuDeck.cards.filter { !$0.isBonus }
        revealedCard = standardCards.randomElement() ?? HwatuDeck.cards[0]
        let opponentCard = standardCards.filter { $0.id != revealedCard.id }.randomElement() ?? standardCards[1]
        humanStarts = revealedCard.month >= opponentCard.month
        resultText = humanStarts
            ? "선입니다! 나는 \(revealedCard.month)월, 상대는 \(opponentCard.month)월입니다."
            : "후공입니다. 나는 \(revealedCard.month)월, 상대는 \(opponentCard.month)월입니다."
        pickedIndex = index
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(NativeGameTiming.dealerRevealMilliseconds))
            start(humanStarts, difficulty)
        }
    }

    private func pointGradient(_ index: Int) -> LinearGradient {
        let colors: [[Color]] = [
            [Color(red: 0.28, green: 0.82, blue: 0.05), Color(red: 0.10, green: 0.48, blue: 0.02)],
            [Color(red: 0.26, green: 0.79, blue: 0.81), Color(red: 0.04, green: 0.39, blue: 0.57)],
            [Color(red: 0.25, green: 0.43, blue: 0.88), Color(red: 0.08, green: 0.20, blue: 0.60)],
            [Color(red: 0.99, green: 0.46, blue: 0.14), Color(red: 0.79, green: 0.15, blue: 0.05)],
            [Color(red: 0.83, green: 0.18, blue: 0.46), Color(red: 0.50, green: 0.06, blue: 0.29)]
        ]
        return LinearGradient(colors: colors[index], startPoint: .top, endPoint: .bottom)
    }

    @ViewBuilder
    private func selectionBadge(compact: Bool) -> some View {
        if compact {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 15, weight: .black))
                .foregroundStyle(HwatuTheme.gold)
                .padding(4)
                .accessibilityHidden(true)
        } else {
            Label("선택됨", systemImage: "checkmark")
                .font(.system(size: 10, weight: .black))
                .foregroundStyle(Color(red: 0.19, green: 0.12, blue: 0.05))
                .padding(.horizontal, 8)
                .frame(minHeight: 22)
                .background(HwatuTheme.gold, in: Capsule())
                .offset(x: -7, y: 6)
                .accessibilityHidden(true)
        }
    }

}

private struct ArcadeExitButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.black))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(LinearGradient(colors: [Color(red: 0.88, green: 0.13, blue: 0.18), Color(red: 0.55, green: 0.01, blue: 0.06)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(Color(red: 0.38, green: 0.01, blue: 0.05), lineWidth: 2))
            .shadow(color: .black.opacity(0.36), radius: 3, y: 4)
            .opacity(configuration.isPressed ? 0.8 : 1)
    }
}
