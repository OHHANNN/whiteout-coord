import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';

import { auth } from '@/lib/firebase';
import { logError, logInfo } from '@/lib/logger';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

/**
 * 全自動匿名登入 hook。
 * - 初次掛載時若未登入會自動呼叫 signInAnonymously
 * - onAuthStateChanged 會即時反映使用者狀態
 * - 回傳 uid 供資料庫操作用（所有 room members 用 uid 當 key）
 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: auth.currentUser,
    loading: !auth.currentUser,
    error: null,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          logInfo('auth · signed in', user.uid);
          setState({ user, loading: false, error: null });
          return;
        }

        // 未登入：自動匿名登入
        try {
          const cred = await signInAnonymously(auth);
          logInfo('auth · anonymous signed in', cred.user.uid);
          setState({ user: cred.user, loading: false, error: null });
        } catch (err) {
          logError('auth · signInAnonymously failed', err);
          setState({
            user: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      },
      (err) => {
        logError('auth · onAuthStateChanged error', err);
        setState({ user: null, loading: false, error: err });
      }
    );

    return () => unsub();
  }, []);

  return state;
}
