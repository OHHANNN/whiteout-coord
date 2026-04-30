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
    // 讓 'en-US' / 'en-GB' 自動降到 'en'、'ko-KR' 降到 'ko'、'zh-Hant-TW' 降到 'zh-TW'
    nonExplicitSupportedLngs: true,
    // 只 load 我們實際提供 resource 的語系，避免 i18next 嘗試去抓不存在的 'en-US.json'
    // 配合 nonExplicitSupportedLngs 使用：'en-US' → 'en'，'en' resource 已在 inline resources
    load: 'currentOnly',
    // resources 都是 inline import 同步載入、用 false 讓 init 同步完成
    // 避免 useTranslation 在 i18n ready 之前 render 出 raw key（'brand.title'）
    initImmediate: false,
    interpolation: {
      escapeValue: false, // React 會處理 XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },
    react: {
      // 不靠 Suspense（我們沒有 <Suspense> wrap App、會炸）
      useSuspense: false,
    },
  });

export default i18n;
