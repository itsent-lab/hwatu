# 데이터베이스 마이그레이션

`schema.sql`은 신규 데이터베이스의 최신 전체 스냅샷이고, 이 디렉터리는 기존 데이터베이스를 같은 상태로 올리는 순차 변경 이력입니다.
서버는 `Database:InitializeOnStartup`이 켜져 있으면 처음 시작할 때 PostgreSQL 스키마와 마이그레이션 이력 테이블을 만듭니다.

## MySQL에서 처음 옮길 때

PostgreSQL에 빈 DB를 만들고 대상 연결 설정으로 서버를 한 번 기동해 스키마를 준비합니다. 최초 관리자 등록 전에 서버를 중지합니다. MySQL 8 이상의 원본 가족화투 DB에는 읽기 권한이 있는 계정으로 연결합니다. 두 DB의 세션 시간대가 같아야 오늘 전적의 날짜 경계가 유지됩니다.

```bash
dotnet run --project scripts/Hwatu.DataTransfer -- /private/path/source.json /private/path/target.json
```

두 설정 파일은 각각 기존 MySQL과 새 PostgreSQL의 `ConnectionStrings.Hwatu` 값을 사용합니다. 이관 도구는 한 시점의 회원·저장판·전적과 원본에 있는 마이그레이션 이력을 읽습니다. 빈 대상에서 모든 행과 열을 대조한 뒤 한 번에 커밋합니다. 원본의 다음 발급 ID도 이어받습니다. 대상 테이블에 자료가 있거나 예상 밖의 원본 테이블·열이 있으면 이관을 중지합니다.

운영 전환 때는 최종 복사 전에 원본 쓰기를 중지합니다. 대상 검증을 마친 뒤 쓰기를 다시 엽니다. PostgreSQL에서 새 쓰기를 받은 뒤에는 기존 MySQL 사본만으로 그 변경을 복구할 수 없습니다.

## 전환 전후 확인

1. 검증 환경에서 이관 결과를 대조한 뒤 로그인, 저장판 이어하기, 전적 조회, 맞고·고스톱 정산과 중복 정산 방지, 백업 복원을 확인합니다. 실패하거나 확인하지 못한 항목이 있으면 운영 전환을 보류합니다.
2. 운영 쓰기를 중지한 상태에서 최종 이관과 데이터 대조를 마칩니다. 새 연결 설정으로 서비스를 시작해 DB 연결을 확인한 뒤 쓰기를 엽니다.
3. 앱과 PostgreSQL이 같은 서버에 있으면 실제 PostgreSQL 클러스터의 systemd 단위를 앱의 `After=`와 `Wants=`에 지정합니다. 두 서비스가 부팅 시 시작하도록 설정하고, 앱 단위에 남은 MySQL 의존성을 제거합니다.
4. 서비스 설정을 반영한 뒤 앱을 재시작합니다. 새 프로세스의 PostgreSQL 연결을 확인합니다. 외부 HTTPS로 회원 상태 API와 정적 파일을 요청해 응답을 확인합니다. 서버 전체의 자동 기동은 실제 재부팅 때 별도로 확인합니다.
5. 전환 이후 자료가 담긴 최신 백업을 별도 인스턴스에 복원합니다. 복원을 검증한 뒤 전환용 임시 사본과 이전 앱 복구본을 정리합니다. 다음 정기 백업에서도 PostgreSQL 덤프가 수신되는지 확인합니다.

## PostgreSQL 백업과 복원 확인

운영 DB에서 새 쓰기를 받기 시작하면 전환 이후 자료를 담은 PostgreSQL 백업을 준비합니다. 덤프와 SHA-256 체크섬은 운영 서버 외부의 접근이 제한된 보관처에 함께 저장합니다.

PostgreSQL 18 도구를 사용합니다. 아래의 `game-source`와 `restore-admin`은 libpq 서비스 설정의 예시 이름입니다. 복원 대상은 원본과 분리된 PostgreSQL 인스턴스여야 합니다. `--create`는 덤프에 기록된 원래 DB 이름으로 새 데이터베이스를 만듭니다. 실제로 복원하기 전에 덤프가 참조하는 소유자와 권한 역할을 대상에 준비합니다.

```bash
pg_dump --format=custom --create --dbname='service=game-source' --file=family-game.dump
sha256sum family-game.dump > family-game.sha256
sha256sum --check family-game.sha256
pg_restore --list family-game.dump
pg_restore --create --exit-on-error --dbname='service=restore-admin' family-game.dump
```

덤프 목록과 체크섬을 확인한 뒤 격리 DB에 실제로 복원합니다. 백업 시점의 원본과 회원·저장판·전적의 행 수와 값, 제약 조건, 다음 발급 ID를 대조합니다. 전환 이후 쓰기가 있었다면 그 기록도 들어 있는지 확인합니다. 최신 사본의 복원을 검증한 뒤 운영 서버와 검증 환경의 중복 복구본을 정리합니다.

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

러너는 PostgreSQL 세션 잠금으로 동시 실행을 막고 각 적용 시도를 기록합니다. 자동 배포 항목은 이전 앱과 동시에 실행 가능해야 하며, 실제 상태를 되돌리는 명시적 rollback SQL과 검증 SQL이 필수입니다.
