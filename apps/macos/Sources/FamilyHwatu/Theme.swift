import SwiftUI

enum HwatuTheme {
    static let red = Color(red: 0.725, green: 0.196, blue: 0.169)
    static let deepRed = Color(red: 0.486, green: 0.090, blue: 0.098)
    static let gold = Color(red: 0.851, green: 0.647, blue: 0.212)
    static let ink = Color(red: 0.125, green: 0.090, blue: 0.075)
    static let paper = Color(red: 1.0, green: 0.980, blue: 0.941)
    static let green = Color(red: 0.082, green: 0.239, blue: 0.169)
    static let deepGreen = Color(red: 0.082, green: 0.239, blue: 0.169)
    static let blue = Color(red: 0.04, green: 0.46, blue: 0.70)
    static let navy = Color(red: 0.025, green: 0.13, blue: 0.22)
    static let cream = Color(red: 1.0, green: 0.96, blue: 0.82)
    static let muted = Color(red: 0.42, green: 0.30, blue: 0.20)
}

struct FeltBackground: View {
    var game = false

    var body: some View {
        ZStack {
            if game {
                LinearGradient(
                    colors: [Color(red: 0.04, green: 0.25, blue: 0.17), Color(red: 0.02, green: 0.10, blue: 0.08)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            } else {
                LinearGradient(
                    stops: [
                        .init(color: Color(red: 0.851, green: 0.780, blue: 0.604), location: 0),
                        .init(color: Color(red: 0.937, green: 0.882, blue: 0.722), location: 0.48),
                        .init(color: Color(red: 0.725, green: 0.561, blue: 0.341), location: 0.49),
                        .init(color: Color(red: 0.859, green: 0.765, blue: 0.549), location: 1)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                Ellipse()
                    .fill(Color(red: 0.30, green: 0.37, blue: 0.18).opacity(0.16))
                    .frame(width: 1600, height: 310)
                    .offset(x: 120, y: -40)
                Ellipse()
                    .fill(Color(red: 0.57, green: 0.26, blue: 0.16).opacity(0.14))
                    .frame(width: 1600, height: 280)
                    .offset(x: -100, y: 430)
                RadialGradient(
                    colors: [Color(red: 1.0, green: 0.965, blue: 0.773).opacity(0.72), .clear],
                    center: .top,
                    startRadius: 30,
                    endRadius: 620
                )
            }
        }
        .ignoresSafeArea()
    }
}

struct PlainBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.98, green: 0.96, blue: 0.91), Color(red: 0.93, green: 0.90, blue: 0.84)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            RadialGradient(
                colors: [Color(red: 0.85, green: 0.65, blue: 0.21).opacity(0.16), .clear],
                center: .topLeading,
                startRadius: 20,
                endRadius: 520
            )
        }
        .ignoresSafeArea()
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .black))
            .foregroundStyle(.white)
            .padding(.horizontal, 20)
            .frame(minHeight: 48)
            .background(LinearGradient(colors: [HwatuTheme.red, HwatuTheme.deepRed], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 12))
            .shadow(color: HwatuTheme.deepRed.opacity(0.20), radius: 10, y: 9)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .black))
            .foregroundStyle(HwatuTheme.deepRed)
            .padding(.horizontal, 18)
            .frame(minHeight: 48)
            .background(Color.clear, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(HwatuTheme.deepRed.opacity(0.22), lineWidth: 1))
            .opacity(configuration.isPressed ? 0.82 : 1)
    }
}

struct DashboardPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .black))
            .foregroundStyle(.white)
            .padding(.horizontal, 20)
            .frame(minHeight: 48)
            .background(
                LinearGradient(
                    stops: [
                        .init(color: Color(red: 0.294, green: 0.788, blue: 0.945), location: 0),
                        .init(color: Color(red: 0.114, green: 0.604, blue: 0.820), location: 0.53),
                        .init(color: Color(red: 0.031, green: 0.447, blue: 0.682), location: 0.54),
                        .init(color: Color(red: 0.047, green: 0.518, blue: 0.761), location: 1)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                ),
                in: RoundedRectangle(cornerRadius: 13)
            )
            .overlay(RoundedRectangle(cornerRadius: 13).stroke(Color(red: 0.027, green: 0.357, blue: 0.569), lineWidth: 3))
            .shadow(color: Color(red: 0.008, green: 0.216, blue: 0.380).opacity(0.46), radius: 5, y: 5)
            .opacity(configuration.isPressed ? 0.82 : 1)
    }
}

struct DashboardSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .black))
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .frame(minHeight: 50)
            .background(LinearGradient(colors: [Color(red: 0.553, green: 0.663, blue: 0.298), Color(red: 0.314, green: 0.435, blue: 0.184)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 13))
            .overlay(RoundedRectangle(cornerRadius: 13).stroke(Color(red: 0.361, green: 0.455, blue: 0.184), lineWidth: 3))
            .shadow(color: Color(red: 0.216, green: 0.306, blue: 0.133).opacity(0.42), radius: 5, y: 5)
            .opacity(configuration.isPressed ? 0.82 : 1)
    }
}

struct Panel<Content: View>: View {
    let fillWidth: Bool
    @ViewBuilder let content: Content

    init(fillWidth: Bool = false, @ViewBuilder content: () -> Content) {
        self.fillWidth = fillWidth
        self.content = content()
    }

    var body: some View {
        content
            .padding(26)
            .frame(maxWidth: fillWidth ? .infinity : nil)
            .foregroundStyle(HwatuTheme.ink)
            .background(
                RadialGradient(
                    colors: [Color(red: 1.0, green: 0.95, blue: 0.74), Color(red: 0.80, green: 0.63, blue: 0.34)],
                    center: .topLeading,
                    startRadius: 10,
                    endRadius: 720
                ),
                in: RoundedRectangle(cornerRadius: 22)
            )
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color(red: 0.43, green: 0.26, blue: 0.13), lineWidth: 3))
            .overlay(RoundedRectangle(cornerRadius: 19).stroke(Color.white.opacity(0.45), lineWidth: 1).padding(5))
            .shadow(color: Color(red: 0.28, green: 0.16, blue: 0.08).opacity(0.36), radius: 14, y: 9)
    }
}

struct PaperPanel<Content: View>: View {
    @ViewBuilder let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(28)
            .foregroundStyle(HwatuTheme.ink)
            .background(Color(red: 1.0, green: 0.98, blue: 0.94).opacity(0.94), in: RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(HwatuTheme.ink.opacity(0.12)))
            .shadow(color: Color(red: 0.29, green: 0.18, blue: 0.11).opacity(0.10), radius: 18, y: 9)
    }
}

struct ErrorBanner: View {
    let message: String

    var body: some View {
        Label(message, systemImage: "exclamationmark.triangle.fill")
            .font(.callout.weight(.bold))
            .foregroundStyle(Color(red: 0.49, green: 0.07, blue: 0.08))
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(red: 0.98, green: 0.84, blue: 0.82), in: RoundedRectangle(cornerRadius: 10))
    }
}

struct MoneyBadge: View {
    let title: String
    let value: Int64

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption.weight(.black)).foregroundStyle(Color(red: 0.88, green: 0.91, blue: 0.76))
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value.koreanMoney)
                    .font(.system(size: 29, weight: .black, design: .serif))
                    .foregroundStyle(HwatuTheme.gold)
                Text("냥").font(.caption.weight(.black)).foregroundStyle(Color(red: 1.0, green: 0.94, blue: 0.56))
            }
        }
        .padding(.horizontal, 15)
        .padding(.vertical, 11)
        .background {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(red: 0.12, green: 0.20, blue: 0.11))
                .shadow(color: .black.opacity(0.28), radius: 5, y: 4)
        }
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(red: 0.83, green: 0.66, blue: 0.20), lineWidth: 2))
    }
}
