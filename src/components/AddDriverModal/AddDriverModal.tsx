import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDuration, parseMarchInput } from '@/lib/time';

import styles from './AddDriverModal.module.scss';

interface AddDriverModalProps {
  open: boolean;
  /** 編輯模式時帶入初始值（重命名 / 修改行軍時間共用同一個 modal） */
  initialName?: string;
  initialMarchSeconds?: number;
  /** modal 模式：'add' 顯示「新增車頭」，'edit' 顯示「編輯車頭」 */
  mode?: 'add' | 'edit';
  onClose: () => void;
  onSubmit: (name: string, marchSeconds: number) => Promise<void> | void;
}

/**
 * 指揮官代為新增 / 編輯 manual 車頭的 HUD 風 modal。
 * 表單只收名字 + 行軍時間，其他欄位留給 row 內 inline 編輯。
 */
export function AddDriverModal({
  open,
  initialName = '',
  initialMarchSeconds,
  mode = 'add',
  onClose,
  onSubmit,
}: AddDriverModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [marchInput, setMarchInput] = useState(
    initialMarchSeconds != null ? formatDuration(initialMarchSeconds) : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // ± 按鈕：以當前 input 解析出秒數、調整、再格式化回去；解析失敗就保持原樣
  const adjustMarch = (delta: number) => {
    const cur = parseMarchInput(marchInput);
    const base = cur != null ? cur : 0;
    const next = Math.max(0, Math.min(600, base + delta));
    setMarchInput(formatDuration(next));
  };

  // 每次開啟時 reset 表單到初始值
  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setMarchInput(
      initialMarchSeconds != null ? formatDuration(initialMarchSeconds) : ''
    );
    setError(null);
    setSubmitting(false);
    // 自動聚焦名字欄位
    const id = window.setTimeout(() => nameRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open, initialName, initialMarchSeconds]);

  // Esc 關閉
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('room.add_driver_err_name'));
      return;
    }
    if (trimmed.length > 20) {
      setError(t('room.add_driver_err_name_too_long'));
      return;
    }
    const seconds = parseMarchInput(marchInput);
    if (seconds == null || seconds < 0 || seconds > 600) {
      setError(t('room.add_driver_err_march'));
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(trimmed, seconds);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        className={styles.dialog}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <span className={styles.cornerTL} />
        <span className={styles.cornerTR} />
        <span className={styles.cornerBL} />
        <span className={styles.cornerBR} />

        <div className={styles.title}>
          {mode === 'edit' ? t('room.edit_driver') : t('room.add_driver')}
        </div>
        <div className={styles.hint}>{t('room.add_driver_hint')}</div>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="manual-name">
              {t('room.col_driver')}
            </label>
            <input
              id="manual-name"
              ref={nameRef}
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              placeholder={t('entry.name_placeholder')}
              autoComplete="off"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="manual-march">
              {t('room.col_march')}
            </label>
            {/* 對齊 row 內 inline 行軍輸入：± / 中央 mono 輸入 / ± */}
            <div className={styles.marchEdit}>
              <button
                type="button"
                className={styles.miniBtn}
                onClick={() => adjustMarch(-1)}
                aria-label="decrease"
              >
                −
              </button>
              <input
                id="manual-march"
                type="text"
                inputMode="numeric"
                className={styles.marchInput}
                value={marchInput}
                onChange={(e) => setMarchInput(e.target.value)}
                placeholder="MM:SS"
                title={t('room.march_input_hint')}
                autoComplete="off"
              />
              <button
                type="button"
                className={styles.miniBtn}
                onClick={() => adjustMarch(1)}
                aria-label="increase"
              >
                +
              </button>
            </div>
          </div>

          <div className={styles.error}>{error ?? ' '}</div>

          <div className={styles.buttons}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={submitting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {mode === 'edit' ? t('common.confirm') : t('room.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
