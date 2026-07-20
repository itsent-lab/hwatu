# 클라이언트 애플리케이션

각 디렉터리는 독립적으로 빌드되는 클라이언트 애플리케이션입니다. 웹 코드를 WebView로 감싸지 않으며 네이티브 앱은 각 운영체제의 UI, 저장소, 네트워크와 생명주기를 사용합니다.

| 디렉터리 | 대상 | 구현 |
| --- | --- | --- |
| `web/` | 브라우저와 PWA | React, TypeScript, Vite |
| `android/` | Android | Kotlin, Jetpack Compose 예정 |
| `ios/` | iPhone, iPad | Swift, SwiftUI 범용 앱 예정 |
| `macos/` | Mac | Swift, SwiftUI/AppKit 예정 |
| `windows/` | Windows | C#, WinUI 예정 |

플랫폼 사이에 화면 코드와 상태 저장 구현을 공유하지 않습니다. API 계약, 게임 규칙 명세와 공통 테스트 데이터처럼 언어에 독립적인 자료만 `shared/contracts/`를 통해 공유합니다.
