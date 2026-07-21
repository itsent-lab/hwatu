# 네이티브 API·인증 계약

## 1. 범위와 현재 상태

이 문서는 네이티브 앱이 현재 서버와 통신할 때 지켜야 할 HTTP, 세션, CSRF, 오류 처리 기준입니다. 2026년 7월 21일 서버 구현을 기준으로 하며, 현재 확정된 인증은 **쿠키 세션 + CSRF**입니다. 별도의 Bearer 토큰 API는 아직 없습니다.

네이티브 앱은 출시 전에 쿠키 저장소가 운영체제 보호 영역을 사용하고, 앱 간 공유와 백업에서 제외되는지 검증해야 합니다. 토큰 인증으로 바꾸려면 서버 계약과 이 문서를 새 버전으로 먼저 확정합니다.

## 2. 공통 HTTP 규칙

- JSON 성공 응답: `{ "ok": true, "data": ... }`
- JSON 실패 응답: `{ "ok": false, "error": { "code": "...", "message": "..." } }`
- 본문 없는 성공도 `ok: true` 형식을 사용하며 `data`가 `null`일 수 있습니다.
- JSON 요청은 `Content-Type: application/json`, 프로필 이미지는 `multipart/form-data`를 사용합니다.
- 인증 쿠키와 CSRF 쿠키는 서버가 발급한 도메인·경로 규칙을 보존합니다.
- 쓰기 요청은 로그인 여부와 관계없이, 해당 엔드포인트가 요구하면 `X-CSRF-TOKEN` 헤더를 보냅니다.
- 서버 오류 메시지는 사용자 표시용으로 사용할 수 있지만 분기 로직은 안정적인 `error.code`를 기준으로 합니다.

## 3. 세션과 CSRF 흐름

현재 서버 쿠키는 다음 의미를 가집니다.

| 이름 | 용도 | 속성 |
| --- | --- | --- |
| `hwatu_auth` | 로그인 세션 | HttpOnly, SameSite=Lax, 운영 HTTPS에서 Secure, 유지 로그인 최대 90일 슬라이딩 |
| `hwatu_csrf` | 위조 방지 쿠키 | HttpOnly, SameSite=Strict |
| `hwatu_device` | 저장 충돌 식별용 기기 ID | JavaScript/앱에서 읽을 수 있음, SameSite=Lax, 최대 3년 |

권장 시작 순서는 다음과 같습니다.

1. `GET /api/client/status`로 앱·API 호환성을 확인합니다.
2. `GET /api/session`을 호출해 기존 세션을 복원합니다.
3. 401이면 `GET /api/auth/status`로 최초 설정 필요 여부를 확인합니다.
4. 로그인 또는 최초 설정 전에 `GET /api/auth/csrf`로 토큰을 받고 쿠키와 함께 보관합니다.
5. 쓰기 요청마다 가장 최근 `csrfToken`을 `X-CSRF-TOKEN`으로 전송합니다.
6. `CSRF_FAILED`이면 CSRF를 한 번 새로 받은 뒤 원 요청을 한 번만 재시도합니다. 다시 실패하면 로그인 화면으로 보내지 말고 오류를 표시합니다.
7. `AUTH_REQUIRED`이면 로컬 사용자 캐시를 비인증 상태로 전환하고 로그인으로 이동합니다.

로그아웃은 서버 요청 성공 여부와 무관하게 로컬 프로필·민감 캐시를 지웁니다. 저장된 게임과 미정산 큐는 사용자 ID로 격리하며 다른 로그인 사용자에게 보여주지 않습니다.

## 4. 호환성 확인

`GET /api/client/status` 요청에는 `X-Hwatu-Client`, `X-Hwatu-Client-Version`이 필요합니다. 상세 형식은 `shared/contracts/client-api-v1.json`이 기준입니다.

현재 서버가 실제 허용하는 네이티브 식별자는 `macos-native`뿐입니다. Android, iOS·iPadOS, Windows는 서버 허용값과 플랫폼별 최소 버전 필드를 추가하기 전까지 출시 호환이 확정된 것이 아닙니다. 알 수 없는 클라이언트나 최소 버전 미만이면 게임 화면에 들어가지 않고 업데이트 안내를 표시합니다.

## 5. 엔드포인트 목록

| 메서드·경로 | 인증/CSRF | 요청 또는 결과 핵심 |
| --- | --- | --- |
| `GET /api/client/status` | 없음 | API·최소 앱 버전과 호환 여부 |
| `GET /api/auth/status` | 없음 | `needsBootstrap`, `bootstrapEnabled` |
| `GET /api/auth/csrf` | 없음 | `csrfToken`과 CSRF 쿠키 발급 |
| `POST /api/auth/bootstrap` | CSRF | 설정 토큰, 아이디, 표시 이름, 비밀번호·확인; 첫 관리자 생성 |
| `POST /api/auth/login` | CSRF | `username`, `password`, `remember`; 사용자 반환 |
| `POST /api/auth/logout` | 세션+CSRF | 세션 종료 |
| `GET /api/session` | 세션 | 사용자, 새 CSRF 토큰, 기기 ID |
| `GET /api/dashboard` | 세션 | 사용자, 맞고 저장 메타, 오늘 통계 |
| `POST /api/balance/refill` | 세션+CSRF | 0냥일 때 500,000냥 리필 |
| `GET /api/profile/image/{userId}/{version}` | 세션 | 개인 JPEG; 성공 응답은 JSON이 아닌 이미지 |
| `PUT /api/profile/image` | 세션+CSRF | `image` 폼 필드 JPEG 업로드 |
| `GET /api/users/` | 관리자 | 가족 계정 목록 |
| `POST /api/users/` | 관리자+CSRF | 가족 계정 생성 |
| `PATCH /api/users/{id}/status` | 관리자+CSRF | 활성/중지 전환 |
| `PUT /api/users/{id}/password` | 관리자+CSRF | `password` 변경 |
| `GET /api/games/matgo` | 세션 | 저장된 맞고 전체 상태 또는 `data: null` |
| `PUT /api/games/matgo` | 세션+CSRF | UUID, 버전, 턴, 기기 ID, 전체 상태 저장·정산 |
| `POST /api/games/gostop/settle` | 세션+CSRF | UUID, 승자·결과, 점수와 3인 증감 정산 |

사용자 객체의 공통 필드는 `id`, `username`, `displayName`, `role`, `virtualBalance`, `opponentBalance`, `gostopComputerABalance`, `gostopComputerBBalance`, `profileImageUrl`입니다. 앱은 모르는 추가 필드를 무시합니다.

## 6. 검증 한계

- 아이디: 정규화 후 한글·영문 소문자·숫자·밑줄 3~30자
- 표시 이름: 공백 제거 후 1~20자
- 비밀번호: 15자 이상; 최초 설정에서는 확인 값 일치
- 로그인·최초 설정: 원격 IP당 분당 12회 제한
- 프로필: 앱에서 중앙 정사각형 512×512 JPEG로 변환; 원본 선택은 20MB 이하, 서버 요청 2MB 이하, JPEG 파일 1.5MB 이하
- 맞고 상태 JSON: UTF-8 524,288바이트 이하
- 점당 금액: 100, 1,000, 2,000, 5,000, 10,000만 허용
- 한 판 정산 금액: 각 검증 금액 절댓값 100,000,000 이하

## 7. 오류와 재시도

전체 오류 목록의 기계 기준은 `shared/contracts/error-codes-v1.json`입니다.

| 분류 | 처리 |
| --- | --- |
| 네트워크 단절, 500·502·503·504 | 읽기·로그인은 지수형 간격으로 재시도 가능. 쓰기는 UUID·턴 등 멱등 근거가 있을 때만 재시도 |
| `CSRF_FAILED` 419 | 토큰 재발급 후 같은 요청을 최대 한 번 재시도 |
| `AUTH_REQUIRED` 401 | 세션 만료 처리 후 로그인 요구 |
| `LOGIN_RATE_LIMITED` 429 | 자동 반복을 멈추고 사용자가 잠시 기다리도록 안내 |
| 409 | 서버 현재 상태와 충돌하므로 사용자 행동 또는 최신 상태 재조회 필요 |
| 413·422 | 입력이나 로컬 데이터 수정 전에는 재시도하지 않음 |

자동 재시도는 동일 게임 정산을 두 번 적용하지 않아야 합니다. 맞고는 게임 UUID·종료 상태, 고스톱은 게임 UUID를 중복 방지 키로 사용합니다.

## 8. 보안 완료 조건

- 운영 API는 HTTPS만 허용하고 인증서 오류를 우회하지 않습니다.
- 세션·CSRF 값, 비밀번호, 초기 설정 토큰을 로그·분석 이벤트·크래시 첨부에 남기지 않습니다.
- 비밀번호를 기기 설정이나 일반 파일에 저장하지 않습니다.
- 사용자 전환 시 메모리의 프로필 이미지와 이전 사용자의 화면 상태도 제거합니다.
- 디버그 서버 주소 변경 기능이 있다면 배포 빌드에서 제거하거나 관리자 보호를 둡니다.
- Android/iOS/Windows 클라이언트 허용값과 최소 버전 응답이 서버에 구현되기 전에는 해당 플랫폼 출시 준비 완료로 판정하지 않습니다.
