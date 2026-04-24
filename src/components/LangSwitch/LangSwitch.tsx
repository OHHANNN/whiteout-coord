import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LANGUAGES, getLanguage } from '@/i18n/languages';

import styles from './LangSwitch.module.scss';

export function LangSwitch() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const current = getLanguage(i18n.language);

  // 點空白處關閉
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  // Esc 關閉
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const select = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className={styles.triggerLabel}>{current.shortLabel}</span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <ul className={styles.menu} role="listbox">
          {LANGUAGES.map((lang) => {
            const isActive = lang.code === current.code;
            return (
              <li key={lang.code} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                  onClick={() => select(lang.code)}
                >
                  {isActive && <span className={styles.dot} aria-hidden />}
                  {lang.nativeLabel}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
