# 공통 계약

웹과 네이티브 앱이 서로 다른 언어로 구현되더라도 같은 서버와 게임 규칙을 이해하도록 만드는 언어 중립 자료의 위치입니다.

다음 자료만 이곳에 둡니다.

- OpenAPI 등 서버 API 요청·응답 명세
- 카드와 게임 규칙을 검증하는 JSON 테스트 벡터
- 플랫폼 공통 오류 코드와 데이터 버전 명세

TypeScript, Kotlin, Swift 또는 C#의 UI·저장소 구현을 이 디렉터리에 두지 않습니다. 계약 변경은 기존 소비자의 호환성을 확인하고, 의미가 바뀌면 파일명과 내부 계약 버전을 함께 올립니다.

현재 확정된 계약:

- `client-api-v1.json`: 네이티브 클라이언트가 서버 API 버전과 호환성을 확인하는 요청·응답 계약
- `error-codes-v1.json`: 공통 오류 코드, HTTP 상태와 클라이언트 처리 분류
- `game-rule-vectors-v1.schema.json`: 게임 규칙 벡터의 JSON 구조
- `game-rule-vectors-v1.json`: 웹과 모든 네이티브 규칙 엔진이 통과해야 하는 입력·기대 결과

운영 방법은 [`../../docs/game-rule-test-vectors.md`](../../docs/game-rule-test-vectors.md)와 [`../../docs/native-api-auth-contract.md`](../../docs/native-api-auth-contract.md)를 참고합니다.
