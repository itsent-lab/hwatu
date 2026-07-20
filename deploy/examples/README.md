# 공개 배포 설정 예제

이 디렉터리의 파일은 GitHub에 공개할 수 있도록 예시 도메인, 예시 계정과 예시 설치 경로만 사용합니다. 실제 운영 설정은 상위 `deploy/`의 별도 경로에 만들며 Git에서 제외됩니다.

## 사용 순서

1. `services/api/appsettings.Production.example.json`을 `services/api/appsettings.Production.json`으로 복사합니다.
2. DB 계정과 비밀번호, `AllowedHosts`를 실제 값으로 바꾸고 파일 권한을 제한합니다.
3. 최초 관리자 생성에만 사용할 32자 이상의 임의 토큰을 비밀 저장소나 환경 변수 `Bootstrap__Token`으로 설정합니다. 관리자 생성 직후 값을 제거하고 서비스를 재시작합니다.
4. `nginx/hwatu.example.conf`를 서버의 Nginx 설정 위치로 복사해 도메인, 인증서와 배포 경로를 바꿉니다.
5. `systemd/family-hwatu.example.service`를 systemd 단위 위치로 복사해 사용자, 그룹과 배포 경로를 바꿉니다.
6. 설정 문법을 검사한 뒤 서비스에 반영합니다.

실제 비밀번호, 토큰, 인증서, 개인키, 서버 사용자명과 내부 경로를 이 예제 파일에 기록하지 마십시오.
