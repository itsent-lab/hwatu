import SwiftUI

enum LegalKind {
    case credits, privacy, license

    var title: String {
        switch self { case .credits: "만든 이와 자료 출처"; case .privacy: "개인정보 안내"; case .license: "오픈소스 라이선스" }
    }
}

struct LegalView: View {
    @EnvironmentObject private var appState: AppState
    let kind: LegalKind

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    Text(kind.title).font(.system(size: 34, weight: .black, design: .serif)).foregroundStyle(HwatuTheme.ink)
                    Spacer()
                    Button("홈으로") { appState.route = .home }.buttonStyle(SecondaryButtonStyle())
                }
                PaperPanel { content.frame(maxWidth: .infinity, alignment: .leading) }
            }
            .padding(42)
            .frame(maxWidth: 920)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch kind {
        case .credits:
            VStack(alignment: .leading, spacing: 14) {
                Text("가족 화투").font(.title2.bold())
                Text("가족이 편안하게 맞고와 고스톱을 즐길 수 있도록 만든 비상업적 가족용 게임입니다.")
                Text("화투패 자산").font(.headline).foregroundStyle(HwatuTheme.deepRed)
                Text("화투패 이미지는 저장소의 검증된 SVG 원본을 macOS 앱 리소스로 포함합니다. 세부 저작권과 출처는 앱과 함께 배포되는 ATTRIBUTION.txt 및 THIRD_PARTY_NOTICES.md를 따릅니다.")
                Text("게임머니는 현금이 아니며 환전할 수 없습니다.").font(.callout.bold())
            }
        case .privacy:
            VStack(alignment: .leading, spacing: 14) {
                Text("가족 계정과 게임 저장").font(.title2.bold())
                Text("로그인 계정, 표시 이름, 게임머니, 진행 중인 판과 경기 결과는 사용자가 지정한 가족 화투 서버에 저장됩니다.")
                Text("Mac 앱의 저장 정보").font(.headline).foregroundStyle(HwatuTheme.deepRed)
                Text("이 앱은 서버 주소와 서버가 발급한 로그인 쿠키를 Mac에 저장합니다. 비밀번호는 앱이 별도로 저장하지 않습니다.")
                Text("프로필 사진과 계정 관리는 로그인한 가족과 관리자에게만 제공됩니다.")
            }
        case .license:
            VStack(alignment: .leading, spacing: 14) {
                Text("FamilyHwatu").font(.title2.bold())
                Text("프로젝트 소스와 포함된 제3자 자료에는 각각의 라이선스가 적용됩니다.")
                ForEach(BundledLegalDocument.documents) { document in
                    DisclosureGroup(document.title) {
                        Text(document.text)
                            .font(.system(.caption, design: .monospaced))
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.top, 8)
                    }
                }
                Text("SwiftUI, Foundation과 AppKit은 Apple SDK의 일부이며 별도 번들 의존성을 추가하지 않습니다.")
            }
        }
    }
}

private struct BundledLegalDocument: Identifiable {
    let id: String
    let title: String
    let text: String

    static let documents: [BundledLegalDocument] = [
        load("LICENSE", title: "FamilyHwatu MIT 라이선스"),
        load("THIRD_PARTY_NOTICES", withExtension: "md", title: "제3자 자료 고지"),
        load("Apache-2.0", withExtension: "txt", subdirectory: "legal/licenses", title: "Apache License 2.0"),
        load("BigScience-OpenRAIL-M", withExtension: "txt", subdirectory: "legal/licenses", title: "BigScience OpenRAIL-M")
    ]

    private static func load(
        _ name: String,
        withExtension fileExtension: String? = nil,
        subdirectory: String = "legal",
        title: String
    ) -> BundledLegalDocument {
        let text = Bundle.module.url(forResource: name, withExtension: fileExtension, subdirectory: subdirectory)
            .flatMap { try? String(contentsOf: $0, encoding: .utf8) }
            ?? "라이선스 원문을 불러오지 못했습니다. 앱 리소스 검증이 필요합니다."
        return .init(id: name, title: title, text: text)
    }
}
