import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

const MIT_LICENSE = `MIT License

Copyright (c) 2026 NSRNB

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
        <p>가족화투 자체 제작 소프트웨어 코드에 적용됩니다.</p>
      </div>

      <article className="panel-card legal-document">
        <section>
          <h2>적용 범위</h2>
          <p>가족화투의 자체 제작 소스 코드는 아래 MIT 라이선스로 제공합니다. 서비스가 비공개로 운영되는지와 관계없이, 소프트웨어 사본을 제공받은 경우 아래 조건이 적용됩니다.</p>
          <p className="legal-notice">화투 SVG와 그 밖의 제3자 구성요소에는 각각의 원저작자 라이선스가 적용되며 MIT 라이선스로 변경되지 않습니다. 화투 패의 출처와 CC BY-SA 4.0 조건은 <Link to="/credits">화투 패 출처 및 라이선스</Link>에서 확인할 수 있습니다.</p>
        </section>

        <section>
          <h2>라이선스 원문</h2>
          <pre className="license-text">{MIT_LICENSE}</pre>
          <div className="button-row">
            <a className="secondary-button" href="https://opensource.org/license/mit" target="_blank" rel="noreferrer">OSI에서 MIT 라이선스 보기</a>
            <Link className="primary-button" to="/home">게임으로 돌아가기</Link>
          </div>
        </section>
      </article>
    </div>
  </PageLayout>;
}
