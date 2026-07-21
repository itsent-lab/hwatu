# 데이터베이스 마이그레이션

`schema.sql`은 신규 데이터베이스의 최신 전체 스냅샷이고, 이 디렉터리는 기존 데이터베이스를 같은 상태로 올리는 순차 변경 이력입니다.
기존 `DatabaseInitializer`의 호환 보정 코드는 과거 DB 지원용으로만 유지하며 새 `ALTER TABLE`을 그 코드에 추가하지 않습니다.

## 새 마이그레이션 추가

1. 다음 번호의 `NNNN_name.sql`과 상태 검증용 `NNNN_name.verify.sql`을 추가합니다.
2. 자동 복구가 가능한 변경은 역변경 SQL과 역변경 검증 SQL을 함께 추가합니다.
3. 자동 복구가 안전하지 않은 변경은 수동 복구 문서를 추가하고 manifest의 rollback mode를 `manual`로 지정합니다. 이 마이그레이션은 자동 운영 배포에서 차단됩니다.
4. 변경이 모두 반영된 신규 DB 상태가 되도록 `../schema.sql`을 갱신합니다.
5. 각 파일과 schema.sql의 SHA-256을 계산해 `manifest.json`에 기록합니다.
6. 저장소 루트에서 `dotnet run --no-launch-profile --project services/api/Hwatu.Server.csproj -- migrations validate --content-root "$PWD/services/api"`를 실행합니다.

자동 배포 가능한 항목 예시:

```json
{
  "id": "0001_example",
  "description": "예시 변경",
  "up": "0001_example.sql",
  "sha256": "<UP_SHA256>",
  "verify": "0001_example.verify.sql",
  "verifySha256": "<VERIFY_SHA256>",
  "onlineSafeWithPreviousApp": true,
  "rollback": {
    "mode": "automatic",
    "file": "0001_example.rollback.sql",
    "sha256": "<ROLLBACK_SHA256>",
    "verify": "0001_example.rollback.verify.sql",
    "verifySha256": "<ROLLBACK_VERIFY_SHA256>"
  }
}
```

MySQL DDL은 암묵적 커밋이 발생할 수 있으므로 트랜잭션만으로 복구된다고 가정하지 않습니다. 자동 배포 항목은 이전 앱과 동시에 실행 가능해야 하며, 실제 상태를 되돌리는 명시적 rollback SQL과 검증 SQL이 필수입니다.
