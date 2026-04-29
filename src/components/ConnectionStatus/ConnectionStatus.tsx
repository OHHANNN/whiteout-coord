import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';

import { useConnectionStatus } from '@/hooks/useConnectionStatus';

/**
 * 全站 fixed banner · 只在斷線時顯示。
 * 連線狀態變 false 後等 1.5s 才顯示，避免短暫斷線閃爍。
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
    const id = window.setTimeout(() => setShowOffline(true), 1500);
    return () => window.clearTimeout(id);
  }, [connected]);

  if (!showOffline) return null;
  return (
    <div
      role="alert"
      className="bg-warning text-warning-foreground fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium shadow-md"
    >
      <WifiOff className="size-4 animate-pulse" />
      {t('error.connection_lost')} · {t('error.reconnecting')}
    </div>
  );
}
