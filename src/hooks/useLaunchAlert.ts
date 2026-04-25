import { useEffect, useRef } from 'react';

import { launchAlert } from '@/lib/audio';
import { logInfo } from '@/lib/logger';
import { getServerTime } from './useServerTime';

// 在發車前這些秒數時各嗶一聲（0 代表發車當下）
const ALERT_OFFSETS = [5, 3, 1, 0] as const;

/**
 * 當 `launchAtMs` 到來前觸發聲音提醒。
 * - enabled = false 時整組失效
 * - launchAtMs 變動時重置（避免指揮官改時間後重複播放）
 */
export function useLaunchAlert(
  launchAtMs: number | null | undefined,
  enabled: boolean
): void {
  const firedRef = useRef<Set<number>>(new Set());

  // 目標時間變動 → 重置紀錄
  useEffect(() => {
    firedRef.current = new Set();
  }, [launchAtMs]);

  useEffect(() => {
    if (!enabled || launchAtMs == null) return;

    const tick = () => {
      const now = getServerTime();
      const remainingMs = launchAtMs - now;
      // 過了 2 秒以上就不用再 alert（避免 offline 回來時一次爆音）
      if (remainingMs < -2000) return;

      const remainingSec = Math.round(remainingMs / 1000);
      for (const offset of ALERT_OFFSETS) {
        if (remainingSec === offset && !firedRef.current.has(offset)) {
          firedRef.current.add(offset);
          logInfo('launchAlert', `T-${offset}s · firing`);
          launchAlert(offset);
        }
      }
    };

    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [launchAtMs, enabled]);
}
