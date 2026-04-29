import { useEffect, useRef } from 'react';

import { countdownBeep } from '@/lib/audio';
import { logInfo } from '@/lib/logger';
import { getServerTime } from './useServerTime';

// 在目標時刻前這些秒數時各嗶一聲（0 代表抵達當下）
const ALERT_OFFSETS = [5, 4, 3, 2, 1, 0] as const;

/**
 * 通用倒數提醒 hook：在 `targetAtMs` 到來前 5 秒每秒嗶一聲、T-0 為長音 + 震動。
 *
 * - enabled = false 時整組失效
 * - targetAtMs 變動時重置（避免指揮官改時間後重複播放）
 *
 * 用途：發車倒數（自己的 launch 時間）、抵達倒數（target landing + offset）等。
 */
export function useCountdownAlert(
  targetAtMs: number | null | undefined,
  enabled: boolean
): void {
  const firedRef = useRef<Set<number>>(new Set());

  // 目標時間變動 → 重置紀錄
  useEffect(() => {
    firedRef.current = new Set();
  }, [targetAtMs]);

  useEffect(() => {
    if (!enabled || targetAtMs == null) return;

    const tick = () => {
      const now = getServerTime();
      const remainingMs = targetAtMs - now;
      // 過了 2 秒以上就不用再 alert（避免 offline 回來時一次爆音）
      if (remainingMs < -2000) return;

      // 跟 Countdown 元件用 Math.round 一致對齊
      const remainingSec = Math.round(remainingMs / 1000);
      for (const offset of ALERT_OFFSETS) {
        if (remainingSec === offset && !firedRef.current.has(offset)) {
          firedRef.current.add(offset);
          logInfo('countdownAlert', `T-${offset}s · firing`);
          countdownBeep(offset);
        }
      }
    };

    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [targetAtMs, enabled]);
}
