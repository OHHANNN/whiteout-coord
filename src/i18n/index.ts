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
    fallbackLng: 'zh-TW',
    supportedLngs: SUPPORTED_LANG_CODES,
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
