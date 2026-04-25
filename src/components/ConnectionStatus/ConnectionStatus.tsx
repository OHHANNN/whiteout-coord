import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useConnectionStatus } from '@/hooks/useConnectionStatus';

import styles from './ConnectionStatus.module.scss';

/**
 * 全站 fixed banner · 只在斷線時顯示，避免每次小抖動就閃。
 * 連線狀態變 false 後等 1.5 秒才顯示（避免短暫斷線）。
 */
export function ConnectionStatus() {
  const connected = useConnectionStatus();
  const { t } = useTranslation();
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    if (connected) {
      setShowOffline(false);
      return;
    }
    // 斷線後延遲 1.5s 才顯示，避免閃爍
    const id = window.setTimeout(() => setShowOffline(true), 1500);
    return () => window.clearTimeout(id);
  }, [connected]);

  if (!showOffline) return null;
  return (
    <div className={styles.banner} role="alert">
      <span className={styles.dot} />
      {t('error.connection_lost')} · {t('error.reconnecting')}
    </div>
  );
}
