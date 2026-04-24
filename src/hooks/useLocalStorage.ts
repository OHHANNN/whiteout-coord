import { useCallback, useEffect, useState } from 'react';

/**
 * 簡單的 localStorage hook，符合 CLAUDE.md「不直接用 localStorage」的規範。
 * 讀寫用 JSON.stringify。
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
      setValue((prev) => {
        const next =
          typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // 忽略（私密模式等）
        }
        return next;
      });
    },
    [key]
  );

  // 其他分頁同步
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== key) return;
      setValue(e.newValue === null ? initialValue : (JSON.parse(e.newValue) as T));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, initialValue]);

  return [value, setStoredValue];
}
