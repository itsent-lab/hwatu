import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

const MIT_LICENSE = `MIT License

Copyright (c) 2026 NSJ <itsent@itsent.co.kr>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export default function LicensePage() {
  return <PageLayout>
    <div className="legal-page">
      <div className="page-heading">
        <div><p className="eyebrow">Software License</p><h1>MIT 라이선스</h1></div>
        <p>NSJ가 권리를 보유한 가족화투 자체 제작 코드에 적용됩니다.</p>
      </div>

      <article className="panel-card legal-document">
        <section>
          <h2>적용 범위</h2>
          <p>NSJ가 독자적으로 작성하고 저작권을 보유한 가족화투 소스 코드는 아래 MIT 라이선스로 제공합니다. 게임 규칙, 사용자 경험, 일반적인 구현 사례와 참고 자료의 표현 방식·연출은 살펴보았지만, 원본의 코드·문구·화면·이미지·음성·영상 또는 기타 데이터를 추출·복사·전재한 형태로 가져오지 않았습니다. 명시된 제3자 구성요소를 제외한 자체 제작 결과물은 이 프로젝트를 위해 새로 작성·제작했습니다.</p>
          <p>공개 또는 배포는 지속적인 유지보수, 업데이트, 호환성, 설치·운영 지원이나 공개 서비스 제공 의무를 만들지 않습니다.</p>
          <p className="legal-notice">화투 SVG와 오픈소스 의존성 등 제3자 구성요소에는 각각의 원저작자 라이선스가 적용되며 MIT 라이선스로 변경되지 않습니다. 화투 패의 출처와 CC BY-SA 4.0 조건은 <Link to="/credits">화투 패 출처 및 라이선스</Link>에서 확인할 수 있습니다.</p>
        </section>

        <section>
          <h2>라이선스 원문</h2>
          <pre className="license-text">{MIT_LICENSE}</pre>
          <div className="button-row">
            <a className="secondary-button" href="https://opensource.org/license/mit" target="_blank" rel="noreferrer">OSI에서 MIT 라이선스 보기</a>
            <a className="secondary-button" href="https://github.com/itsent-lab/hwatu/blob/main/THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">제3자 라이선스 고지</a>
            <Link className="primary-button" to="/home">게임으로 돌아가기</Link>
          </div>
        </section>
      </article>
    </div>
  </PageLayout>;
}
