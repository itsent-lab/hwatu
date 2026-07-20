import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

export default function PrivacyPage() {
  return <PageLayout>
    <div className="legal-page">
      <div className="page-heading">
        <div><p className="eyebrow">Privacy</p><h1>개인정보 처리방침</h1></div>
        <p>시행일: 2026년 7월 20일</p>
      </div>

      <article className="panel-card legal-document">
        <section>
          <h2>1. 기본 원칙</h2>
          <p>가족화투는 가족 구성원이 사용하는 비공개 게임 서비스입니다. 서비스 운영자는 계정 인증, 게임 저장과 가족 회원 관리를 위해 필요한 범위에서만 개인정보를 처리합니다.</p>
        </section>

        <section>
          <h2>2. 처리하는 정보와 이용 목적</h2>
          <table>
            <thead><tr><th>구분</th><th>처리 항목</th><th>이용 목적</th></tr></thead>
            <tbody>
              <tr><td>가족 계정</td><td>아이디, 표시 이름, 프로필 사진, 암호화된 비밀번호, 역할, 계정 활성 상태</td><td>로그인, 사용자 식별, 가족 회원 관리</td></tr>
              <tr><td>게임 정보</td><td>게임 저장 상태, 전적, 점수, 가상 게임머니, 상대 가상 게임머니</td><td>게임 이어하기, 결과 정산, 이용 기록 제공</td></tr>
              <tr><td>자동 생성 정보</td><td>최근 로그인 시각, 기기 식별값, 접속 IP와 서버 접속·오류 기록</td><td>로그인 유지, 기기 간 저장 동기화, 장애 대응과 보안</td></tr>
              <tr><td>기기 내 정보</td><td>게임 저장본, 사용자 프로필, 음량, 음소거, 배경음, AI 난이도, 점당 가상 게임머니 설정</td><td>오프라인 이어하기와 개인 설정 유지</td></tr>
            </tbody>
          </table>
          <p>이 서비스는 전화번호, 이메일 주소, 결제 정보나 실제 화폐 교환 정보를 요구하지 않습니다.</p>
        </section>

        <section>
          <h2>3. 보유 기간과 파기</h2>
          <ul>
            <li>계정과 게임 정보는 가족 계정이 유지되는 동안 보관합니다.</li>
            <li>계정 삭제 요청이 처리되면 연결된 게임 저장본과 전적을 함께 삭제합니다.</li>
            <li>서버 접속·오류 기록은 장애 대응과 보안에 필요한 기간 동안만 보관한 뒤 삭제합니다.</li>
            <li>기기 내 정보는 브라우저의 사이트 데이터 삭제 기능으로 직접 지울 수 있습니다.</li>
          </ul>
        </section>

        <section>
          <h2>4. 제3자 제공과 처리 위탁</h2>
          <p>개인정보를 외부 제3자에게 판매하거나 제공하지 않으며, 현재 개인정보 처리 업무를 별도 업체에 위탁하지 않습니다. 변경이 생기면 이 처리방침을 통해 안내합니다.</p>
        </section>

        <section>
          <h2>5. 쿠키와 기기 저장소</h2>
          <p>로그인과 보안을 위해 인증 쿠키, CSRF 방지 쿠키와 기기 식별 쿠키를 사용합니다. IndexedDB에는 프로필과 게임 저장본을, 로컬 저장소에는 음향과 게임 환경설정을 보관합니다. 서비스 워커 캐시는 화면과 화투 패 등 정적 파일만 저장하며 API 응답은 캐시하지 않습니다.</p>
        </section>

        <section>
          <h2>6. 이용자의 권리와 행사 방법</h2>
          <p>가족 구성원은 본인 정보의 열람, 수정, 삭제, 처리 정지를 가족 관리자에게 요청할 수 있습니다. 비밀번호 변경과 계정 활성 상태 변경은 가족 관리자 화면에서 처리할 수 있으며, 계정 삭제가 필요한 경우 서비스 운영자에게 직접 요청할 수 있습니다.</p>
        </section>

        <section>
          <h2>7. 안전성 확보 조치</h2>
          <p>비밀번호는 원문으로 저장하지 않고 단방향 해시로 보관합니다. 인증 쿠키, CSRF 검증, 로그인 시도 제한, HTTPS, 접근 권한 분리와 보안 응답 헤더를 적용하고 있습니다.</p>
        </section>

        <section>
          <h2>8. 아동의 개인정보</h2>
          <p>가족 관리자가 가족 구성원의 계정을 직접 생성하는 구조입니다. 만 14세 미만 가족 구성원의 계정을 만드는 경우 법정대리인이 계정 생성과 이용을 관리해야 합니다.</p>
        </section>

        <section>
          <h2>9. 문의 및 처리방침 변경</h2>
          <p>개인정보 관련 문의와 권리 행사는 서비스의 가족 관리자 또는 서비스 운영자에게 <a href="mailto:itsent@itsent.co.kr">itsent@itsent.co.kr</a>로 요청해 주세요. 처리방침이 변경되면 시행일과 변경 내용을 이 페이지에 표시합니다.</p>
          <div className="button-row"><Link className="primary-button" to="/home">게임으로 돌아가기</Link></div>
        </section>
      </article>
    </div>
  </PageLayout>;
}
