import { useTranslation } from 'react-i18next';
import styles from './LangSwitch.module.scss';

const LANGS = [
  { code: 'zh-TW', labelKey: 'lang.zh' },
  { code: 'en', labelKey: 'lang.en' },
] as const;

export function LangSwitch() {
  const { i18n, t } = useTranslation();

  return (
    <div className={styles.wrap} role="group" aria-label="language">
      {LANGS.map(({ code, labelKey }) => (
        <button
          key={code}
          type="button"
          className={`${styles.btn} ${i18n.language === code ? styles.active : ''}`}
          onClick={() => i18n.changeLanguage(code)}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
