# 프로젝트 문서 안내

## 제품과 공개 범위

- [`project-purpose.md`](project-purpose.md): 가족용 프로젝트 목적과 공개 원칙
- [`reference-and-asset-policy.md`](reference-and-asset-policy.md): 참고 자료와 카드·오디오 자산 정책
- [`public-release-checklist.md`](public-release-checklist.md): 공개 저장소 점검표

## 게임과 공통 계약

- [`game-rules.md`](game-rules.md): 맞고·고스톱 점수·진행·정산 규칙
- [`game-rule-test-vectors.md`](game-rule-test-vectors.md): 플랫폼 공통 JSON 규칙 벡터 운영 방법
- [`../shared/contracts/README.md`](../shared/contracts/README.md): API 호환성, 오류 코드, 규칙 벡터 원본

## 네이티브 앱 구현 세트

아래 문서는 함께 사용합니다. 하나만 읽고 플랫폼 구현 완료로 판정하지 않습니다.

1. [`app-platform-architecture.md`](app-platform-architecture.md): 저장소 경계, 네이티브 원칙과 개발 단계
2. [`native-app-implementation-spec.md`](native-app-implementation-spec.md): 화면, 조작, 상태 전이와 연출 타이밍
3. [`native-api-auth-contract.md`](native-api-auth-contract.md): HTTP, 현재 쿠키·CSRF 인증, 엔드포인트와 오류 처리
4. [`native-state-offline.md`](native-state-offline.md): 로컬 저장, 병합, 미정산 큐, 오프라인과 마이그레이션
5. [`native-ui-design-baseline.md`](native-ui-design-baseline.md): 디자인 토큰, 반응형, 입력, 접근성과 기준 화면
6. [`native-audio-effects-contract.md`](native-audio-effects-contract.md): 게임 사건별 오디오·음성, 지연과 중복 방지
7. [`native-platform-release.md`](native-platform-release.md): 플랫폼 차이, 생명주기, 빌드·시험·출시 게이트

## 변경 시 같이 확인할 문서

| 변경 | 함께 갱신할 기준 |
| --- | --- |
| 점수·정산 규칙 | 게임 규칙, JSON 벡터, 각 플랫폼 규칙 테스트 |
| 화면 흐름·조작·타이밍 | 구현 명세, UI 기준 화면, 오디오 사건 |
| API·인증·오류 | API 계약, `shared/contracts/`, 저장 재시도 정책 |
| 저장 형식·동기화 | 상태·오프라인 명세, 마이그레이션 테스트, 릴리스 기준 |
| 카드·음원·글꼴 | 자산 정책, 오디오 계약, 크레딧과 라이선스 |
| 최소 OS·배포 방식 | 플랫폼 README, 플랫폼 릴리스 기준 |

문서와 구현이 다르면 현재 동작을 임의로 정답 처리하지 않습니다. 제품 의도를 확인해 기준 문서와 기계 계약을 먼저 또는 같은 변경에서 맞춘 뒤 구현과 테스트를 갱신합니다.
