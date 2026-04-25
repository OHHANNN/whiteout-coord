import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import styles from './MuteToggle.module.scss';

interface MuteToggleProps {
  muted: boolean;
  onChange: (muted: boolean) => void;
  className?: string;
}

export function MuteToggle({ muted, onChange, className }: MuteToggleProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={clsx(styles.btn, muted && styles.muted, className)}
      onClick={() => onChange(!muted)}
      aria-label={muted ? t('sound.unmute') : t('sound.mute')}
      title={muted ? t('sound.off') : t('sound.on')}
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
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {muted ? (
          <>
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </>
        ) : (
          <>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        )}
      </svg>
      <span className={styles.label}>{muted ? 'SOUND OFF' : 'SOUND ON'}</span>
    </button>
  );
}
