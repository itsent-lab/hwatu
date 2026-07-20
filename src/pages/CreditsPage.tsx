import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { HWATU_ASSET_CREDITS, HWATU_CREDIT } from '../data/hwatuAssets';
import { getCard } from '../engine/cards';

const monthGroups = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  return { month, cards: HWATU_ASSET_CREDITS.filter(asset => getCard(asset.cardId)?.month === month) };
});

export default function CreditsPage() {
  return <PageLayout>
    <div className="page-heading credits-heading">
      <div><p className="eyebrow">카드 디자인 출처</p><h1>화투 패 크레딧</h1></div>
      <p>게임에 포함된 한국식 화투 SVG 48장의 출처와 라이선스입니다.</p>
    </div>

    <section className="panel-card credit-summary">
      <div>
        <h2>{HWATU_CREDIT.collectionName}</h2>
        <p>개별 SVG 추출·최적화: <a href={HWATU_CREDIT.individualAuthorUrl} target="_blank" rel="noreferrer">{HWATU_CREDIT.individualAuthor}</a></p>
        <p>한국식 화투 마스터 디자인: <a href={HWATU_CREDIT.designSourceUrl} target="_blank" rel="noreferrer">{HWATU_CREDIT.designAuthor}</a></p>
        <p>기초 그래픽: {HWATU_CREDIT.basisAuthor}</p>
      </div>
      <div className="license-card">
        <span>라이선스</span>
        <a href={HWATU_CREDIT.licenseUrl} target="_blank" rel="noreferrer">{HWATU_CREDIT.licenseName}</a>
        <small>출처 표시 · 동일조건변경허락</small>
      </div>
      <p className="credit-note">SVG 그림 내용은 수정하지 않았고, 앱 내부 카드 ID에 맞춰 로컬 파일명만 변경했습니다. 각 카드 이름을 누르면 Wikimedia Commons의 해당 파일 설명 페이지가 열립니다.</p>
      <div className="button-row">
        <a className="secondary-button" href={HWATU_CREDIT.categoryUrl} target="_blank" rel="noreferrer">Commons 전체 세트</a>
        <Link className="primary-button" to="/home">게임으로 돌아가기</Link>
      </div>
    </section>

    <section className="panel-card sound-credit">
      <div><p className="eyebrow">자체 제작 사운드</p><h2>효과음과 배경음</h2></div>
      <p>패 치기·뒤집기·짝 맞춤·뻑·자뻑·쪽·따닥·싹쓸이·폭탄·미션·고·스톱·승패 효과음은 외부 음원 파일 없이 Web Audio API로 실시간 합성합니다. 경쾌한 배경음도 한국 전통풍 5음계와 빠른 장단을 바탕으로 기기에서 생성하며, 선언 음성은 iPhone·iPad에 설치된 한국어 TTS를 사용합니다.</p>
    </section>

    <section className="credit-month-grid" aria-label="월별 화투 SVG 출처">
      {monthGroups.map(group => <article className="panel-card credit-month" key={group.month}>
        <h2>{group.month}월</h2>
        <ul>{group.cards.map(asset => {
          const card = getCard(asset.cardId);
          return <li key={asset.cardId}>
            <a href={asset.sourceUrl} target="_blank" rel="noreferrer">{card?.name ?? asset.cardId}</a>
            <small>{asset.fileTitle.replace('File:', '')}</small>
          </li>;
        })}</ul>
      </article>)}
    </section>
  </PageLayout>;
}
