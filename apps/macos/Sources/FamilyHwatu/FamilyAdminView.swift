import SwiftUI

struct FamilyAdminView: View {
    @EnvironmentObject private var appState: AppState
    @State private var users: [FamilyUser] = []
    @State private var username = ""
    @State private var displayName = ""
    @State private var password = ""
    @State private var notice = ""
    @State private var selectedUser: FamilyUser?
    @State private var newPassword = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HStack {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("관리자 전용").font(.callout.weight(.black)).foregroundStyle(HwatuTheme.red)
                        Text("가족 회원 관리").font(.system(size: 34, weight: .black, design: .serif))
                        Text("계정별 저장 판과 게임머니는 독립적으로 관리됩니다.").foregroundStyle(HwatuTheme.muted)
                    }
                    Spacer()
                    Button("홈으로") { appState.route = .home }.buttonStyle(SecondaryButtonStyle())
                }
                if let message = appState.errorMessage { ErrorBanner(message: message) }
                if !notice.isEmpty {
                    Label(notice, systemImage: "checkmark.circle.fill")
                        .foregroundStyle(Color(red: 0.08, green: 0.35, blue: 0.18))
                        .padding(10)
                        .background(Color(red: 0.85, green: 0.94, blue: 0.87), in: RoundedRectangle(cornerRadius: 9))
                }
                HStack(alignment: .top, spacing: 20) {
                    PaperPanel {
                        VStack(alignment: .leading, spacing: 13) {
                            Text("가족 계정 추가").font(.title2.bold())
                            TextField("아이디 (3자 이상)", text: $username)
                            TextField("화면에 보일 이름", text: $displayName)
                            SecureField("첫 비밀번호 (15자 이상)", text: $password)
                            Button("가족 계정 추가") { Task { await addUser() } }
                                .buttonStyle(PrimaryButtonStyle())
                                .disabled(username.count < 3 || displayName.isEmpty || password.count < 15)
                        }
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 300)
                    }
                    PaperPanel {
                        VStack(alignment: .leading, spacing: 13) {
                            Text("등록된 가족 \(users.count)").font(.title2.bold())
                            ForEach(users) { user in
                                MemberRow(user: user, isCurrent: user.id == appState.user?.id, changePassword: {
                                    selectedUser = user
                                }, toggle: { Task { await toggle(user) } })
                                if user.id != users.last?.id { Divider().overlay(HwatuTheme.ink.opacity(0.12)) }
                            }
                        }.frame(minWidth: 550)
                    }
                }
            }
            .padding(38)
        }
        .task { await refresh() }
        .sheet(item: $selectedUser) { user in
            VStack(alignment: .leading, spacing: 16) {
                Text("\(user.displayName) 님의 비밀번호 변경").font(.title2.bold())
                SecureField("새 비밀번호 (15자 이상)", text: $newPassword).textFieldStyle(.roundedBorder)
                HStack {
                    Button("취소") { selectedUser = nil; newPassword = "" }
                    Spacer()
                    Button("변경") { Task { await changePassword(user) } }
                        .keyboardShortcut(.defaultAction).disabled(newPassword.count < 15)
                }
            }.padding(26).frame(width: 430)
        }
    }

    private func refresh() async {
        do { users = try await appState.api.users() }
        catch { appState.errorMessage = error.localizedDescription }
    }

    private func addUser() async {
        let success = await appState.perform { _ = try await appState.api.createUser(username: username, displayName: displayName, password: password) }
        if success {
            username = ""; displayName = ""; password = ""; notice = "가족 계정을 만들었습니다."
            await refresh()
        }
    }

    private func toggle(_ user: FamilyUser) async {
        guard user.id != appState.user?.id else { return }
        if await appState.perform({ try await appState.api.toggleUser(id: user.id) }) { await refresh() }
    }

    private func changePassword(_ user: FamilyUser) async {
        if await appState.perform({ try await appState.api.changePassword(id: user.id, password: newPassword) }) {
            notice = "\(user.displayName) 님의 비밀번호를 변경했습니다."
            selectedUser = nil
            newPassword = ""
        }
    }
}

private struct MemberRow: View {
    let user: FamilyUser
    let isCurrent: Bool
    let changePassword: () -> Void
    let toggle: () -> Void
    var body: some View {
        HStack(spacing: 12) {
            Circle().fill(user.isActive ? HwatuTheme.deepGreen : Color.gray).overlay(Text(String(user.displayName.prefix(1))).font(.headline.bold()).foregroundStyle(.white)).frame(width: 42, height: 42)
            VStack(alignment: .leading, spacing: 2) {
                Text(user.displayName).font(.headline)
                Text("@\(user.username) · \(user.role == "admin" ? "관리자" : "가족")").font(.caption).foregroundStyle(HwatuTheme.muted)
                Text("\(user.virtualBalance.koreanMoney)냥").font(.caption2.weight(.bold)).foregroundStyle(HwatuTheme.red)
            }
            Spacer()
            Text(user.isActive ? "사용 중" : "중지").font(.caption.bold()).foregroundStyle(user.isActive ? Color.green : Color.orange)
            Button("비밀번호", action: changePassword).buttonStyle(.borderless).foregroundStyle(HwatuTheme.deepRed)
            Button(user.isActive ? "중지" : "사용", action: toggle).buttonStyle(.borderless).foregroundStyle(HwatuTheme.deepRed).disabled(isCurrent)
        }.opacity(user.isActive ? 1 : 0.6)
    }
}
