import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';

import { database } from '@/lib/firebase';
import { logInfo } from '@/lib/logger';

/**
 * 訂閱 Firebase /.info/connected。
 * 回傳 true 表示已連線、false 表示斷線中。
 * 初始值 true（樂觀，避免一進房就閃 banner）。
 */
export function useConnectionStatus(): boolean {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    const connectedRef = ref(database, '.info/connected');
    const unsub = onValue(connectedRef, (snap) => {
      const val = snap.val() === true;
      setConnected(val);
      logInfo('connection', val ? 'online' : 'offline');
    });
    return () => unsub();
  }, []);

  return connected;
}
