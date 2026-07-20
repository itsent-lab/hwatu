# Hwatu

React와 ASP.NET Core로 만든 한국 화투 웹게임입니다. 2인 맞고와 3인 고스톱, AI 상대, 게임 저장 및 사용자 관리 기능을 포함합니다.

## 주요 기능

- 2인 맞고와 3인 고스톱 게임 모드
- 난이도별 AI와 게임 진행 효과
- 사용자 로그인, 관리자 계정 관리, 프로필 이미지
- MySQL 기반 게임 저장과 정산 기록
- 반응형 UI 및 PWA 정적 자산
- Vitest 기반 규칙·UI·시뮬레이션 테스트

## 기술 스택

- React 19, TypeScript, Vite
- ASP.NET Core 10, Dapper, MySqlConnector
- MySQL 8 이상
- Vitest

## 로컬 실행

Node.js, .NET 10 SDK, MySQL을 준비합니다.

```bash
npm install
```

프로젝트 루트에 Git에서 제외되는 `appsettings.Local.json`을 만들고 로컬 DB 연결 문자열을 입력합니다.

```json
{
  "ConnectionStrings": {
    "Hwatu": "Server=127.0.0.1;Port=3306;Database=hwatu;User ID=hwatu;Password=change-me;Character Set=utf8mb4;"
  }
}
```

DB와 사용자를 만든 뒤 서버와 프런트엔드 개발 서버를 각각 실행합니다. 서버 시작 시 `database/schema.sql`을 적용합니다.

```bash
npm run dev:server
npm run dev
```

브라우저에서 `http://127.0.0.1:5234`에 접속하면 됩니다. 최초 실행 시 관리자 계정을 등록할 수 있습니다.

## 검사와 빌드

```bash
npm test
npm run typecheck
npm run build
dotnet build
```

Vite 빌드 결과는 `wwwroot/`에 생성되며 저장소에는 포함하지 않습니다.

## 공개본 범위

이 저장소에는 애플리케이션 소스, 테스트, DB 스키마와 재배포 가능한 정적 자산만 포함합니다. 실제 서버 도메인·경로가 들어간 배포 설정, 로컬 DB 자격증명, 의존성 디렉터리와 빌드 산출물은 포함하지 않습니다.

## 라이선스

애플리케이션 코드는 [MIT License](LICENSE)로 배포합니다.

`public/cards/hwatu/`의 화투 SVG는 Wikimedia Commons에서 가져온 CC BY-SA 4.0 자산입니다. 저작자, 원본 링크, 검증 정보는 [`public/cards/hwatu/ATTRIBUTION.txt`](public/cards/hwatu/ATTRIBUTION.txt)와 [`public/cards/hwatu/verification.json`](public/cards/hwatu/verification.json)을 확인하세요.
