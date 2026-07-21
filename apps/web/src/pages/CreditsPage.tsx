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
        <p>개별 SVG 제작·공개: <a href={HWATU_CREDIT.individualAuthorUrl} target="_blank" rel="noreferrer">{HWATU_CREDIT.individualAuthor}</a></p>
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
      <div><p className="eyebrow">게임 사운드</p><h2>효과음과 배경음</h2></div>
      <div>
        <p>패 치기·이동·짝 맞춤에는 Freesound의 CC0 녹음 효과음을 사용합니다. 뻑·자뻑·쪽·따닥·싹쓸이·폭탄·미션·고·스톱·승패를 포함한 특수 효과는 Kenney의 Casino Audio, Impact Sounds, Interface Sounds CC0 음원을 사용합니다. Web Audio API는 파일 재생·음량·압축과 게임 상황에 따른 배경음 재생 속도 조절에만 사용하며 런타임 합성음을 만들지 않습니다.</p>
        <p>기본 배경음은 한국저작권위원회 공유마당의 CC BY 4.0 「국악 배경음악 #133」을 사용합니다. 한국어 선언 음성은 OpenRAIL-M으로 공개된 Supertonic 3 모델로 생성했으며, 음색별 이름은 F2 사용자, F1 이서윤, F3 한서진, F4 김영숙, M1 이정호, M4 박영수, M5 최동철입니다. 기기의 한국어 TTS는 사용하지 않습니다.</p>
        <p><a href="https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?menuNo=200020&wrtSn=13379716" target="_blank" rel="noreferrer">국악 배경음악 #133 · 공유마당</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></p>
        <p><a href="https://kenney.nl/assets/casino-audio" target="_blank" rel="noreferrer">Kenney Casino Audio</a> · <a href="https://kenney.nl/assets/impact-sounds" target="_blank" rel="noreferrer">Impact Sounds</a> · <a href="https://kenney.nl/assets/interface-sounds" target="_blank" rel="noreferrer">Interface Sounds</a> · <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noreferrer">CC0 1.0</a></p>
        <p><a href="https://huggingface.co/Supertone/supertonic-3" target="_blank" rel="noreferrer">Supertonic 3 모델</a> · <a href="https://huggingface.co/Supertone/supertonic-3/blob/main/LICENSE" target="_blank" rel="noreferrer">BigScience OpenRAIL-M</a></p>
        <p>효과음별 제작자·출처는 <a href="/audio/ATTRIBUTION.txt" target="_blank" rel="noreferrer">오디오 자산 고지</a>에서 확인할 수 있습니다.</p>
      </div>
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
