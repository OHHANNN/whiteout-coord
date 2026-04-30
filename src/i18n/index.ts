import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { SUPPORTED_LANG_CODES } from './languages';
import en from './locales/en.json';
import ko from './locales/ko.json';
import zhTW from './locales/zh-TW.json';

export const LANG_STORAGE_KEY = 'whiteout-coord:lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': { translation: zhTW },
      en: { translation: en },
      ko: { translation: ko },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANG_CODES,
    // 讓 `en-US`、`en-GB` 自動降到 `en`、`ko-KR` 降到 `ko`、`zh-TW` 精準匹配
    // 沒這個的話、装置回 `en-US` 但 supportedLngs 沒有 `en-US`、會直接走 fallbackLng
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false, // React 會處理 XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
      // 把簡中（zh-CN / zh-Hans）跟其他 zh-* 對應到繁中、不要又掉回 fallback
      convertDetectedLanguage: (lng) => {
        if (lng.toLowerCase().startsWith('zh')) return 'zh-TW';
        return lng;
      },
    },
  });

export default i18n;
