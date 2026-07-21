# macOS 앱

SwiftUI와 AppKit으로 구현한 Mac 전용 네이티브 가족 화투 앱입니다. WebView나 웹 빌드 결과를 포함하지 않으며 인증, 화면, 게임 엔진, 로컬 설정과 서버 통신을 Swift로 구현합니다.

현재 버전은 전체 제품 윤곽과 핵심 게임 흐름을 검증하기 위한 **초기 개발 버전 0.1.0**입니다. 자동 테스트를 통과한 기능만 포함하지만, 웹과의 상태별 픽셀 비교·접근성 수동 점검·배포 서명과 공증이 남아 있으므로 정식 출시 버전으로 보지 않습니다.

`WKWebView`, WebKit 화면, 내장 브라우저, 로컬 HTML·JavaScript 번들 또는 웹 URL로 앱 화면을 구현하는 것은 절대 금지합니다. UI/UX는 웹 기준과 동일하게 네이티브로 다시 구현하고, 웹의 음성·음향·효과 파일은 바이트가 동일한 원본을 사용합니다. 일부 화면 구현만으로 100% 완료 처리하지 않으며 전체 화면·상태·오디오·규칙의 비교 검증이 끝나야 완료로 판정합니다.

## 포함된 화면과 기능

- 서버 상태 확인, 첫 관리자 설정, 로그인과 로그아웃
- 게임 모드 홈, 맞고·고스톱 점당 방 선택, 게임머니 리필
- 48장 화투패와 맞고 보너스패 2장·고스톱 보너스패 3장, 패 나누기, 패 맞추기, 획득 점수, 고·스톱, AI 차례
- 쪽·따닥·싹쓸이·뻑·자뻑·폭탄·핵폭탄·총통·국진·허당·나가리 이월과 웹 순서의 점수/박/독박 정산
- 맞고 v3 상태의 사용자별 원자적 로컬 저장·서버 병합·동기화 대기와 고스톱 정확한 3인 점수 증감 정산, 실패 정산 보관·재시도 및 서버 응답 후 게임머니 확정
- 웹과 같은 선 정하기·게임 시작·낼 패 확인·손패 힌트, `↻/Ⅱ` 자동치기 버튼과 맞고 1.2초·고스톱 1.3초 자동 선택 간격
- 맞고 AI의 난이도별 생각 시간·상단 진행 막대·자동치기 중 표시 생략, 맞고 2.2초 결과 공개 지연과 웹 형식의 점수·배수·박·게임머니 정산 카드
- 맞고의 20장 패 분배, 손패→바닥·더미→바닥 곡선 이동, 짝·족보·미션·고·스톱·폭탄·뻑·쪽·따닥·싹쓸이·쌍피/쓰리피 선언별 색상·입자·충격파·지속시간과 후속 선언 순서
- 맞고의 바닥패 양자택일, 흔들기·폭탄·총통·국진·고/스톱 선택판을 웹의 문구·카드 강조·확정 금액·올인 조건에 맞춘 네이티브 액션으로 제공
- 관리자 가족 계정 추가, 사용 상태와 비밀번호 변경
- 서버 주소 설정, 개인정보·출처·라이선스 안내

서버는 기존 ASP.NET Core API를 사용합니다. 앱 시작 시 `/api/client/status`에서 API 버전과 macOS 클라이언트 호환성을 확인한 뒤 기존 세션을 복원하며, 401일 때만 최초 설정 상태를 확인합니다. 모든 요청에 `X-Hwatu-Client`와 `X-Hwatu-Client-Version` 헤더를 보냅니다. 인증 쿠키는 앱 전용 Keychain 항목에 저장하고 이 기기 밖으로 이전되지 않도록 구성하며, 변경 요청에는 `/api/auth/csrf`에서 받은 토큰을 함께 보냅니다.

기본 서버 주소는 비어 있으며 개발 빌드의 새 설치에서는 서버 설정 화면이 먼저 열립니다. 사용자가 입력한 주소는 해당 Mac의 사용자 설정에만 저장됩니다. `localhost`, `*.localhost`, `127.0.0.1`, `::1`은 개발을 위해 HTTP를 허용하지만 그 외 주소는 HTTPS만 허용합니다.

게임 진행 데이터는 `Application Support/FamilyHwatu/State/user-<id>/` 아래 사용자별 원자적 JSON 레코드로 저장합니다. 맞고는 서버 전송 전에 `pendingSync=true`로 저장하고 같은 판의 턴·수정 시각 또는 다른 판의 생성 시각을 기준으로 서버 상태와 병합합니다. 고스톱 미정산 큐는 UUID 중복을 제거하며 20건 도달 시 기존 정산을 삭제하지 않고 새 저장을 차단해 데이터 유실을 알립니다.

API 연결만 로컬에서 확인할 때는 데이터베이스 스키마 초기화를 끌 수 있습니다. 이 설정에서는 호환성 API만 확인하고 로그인·게임 API는 사용하지 마세요.

```bash
Database__InitializeOnStartup=false dotnet run --project ../../services/api/Hwatu.Server.csproj
curl -H 'X-Hwatu-Client: macos-native' -H 'X-Hwatu-Client-Version: 1' http://127.0.0.1:5233/api/client/status
```

## 개발 및 테스트

Xcode 16 이상과 macOS 14 SDK 이상이 필요합니다.

```bash
cd apps/macos
swift test
swift run FamilyHwatu
```

`swift test`는 `shared/contracts/game-rule-vectors-v1.json`의 모든 규칙 벡터, 저장 마이그레이션·손상 격리·사용자 분리, 고스톱 큐 한도, 오디오 사건·지연, Keychain 쿠키 저장소 대체 구현과 기준 화면 렌더링을 검증합니다. 실행 환경이 SwiftPM의 중첩 샌드박스를 제한하면 `swift test --disable-sandbox`를 사용합니다.

## `.app` 번들 빌드

```bash
cd apps/macos
./scripts/build-app.sh
open build/FamilyHwatu.app
```

스크립트는 먼저 검증 JSON의 바이트 크기와 SHA-1/SHA-256을 확인합니다. 이어서 웹 앱이 사용하는 화투패 SVG 원본 48장과 효과음·음성·배경음 파일을 원본 이름과 바이트를 유지한 채 macOS 리소스로 동기화하고, MIT·제3자 라이선스 원문도 앱 번들에 포함합니다. 그 뒤 릴리스 빌드와 서명을 거쳐 `build/FamilyHwatu.app`을 만듭니다. 자산 검증에는 `jq`가 필요합니다. UI/UX와 효과의 상세 완료 기준은 [`docs/app-platform-architecture.md`](../../docs/app-platform-architecture.md)의 확인표를 따릅니다.

기본 번들 식별자는 `kr.co.nsrnb.familyhwatu.macos`이며 배포 계정의 영구 식별자가 확정되면 다음처럼 덮어쓸 수 있습니다.

```bash
FAMILY_HWATU_BUNDLE_ID=com.example.FamilyHwatu ./scripts/build-app.sh
```

빌드는 서버 주소를 기본으로 포함하지 않습니다. 관리형 배포처럼 명시적으로 사전 설정이 필요한 경우에만 환경변수로 전달할 수 있으며, 전달된 값은 생성된 앱의 `Info.plist`에만 기록됩니다.

```bash
FAMILY_HWATU_API_URL=https://example.com ./scripts/build-app.sh
```

관리형 배포 빌드는 `FAMILY_HWATU_DISTRIBUTION=1`을 지정합니다. 이때 명시적인 HTTPS 서버 주소가 없으면 빌드가 실패하고 앱의 서버 설정 메뉴는 제거됩니다. 정식 인증서가 준비되면 서명 ID를 함께 전달할 수 있으며 hardened runtime과 타임스탬프가 적용됩니다.

```bash
FAMILY_HWATU_DISTRIBUTION=1 \
FAMILY_HWATU_API_URL=https://example.com \
FAMILY_HWATU_SIGN_IDENTITY="Developer ID Application: Example" \
./scripts/build-app.sh
```

## 현재 검증 상태

마지막 코드·단위 테스트 검증일은 2026-07-21입니다. 공통 규칙 계약, 원자적 로컬 저장, 쿠키 격리, 오디오 기본값·사건 지연, 자산 해시와 라이선스 번들은 자동 검증합니다.

다음 항목은 배포 전 별도 완료가 필요하므로 아직 `100% 완료` 또는 스토어 출시 준비 완료로 판정하지 않습니다.

- 실제 운영·Nginx API 주소를 제공한 인증·저장·정산 통합 테스트
- 웹 기준 이미지와 macOS 캡처의 상태별 픽셀 차이 검토 및 VoiceOver 수동 점검
- Apple Developer 인증서·영구 번들 식별자 확정과 notarization·Gatekeeper 검증
- 앱 강제 종료, 네트워크 전환과 디스크 쓰기 실패를 포함한 실제 Mac 장시간 복구 테스트

App Store 또는 외부 배포 전에는 Apple Developer 인증서 서명, hardened runtime, 권한 파일, notarization과 영구 번들 식별자를 별도로 확정해야 합니다.
