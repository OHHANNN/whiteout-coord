import { useEffect, useSyncExternalStore } from 'react';
import { onValue, ref } from 'firebase/database';

import { database } from '@/lib/firebase';
import { logInfo } from '@/lib/logger';

/**
 * Firebase 提供 /.info/serverTimeOffset，告訴我們使用者本機時間與伺服器時間的差距（毫秒）。
 * 我們全站時鐘都應該顯示 Date.now() + offset，才能跟車頭們對齊。
 */
let serverOffset = 0;
const listeners = new Set<() => void>();

// 應用啟動就訂閱一次 offset（不管有沒有 hook 被用）
export function initServerTimeSync() {
  const offsetRef = ref(database, '.info/serverTimeOffset');
  onValue(offsetRef, (snap) => {
    const next = snap.val() ?? 0;
    if (next !== serverOffset) {
      serverOffset = next;
      logInfo('server time offset', `${next}ms`);
      listeners.forEach((l) => l());
    }
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return serverOffset;
}

/**
 * 取得「校正後」的當前 UTC 時間（毫秒）。不會每 tick 都 re-render。
 * 使用時：const now = useNow(); 會每秒 re-render 一次。
 */
export function useServerOffset(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * 每 tickMs 毫秒 re-render 一次，回傳校正後的當前時間。
 */
export function useNow(tickMs = 1000): number {
  const offset = useServerOffset();
  const [, setTick] = useStateRender(tickMs);
  void setTick;
  return Date.now() + offset;
}

// 小 helper：每 tickMs 強制 re-render
import { useState } from 'react';
function useStateRender(tickMs: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return [tick, setTick] as const;
}

/**
 * 無 react 情境也可以取得校正後時間
 */
export function getServerTime(): number {
  return Date.now() + serverOffset;
}
