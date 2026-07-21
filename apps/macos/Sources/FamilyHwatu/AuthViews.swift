import SwiftUI

struct EntryView: View {
    @EnvironmentObject private var appState: AppState
    @State private var username = ""
    @State private var password = ""
    @State private var remember = true
    @State private var showLogin = true

    var body: some View {
        ZStack {
            HStack(spacing: 44) {
                VStack(alignment: .leading, spacing: 13) {
                    Text("가족 전용 맞고")
                        .font(.system(size: 12, weight: .black))
                        .tracking(2)
                        .foregroundStyle(HwatuTheme.red)
                    Text("편안하게 한 판 즐겨볼까요?")
                        .font(.system(size: 48, weight: .black, design: .serif))
                        .foregroundStyle(Color(red: 0.286, green: 0.157, blue: 0.090))
                    Text("가족마다 게임머니와 진행 중인 판이 따로 저장됩니다.\n내 계정으로 로그인해 이어서 즐겨보세요.")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Color(red: 0.396, green: 0.255, blue: 0.153))
                        .lineSpacing(5)
                    Button("로그인하고 입장하기") { showLogin = true }
                        .buttonStyle(EntryButtonStyle())
                        .padding(.top, 8)
                }
                Spacer(minLength: 10)
                VStack(spacing: -16) {
                    HStack(spacing: -22) {
                        CardBackGlyph(text: "花", rotation: -9)
                        CardBackGlyph(text: "農", rotation: 8)
                    }
                    Text("가족 맞고")
                        .font(.system(size: 19, weight: .black))
                        .foregroundStyle(Color(red: 1.0, green: 0.953, blue: 0.420))
                        .shadow(color: Color(red: 0.027, green: 0.318, blue: 0.498), radius: 0, y: 2)
                        .padding(.top, 10)
                }
            }
            .padding(52)
            .frame(maxWidth: 1120, minHeight: 410)
            .background(LinearGradient(colors: [Color(red: 0.949, green: 0.871, blue: 0.651), Color(red: 0.804, green: 0.659, blue: 0.369)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color(red: 0.502, green: 0.322, blue: 0.176), lineWidth: 3))
            .shadow(color: Color(red: 0.298, green: 0.180, blue: 0.086).opacity(0.30), radius: 18, y: 16)
            .padding(.horizontal, 16)
            .padding(.vertical, 30)
            if showLogin { loginLayer }
        }
    }

    private var loginLayer: some View {
        ZStack {
            Color(red: 0.008, green: 0.169, blue: 0.306).opacity(0.72).background(.ultraThinMaterial).ignoresSafeArea()
            VStack(spacing: 18) {
                HStack {
                    Spacer()
                    Button { showLogin = false } label: {
                        Text("×")
                            .font(.system(size: 29, weight: .regular))
                            .foregroundStyle(Color(red: 0.03, green: 0.34, blue: 0.55))
                            .frame(width: 46, height: 46)
                            .background(Color(red: 0.910, green: 0.976, blue: 1.0), in: Circle())
                            .overlay(Circle().stroke(Color(red: 0.475, green: 0.804, blue: 0.906), lineWidth: 2))
                    }.buttonStyle(.plain)
                }
                .frame(height: 20)
                Text("로그인")
                    .font(.system(size: 40, weight: .black, design: .serif))
                    .foregroundStyle(Color(red: 0.027, green: 0.357, blue: 0.569))
                HStack(alignment: .bottom, spacing: 14) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("아이디").font(.caption.weight(.black))
                        TextField("", text: $username)
                            .onSubmit(submit)
                    }
                    VStack(alignment: .leading, spacing: 6) {
                        Text("비밀번호").font(.caption.weight(.black))
                        SecureField("", text: $password)
                            .onSubmit(submit)
                    }
                }
                .textFieldStyle(WebLoginFieldStyle())
                if let message = appState.errorMessage { ErrorBanner(message: message) }
                HStack(spacing: 20) {
                    Toggle("이 기기에서 로그인 유지", isOn: $remember)
                        .toggleStyle(.checkbox)
                        .font(.callout.weight(.semibold))
                    Spacer()
                    Button("로그인하고 입장하기", action: submit)
                        .buttonStyle(DashboardPrimaryButtonStyle())
                        .frame(minWidth: 312, minHeight: 58)
                        .disabled(username.isEmpty || password.isEmpty)
                }
            }
            .foregroundStyle(Color(red: 0.08, green: 0.27, blue: 0.39))
            .padding(36)
            .frame(width: 720)
            .background(LinearGradient(colors: [Color(red: 0.973, green: 0.992, blue: 1.0), Color(red: 0.843, green: 0.949, blue: 0.984)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 24))
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color(red: 0.345, green: 0.824, blue: 0.961), lineWidth: 4))
            .shadow(color: HwatuTheme.navy.opacity(0.62), radius: 28, y: 15)
        }
    }

    private func submit() {
        Task { _ = await appState.login(username: username, password: password, remember: remember) }
    }
}

private struct CardBackGlyph: View {
    let text: String
    let rotation: Double
    var body: some View {
        RoundedRectangle(cornerRadius: 10)
            .fill(LinearGradient(colors: [Color(red: 0.88, green: 0.08, blue: 0.11), Color(red: 0.58, green: 0.02, blue: 0.05)], startPoint: .topLeading, endPoint: .bottomTrailing))
            .overlay(RoundedRectangle(cornerRadius: 7).stroke(Color(red: 1.0, green: 0.87, blue: 0.47), lineWidth: 3).padding(7))
            .overlay(Text(text).font(.system(size: 34, weight: .black, design: .serif)).foregroundStyle(HwatuTheme.gold))
            .frame(width: 112, height: 178)
            .rotationEffect(.degrees(rotation))
            .shadow(color: .black.opacity(0.35), radius: 10, y: 7)
    }
}

private struct EntryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .black))
            .foregroundStyle(.white)
            .padding(.horizontal, 30)
            .frame(minWidth: 230, minHeight: 62)
            .background(LinearGradient(stops: [.init(color: Color(red: 0.514, green: 0.839, blue: 0.161), location: 0), .init(color: Color(red: 0.514, green: 0.839, blue: 0.161), location: 0.52), .init(color: Color(red: 0.271, green: 0.584, blue: 0.024), location: 0.53)], startPoint: .top, endPoint: .bottom), in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(red: 0.749, green: 0.941, blue: 0.373), lineWidth: 3))
            .shadow(color: HwatuTheme.navy.opacity(0.38), radius: 5, y: 4)
            .opacity(configuration.isPressed ? 0.82 : 1)
    }
}

private struct WebLoginFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 12)
            .frame(height: 54)
            .background(.white, in: RoundedRectangle(cornerRadius: 11))
            .overlay(RoundedRectangle(cornerRadius: 11).stroke(Color(red: 0.608, green: 0.812, blue: 0.886), lineWidth: 2))
    }
}

struct BootstrapView: View {
    @EnvironmentObject private var appState: AppState
    @State private var token = ""
    @State private var username = ""
    @State private var displayName = ""
    @State private var password = ""
    @State private var confirmation = ""

    var body: some View {
        ScrollView {
            PaperPanel {
                VStack(alignment: .leading, spacing: 15) {
                    Text("가족 전용 첫 설정").foregroundStyle(HwatuTheme.red).font(.callout.bold())
                    Text("관리자 계정을 만들어 주세요").font(.system(size: 32, weight: .black, design: .serif))
                    Text("첫 계정은 서버에 설정한 32자 이상의 일회성 초기 설정 토큰이 있어야 만들 수 있습니다.")
                        .foregroundStyle(HwatuTheme.muted)
                    SecureField("초기 설정 토큰", text: $token)
                    TextField("아이디 (3자 이상)", text: $username)
                    TextField("화면에 보일 이름", text: $displayName)
                    SecureField("비밀번호 (15자 이상)", text: $password)
                    SecureField("비밀번호 확인", text: $confirmation)
                    if let message = appState.errorMessage { ErrorBanner(message: message) }
                    Button("관리자 계정 만들기") {
                        Task { _ = await appState.bootstrap(.init(setupToken: token, username: username, displayName: displayName, password: password, passwordConfirm: confirmation)) }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(token.count < 32 || username.count < 3 || displayName.isEmpty || password.count < 15 || password != confirmation)
                }
                .textFieldStyle(.roundedBorder)
                .frame(width: 470)
            }
            .padding(54)
        }
    }
}
