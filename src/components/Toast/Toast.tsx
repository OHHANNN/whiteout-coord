import { useEffect } from 'react';
import styles from './Toast.module.scss';

interface ToastProps {
  message: string | null;
  onClose: () => void;
  duration?: number;
  variant?: 'success' | 'error' | 'info';
}

/**
 * 簡單 floating toast · 右上角彈出、自動消失
 */
export function Toast({
  message,
  onClose,
  duration = 2200,
  variant = 'success',
}: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(id);
  }, [message, duration, onClose]);

  if (!message) return null;
  return (
    <div className={`${styles.toast} ${styles[variant]}`} role="status">
      {message}
    </div>
  );
}
