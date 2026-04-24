import clsx from 'clsx';

import { useNow } from '@/hooks/useServerTime';
import { formatDuration } from '@/lib/time';

import styles from './Countdown.module.scss';

interface CountdownProps {
  /** 目標時間（epoch ms）。若為 null，顯示 --:--。 */
  targetAt: number | null;
  /** 小標題，顯示在數字下方 */
  label?: string;
  /** 數字字級 */
  size?: 'md' | 'lg' | 'xl';
}

/**
 * 從當前校正時間算到目標時間的 MM:SS 倒數。
 * < 60s warning（黃）、< 30s danger（紅閃）
 */
export function Countdown({ targetAt, label, size = 'md' }: CountdownProps) {
  const now = useNow(1000);

  if (targetAt == null) {
    return (
      <div className={clsx(styles.wrap, styles[size])}>
        <div className={styles.value}>--:--</div>
        {label && <div className={styles.label}>{label}</div>}
      </div>
    );
  }

  const remainingMs = targetAt - now;
  const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));

  const state =
    remainingMs <= 0
      ? 'landed'
      : remainingSec < 30
        ? 'danger'
        : remainingSec < 60
          ? 'warning'
          : 'normal';

  return (
    <div className={clsx(styles.wrap, styles[size], styles[state])}>
      <div className={styles.value}>
        {remainingMs <= 0 ? 'LANDED' : formatDuration(remainingSec)}
      </div>
      {label && <div className={styles.label}>{label}</div>}
    </div>
  );
}
