import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { SUPPORTED_LANG_CODES } from './languages';
import en from './locales/en.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';

export const LANG_STORAGE_KEY = 'whiteout-coord:lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
      ko: { translation: ko },
    },
    fallbackLng: 'zh',
    supportedLngs: SUPPORTED_LANG_CODES,
    // 讓 'en-US'→'en'、'ko-KR'→'ko'、'zh-TW'/'zh-CN'/'zh-Hant'/'zh-Hans'→'zh'
    // 沒這個的話、装置回 'zh-TW' 但 supportedLngs 沒有 'zh-TW'、會走 fallbackLng
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false, // React 會處理 XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },
  });

export default i18n;
