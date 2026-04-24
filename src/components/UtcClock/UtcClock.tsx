import { useTranslation } from 'react-i18next';

import { useNow } from '@/hooks/useServerTime';
import { formatUtcTime } from '@/lib/time';

import styles from './UtcClock.module.scss';

type Size = 'lg' | 'md' | 'sm';

interface UtcClockProps {
  size?: Size;
  showLabel?: boolean;
}

/**
 * 顯示當前 UTC 時間（秒級，已經過 Firebase server time 校正）。
 */
export function UtcClock({ size = 'lg', showLabel = true }: UtcClockProps) {
  const now = useNow(1000);
  const { t } = useTranslation();

  return (
    <div className={`${styles.wrap} ${styles[size]}`}>
      <div className={styles.badge}>{`[ ${t('clock.sync')} ]`}</div>
      <div className={styles.value}>{formatUtcTime(now)}</div>
      {showLabel && <div className={styles.label}>{t('clock.utc_label')}</div>}
    </div>
  );
}
