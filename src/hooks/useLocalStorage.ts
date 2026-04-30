import { useCallback, useEffect, useState } from 'react';

/**
 * 同 tab 內 useLocalStorage 之間互相 broadcast 的 event 名稱。
 * 原生 'storage' event 只會在「別的分頁」改 localStorage 時觸發，
 * 同一個 tab 內的多個 hook 不會收到通知 → display 不會 reactive 更新。
 */
const LOCAL_BROADCAST_EVENT = 'whiteout-coord:local-storage';

interface BroadcastDetail {
  key: string;
  value: string | null;
}

/**
 * 簡單的 localStorage hook，符合 CLAUDE.md「不直接用 localStorage」的規範。
 *
 * - 讀寫用 JSON.stringify
 * - 跨 tab 同步：監聽原生 'storage' event
 * - 同 tab 同步：自訂 CustomEvent 通知所有同 key 的 hook 一起更新
 *   （這個是必要的，原生 storage event 只會跨 tab 不會跨 hook instance）
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const read = useCallback((): T => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? initialValue : (JSON.parse(raw) as T);
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const [value, setValue] = useState<T>(read);

  const setStoredValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      let toBroadcast: string | null = null;
      setValue((prev) => {
        const next =
          typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
        try {
          const serialized = JSON.stringify(next);
          window.localStorage.setItem(key, serialized);
          toBroadcast = serialized;
        } catch {
          // 忽略（私密模式等）
        }
        return next;
      });
      // 同 tab 廣播：dispatch 排到 microtask、不在 setValue updater 內
      // 否則同步觸發其他 useLocalStorage 的 setValue → React 抱怨
      // 「Cannot update component while rendering different component」
      if (toBroadcast !== null) {
        const payload = toBroadcast;
        queueMicrotask(() => {
          window.dispatchEvent(
            new CustomEvent<BroadcastDetail>(LOCAL_BROADCAST_EVENT, {
              detail: { key, value: payload },
            })
          );
        });
      }
    },
    [key]
  );

  // 跨 tab 同步：原生 storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        setValue(
          e.newValue === null ? initialValue : (JSON.parse(e.newValue) as T)
        );
      } catch {
        // 忽略 corrupted JSON
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, initialValue]);

  // 同 tab 同步：監聽自訂 broadcast event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<BroadcastDetail>).detail;
      if (!detail || detail.key !== key) return;
      try {
        setValue(
          detail.value === null
            ? initialValue
            : (JSON.parse(detail.value) as T)
        );
      } catch {
        // 忽略
      }
    };
    window.addEventListener(LOCAL_BROADCAST_EVENT, handler);
    return () => window.removeEventListener(LOCAL_BROADCAST_EVENT, handler);
  }, [key, initialValue]);

  return [value, setStoredValue];
}
