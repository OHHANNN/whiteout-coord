import { useEffect, useRef, useState } from 'react';
import styles from './PinInput.module.scss';

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
}

/**
 * 8 格獨立輸入的 PIN 輸入框（每格一個數字）。
 * 貼上完整 PIN 也支援。
 */
export function PinInput({
  length = 8,
  value,
  onChange,
  onComplete,
  autoFocus = true,
}: PinInputProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const chars = value.padEnd(length, '').split('').slice(0, length);

  useEffect(() => {
    if (autoFocus) {
      refs.current[0]?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const updateAt = (idx: number, ch: string) => {
    const next = chars.slice();
    next[idx] = ch;
    onChange(next.join('').replace(/\s+$/, ''));
  };

  const handleChange = (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      updateAt(idx, '');
      return;
    }

    // 貼上多位數：從 idx 開始往後填
    if (raw.length > 1) {
      const toFill = raw.slice(0, length - idx).split('');
      const next = chars.slice();
      toFill.forEach((c, i) => {
        next[idx + i] = c;
      });
      onChange(next.join('').replace(/\s+$/, ''));
      const lastIdx = Math.min(idx + toFill.length, length - 1);
      refs.current[lastIdx]?.focus();
      return;
    }

    updateAt(idx, raw);
    if (idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
      updateAt(idx - 1, '');
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      refs.current[idx + 1]?.focus();
    }
  };

  return (
    <div className={styles.wrap}>
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={chars[idx] || ''}
          onChange={handleChange(idx)}
          onKeyDown={handleKeyDown(idx)}
          onFocus={() => setFocusedIndex(idx)}
          className={`${styles.digit} ${focusedIndex === idx ? styles.active : ''} ${
            !chars[idx] ? styles.empty : ''
          }`}
          aria-label={`PIN digit ${idx + 1}`}
        />
      ))}
    </div>
  );
}
