import sourceFileMap from './hwatuAssetMap.json';

const sources = sourceFileMap as Readonly<Record<string, string>>;

export const HWATU_CREDIT = Object.freeze({
  collectionName: 'Wikimedia Commons SVG Hwatu',
  individualAuthor: 'Spenĉjo',
  individualAuthorUrl: 'https://commons.wikimedia.org/wiki/User:Spen%C4%89jo',
  designAuthor: 'Marcus Richert',
  designSourceUrl: 'https://commons.wikimedia.org/wiki/File:Hwatu_overview.svg',
  basisAuthor: 'Louie Mantia, Jr.',
  categoryUrl: 'https://commons.wikimedia.org/wiki/Category:SVG_Hwatu',
  licenseName: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/'
});

export interface HwatuAssetCredit {
  cardId: string;
  fileTitle: string;
  sourceUrl: string;
}

const sourceUrl = (fileTitle: string) =>
  `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle.replaceAll(' ', '_'))}`;

export const HWATU_ASSET_CREDITS: readonly HwatuAssetCredit[] = Object.freeze(
  Object.entries(sources).map(([cardId, fileTitle]) => Object.freeze({ cardId, fileTitle, sourceUrl: sourceUrl(fileTitle) }))
);

export const getHwatuAssetUrl = (cardId: string): string | null =>
  sources[cardId] ? `/cards/hwatu/${cardId}.svg` : null;

export const getHwatuSourceTitle = (cardId: string): string | null => sources[cardId] ?? null;
