import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import styles from './ConfirmDialog.module.scss';

export interface ConfirmOptions {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

interface PendingState {
  options: ConfirmOptions;
  resolve: (v: boolean) => void;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * 全站 ConfirmProvider · 取代原生 window.confirm。
 * 提供 useConfirm hook，回傳一個 async 函式 → resolved 為使用者選擇的布林值。
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [state, setState] = useState<PendingState | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm: ConfirmFn = useCallback(
    (options) =>
      new Promise<boolean>((resolve) => {
        setState({ options, resolve });
      }),
    []
  );

  const respond = useCallback(
    (value: boolean) => {
      setState((s) => {
        s?.resolve(value);
        return null;
      });
    },
    []
  );

  // Esc 關閉 = 取消
  useEffect(() => {
    if (!state) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        respond(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, respond]);

  // dialog 出現時 focus 到確認按鈕
  useEffect(() => {
    if (state) {
      // setTimeout 讓 focus 落在 mount 之後
      const id = window.setTimeout(() => confirmBtnRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
    return;
  }, [state]);

  // 鎖定 body scroll
  useEffect(() => {
    if (!state) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [state]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state &&
        createPortal(
          <div
            className={styles.backdrop}
            onClick={() => respond(false)}
            role="presentation"
          >
            <div
              className={styles.dialog}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={state.options.title ?? state.options.message}
            >
              <div className={styles.cornerTL} />
              <div className={styles.cornerTR} />
              <div className={styles.cornerBL} />
              <div className={styles.cornerBR} />

              {state.options.title && (
                <div className={styles.title}>{state.options.title}</div>
              )}
              <div className={styles.message}>{state.options.message}</div>

              <div className={styles.buttons}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => respond(false)}
                >
                  {state.options.cancelText ?? t('common.cancel')}
                </button>
                <button
                  type="button"
                  ref={confirmBtnRef}
                  className={`${styles.confirmBtn} ${state.options.variant === 'danger' ? styles.danger : ''}`}
                  onClick={() => respond(true)}
                >
                  {state.options.confirmText ?? t('common.confirm')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return ctx;
}
