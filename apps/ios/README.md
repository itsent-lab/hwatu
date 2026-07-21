# iOS·iPadOS 앱

iPhone과 iPad에서 실행되는 범용 네이티브 앱 디렉터리입니다. Swift와 SwiftUI로 100% 네이티브 구현하며 하나의 Xcode 프로젝트에서 두 기기 계열을 지원합니다.

`WKWebView`·`UIWebView`, 내장 브라우저, 로컬 HTML·JavaScript 번들 또는 웹 URL로 앱 화면을 구현하는 것은 절대 금지합니다. UI/UX는 웹 기준과 동일하게 SwiftUI로 다시 구현하고, 웹의 음성·음향·효과 파일은 바이트가 동일한 원본을 사용합니다.

이 디렉터리는 bundle ID, SwiftUI 화면, iOS 저장소·네트워크 구현, 기기별 레이아웃, 권한, 리소스, 서명과 App Store 배포 설정을 소유합니다.

현재는 디렉터리 책임만 확정했으며 Xcode 프로젝트와 앱 식별자는 아직 생성하지 않았습니다.
