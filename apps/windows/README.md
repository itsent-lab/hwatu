# Windows 앱

Windows 전용 네이티브 앱 디렉터리입니다. C#과 WinUI로 100% 네이티브 구현하며 웹 화면이나 WebView를 포함하지 않습니다.

WebView2, 내장 브라우저, 로컬 HTML·JavaScript 번들 또는 웹 URL로 앱 화면을 구현하는 것은 절대 금지합니다. UI/UX는 웹 기준과 동일하게 WinUI로 다시 구현하고, 웹의 음성·음향·효과 파일은 바이트가 동일한 원본을 사용합니다.

이 디렉터리는 Windows application identity, WinUI 화면, Windows 저장소·네트워크 구현, 리소스, 코드 서명과 설치 패키지 설정을 소유합니다.

현재는 디렉터리 책임만 확정했으며 솔루션과 앱 식별자는 아직 생성하지 않았습니다.
