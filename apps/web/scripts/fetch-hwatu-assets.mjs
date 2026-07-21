import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mappingPath = resolve(root, 'src/data/hwatuAssetMap.json');
const outputDirectory = resolve(root, 'public/cards/hwatu');
const mapping = JSON.parse(await readFile(mappingPath, 'utf8'));
const entries = Object.entries(mapping);

if (entries.length !== 48 || new Set(entries.map(([, title]) => title)).size !== 48) {
  throw new Error('화투 자산 매핑은 서로 다른 정규 카드 48장이어야 합니다.');
}

const parameters = new URLSearchParams({
  action: 'query',
  generator: 'categorymembers',
  gcmtitle: 'Category:SVG Hwatu',
  gcmtype: 'file',
  gcmlimit: '500',
  prop: 'imageinfo',
  iiprop: 'url|sha1|extmetadata',
  format: 'json',
  formatversion: '2'
});
const apiUrl = `https://commons.wikimedia.org/w/api.php?${parameters}`;
const userAgent = 'NSJ-Hwatu/1.0 (asset verifier; itsent@itsent.co.kr; https://github.com/itsent-lab/hwatu)';
const pause = milliseconds => new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds));
const fetchWithRetry = async url => {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
    if (response.status !== 429 || attempt === 5) return response;
    await pause(attempt * 1200);
  }
  throw new Error('다운로드 재시도 횟수를 초과했습니다.');
};

const apiResponse = await fetchWithRetry(apiUrl);
if (!apiResponse.ok) throw new Error(`위키미디어 API 조회 실패: ${apiResponse.status}`);

const apiData = await apiResponse.json();
const pages = new Map(apiData.query.pages.map(page => [page.title, page]));
const verified = [];

await mkdir(outputDirectory, { recursive: true });
for (const [cardId, title] of entries) {
  if (!title.startsWith('File:Hwatu ') || title.includes(' flipped.svg') || !title.endsWith('.svg')) {
    throw new Error(`${cardId}: 한국식 Hwatu 정규 SVG가 아닙니다: ${title}`);
  }
  const page = pages.get(title);
  const image = page?.imageinfo?.[0];
  const metadata = image?.extmetadata;
  if (!image || metadata?.LicenseShortName?.value !== 'CC BY-SA 4.0') {
    throw new Error(`${title}: CC BY-SA 4.0 라이선스를 확인하지 못했습니다.`);
  }
  if (metadata?.LicenseUrl?.value !== 'https://creativecommons.org/licenses/by-sa/4.0') {
    throw new Error(`${title}: 예상한 라이선스 URL과 다릅니다.`);
  }
  if (!image.url.startsWith('https://upload.wikimedia.org/') || !image.descriptionurl.startsWith('https://commons.wikimedia.org/')) {
    throw new Error(`${title}: 위키미디어 공식 URL이 아닙니다.`);
  }
  const assetPath = resolve(outputDirectory, `${cardId}.svg`);
  let asset = await readFile(assetPath).catch(() => Buffer.alloc(0));
  if (!asset.toString('utf8').includes('<svg')) {
    const assetResponse = await fetchWithRetry(image.url);
    if (!assetResponse.ok) throw new Error(`${title} 다운로드 실패: ${assetResponse.status}`);
    asset = Buffer.from(await assetResponse.arrayBuffer());
    await writeFile(assetPath, asset);
    await pause(350);
  }
  const hexSha1 = createHash('sha1').update(asset).digest('hex');
  if (hexSha1 !== image.sha1) throw new Error(`${title}: Commons 원본 SHA-1과 일치하지 않습니다.`);
  const author = metadata.Artist.value.replace(/<[^>]+>/g, '');
  verified.push({ cardId, title, author, license: metadata.LicenseShortName.value, source: image.descriptionurl, sha1: image.sha1 });
}

await writeFile(resolve(outputDirectory, 'verification.json'), `${JSON.stringify({ apiUrl, assets: verified }, null, 2)}\n`);
console.log(`CC BY-SA 4.0 검증 및 다운로드 완료: ${verified.length}장`);
