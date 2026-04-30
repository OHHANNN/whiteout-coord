/**
 * 支援的語言清單。每多加一個語言：
 *   1. 在 `locales/` 建 `{code}.json`
 *   2. 在這個陣列加一筆
 *   3. 在 `i18n/index.ts` 把新 json import + 註冊到 resources
 */
export interface Language {
  code: string;
  /** 用該語言自己的文字顯示名稱（無論當前介面語言為何） */
  nativeLabel: string;
  /** 壓縮標籤，header 狹窄處用 */
  shortLabel: string;
}

export const LANGUAGES: Language[] = [
  { code: 'zh', nativeLabel: '繁體中文', shortLabel: '繁中' },
  { code: 'en', nativeLabel: 'English', shortLabel: 'EN' },
  { code: 'ko', nativeLabel: '한국어', shortLabel: 'KO' },
];

export const SUPPORTED_LANG_CODES = LANGUAGES.map((l) => l.code);

export function getLanguage(code: string | undefined): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
