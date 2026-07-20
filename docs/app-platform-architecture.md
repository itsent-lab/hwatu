# 웹·네이티브 앱 저장소 구조

## 기본 원칙

웹앱과 네이티브 앱은 서로 독립된 클라이언트입니다. Android, iOS·iPadOS, macOS와 Windows 앱은 현재 React 웹앱을 WebView로 감싸거나 웹 빌드 결과를 포함하지 않습니다. 각 앱은 운영체제의 네이티브 UI, 저장소, 네트워크, 접근성, 생명주기와 배포 체계를 사용합니다.

웹앱은 계속 지원하며 기존 React 게임의 동작과 배포 방식도 유지합니다.

## 디렉터리 구조

```text
FamilyHwatu/
├── apps/
│   ├── web/                # 기존 React 19 웹앱과 PWA
│   ├── android/            # Kotlin + Jetpack Compose 네이티브 앱
│   ├── ios/                # Swift + SwiftUI iPhone/iPad 범용 앱
│   ├── macos/              # Swift + SwiftUI/AppKit Mac 앱
│   └── windows/            # C# + WinUI Windows 앱
├── services/
│   └── api/                # ASP.NET Core API, 데이터 접근과 DB 스키마
├── shared/
│   └── contracts/          # 언어 중립 API·게임 규칙 계약과 테스트 벡터
├── docs/                   # 제품 목적, 규칙과 아키텍처 문서
├── deploy/                 # 서버 운영 설정
└── package.json            # 루트 개발 명령을 연결하는 워크스페이스 진입점
```

## 책임 경계

### 웹

`apps/web/`는 현재의 TypeScript 게임 엔진, React 화면, 브라우저 저장소, Web Audio, PWA 자산과 Vitest 테스트를 모두 소유합니다. 네이티브 앱을 위해 웹 코드에 플랫폼 조건문을 추가하지 않습니다.

웹 프로덕션 빌드는 `services/api/wwwroot/`에 생성되어 기존 ASP.NET Core 서버가 정적 파일로 제공합니다.

### Android

`apps/android/`는 Kotlin과 Jetpack Compose로 독립 구현합니다. Android 생명주기, Room 또는 DataStore, 네트워크 클라이언트, 접근성, 백 버튼과 Play 배포 설정을 이 앱에서 관리합니다.

### iPhone·iPad

`apps/ios/`는 Swift와 SwiftUI 기반의 범용 iOS 앱입니다. iPhone과 iPad는 하나의 Xcode 프로젝트에서 공통 도메인 로직을 사용하되 화면 크기와 입력 방식에 맞는 네이티브 레이아웃을 제공합니다.

### macOS

`apps/macos/`는 SwiftUI를 기본으로 하고 필요한 경우 AppKit을 사용하는 별도 Mac 앱입니다. iOS 프로젝트와 소스 파일을 직접 참조하지 않으며, Apple 플랫폼 사이의 실제 중복이 확인되면 별도 Swift Package 분리를 검토합니다.

### Windows

`apps/windows/`는 C#과 WinUI 기반의 별도 Windows 앱입니다. 솔루션, application identity, 설치 패키지와 코드 서명을 자체 관리합니다.

### 서버와 공통 계약

`services/api/`는 모든 클라이언트가 사용하는 서버입니다. 현재 웹의 쿠키·CSRF 인증은 그대로 유지합니다. 네이티브 앱 인증은 앱 프로젝트를 시작할 때 토큰 저장, 갱신, 폐기와 기기 보안을 포함한 별도 API 설계를 확정해야 하며 웹 쿠키를 그대로 재사용한다고 가정하지 않습니다.

서로 다른 언어 사이에는 구현 코드를 공유하지 않습니다. `shared/contracts/`에는 API 스키마, 오류 코드, 규칙 테스트 벡터와 저장 데이터 버전처럼 언어에 독립적인 계약만 둡니다. 현재 TypeScript 게임 엔진은 웹 구현이며 네이티브 앱의 직접 의존성이 아닙니다.

## 현재 루트 명령

저장소 루트에서 기존 명령을 계속 사용할 수 있습니다.

```bash
npm run dev
npm run dev:server
npm run typecheck
npm test
npm run build
dotnet build services/api/Hwatu.Server.csproj
```

루트 npm 명령은 `apps/web/` 워크스페이스로 전달됩니다. Android, iOS, macOS와 Windows의 공식 빌드 명령은 각 네이티브 프로젝트를 실제로 생성한 뒤 해당 디렉터리에 추가합니다.

## 네이티브 구현 시작 전 결정 사항

1. 각 스토어에서 사용할 영구 앱 식별자와 배포 계정을 확정합니다.
2. 네이티브 앱용 로그인·토큰·기기 등록 API와 안전한 자격 증명 저장 방식을 설계합니다.
3. `docs/game-rules.md`를 기반으로 플랫폼 공통 JSON 규칙 테스트 벡터를 정의합니다.
4. Android, Apple, Windows에서 각각 동일한 규칙 테스트를 통과하도록 도메인 계층을 구현합니다.
5. 플랫폼별 접근성, 오디오, 백그라운드 전환, 네트워크 복구와 데이터 마이그레이션을 실제 기기에서 검증합니다.

앱 식별자, 서명, 네이티브 의존성과 프로젝트 템플릿은 장기적인 배포 구조를 고정하므로 디렉터리 정리 단계에서 임의로 생성하지 않습니다.
