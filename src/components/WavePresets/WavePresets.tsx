import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useConfirm } from '@/components/ConfirmDialog/ConfirmDialog';
import { formatUtcTime } from '@/lib/time';

import type { RoomMeta, WavePreset } from '@/types/room';

import styles from './WavePresets.module.scss';

interface WavePresetsProps {
  meta: RoomMeta;
  canEdit: boolean;
  onSave: (name?: string) => void;
  onLoad: (presetId: string) => void;
  onDelete: (presetId: string) => void;
  onRename: (presetId: string, name: string) => void;
}

/**
 * 波次預設管理元件。
 * - commander：可看到所有 preset、可儲存當前 / 載入 / 刪除 / 重命名
 * - driver：完全不顯示（drivers 不需要管理 wave）
 *
 * 「載入」會把 preset 的 target 值寫到 meta.target*，所有人即時同步、解鎖。
 */
export function WavePresets({
  meta,
  canEdit,
  onSave,
  onLoad,
  onDelete,
  onRename,
}: WavePresetsProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const order = meta.wavePresetOrder ?? [];
  const presets: WavePreset[] = order
    .map((id) => meta.wavePresets?.[id])
    .filter((p): p is WavePreset => !!p);

  // 沒有任何 preset 又不是指揮官 → 完全不顯示這個 section
  if (!canEdit && presets.length === 0) return null;

  const isActive = (preset: WavePreset) => {
    return (
      preset.targetLandingAt === meta.targetLandingAt &&
      (preset.targetLabel ?? null) === (meta.targetLabel ?? null) &&
      (preset.targetX ?? null) === (meta.targetX ?? null) &&
      (preset.targetY ?? null) === (meta.targetY ?? null)
    );
  };

  const startEdit = (preset: WavePreset) => {
    setEditingId(preset.id);
    setEditName(preset.name ?? '');
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = async (preset: WavePreset) => {
    const name = preset.name ?? `Wave`;
    const ok = await confirm({
      message: t('room.confirm_delete_wave', { name }),
      variant: 'danger',
    });
    if (!ok) return;
    onDelete(preset.id);
  };

  return (
    <section className={styles.section}>
      <div className={styles.title}>{t('room.waves_label')}</div>
      <div className={styles.scrollWrap}>
        <div className={styles.list}>
        {presets.map((preset) => {
          const active = isActive(preset);
          const time = preset.targetLandingAt
            ? formatUtcTime(preset.targetLandingAt)
            : '--:--';
          if (editingId === preset.id && canEdit) {
            return (
              <div key={preset.id} className={styles.pill}>
                <input
                  className={styles.renameInput}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    else if (e.key === 'Escape') {
                      setEditingId(null);
                      setEditName('');
                    }
                  }}
                  maxLength={40}
                  autoFocus
                />
              </div>
            );
          }
          return (
            <div
              key={preset.id}
              className={`${styles.pill} ${active ? styles.pillActive : ''} ${
                !canEdit ? styles.pillReadonly : ''
              }`}
            >
              <button
                type="button"
                className={styles.pillBtn}
                onClick={canEdit ? () => onLoad(preset.id) : undefined}
                onDoubleClick={canEdit ? () => startEdit(preset) : undefined}
                title={
                  canEdit
                    ? t('room.load_wave_hint')
                    : active
                      ? t('room.current_wave')
                      : preset.name ?? 'Wave'
                }
                disabled={!canEdit}
              >
                {active && <span className={styles.dot} aria-hidden />}
                <span className={styles.pillName}>{preset.name ?? 'Wave'}</span>
                <span className={styles.pillTime}>{time}</span>
              </button>
              {canEdit && (
                <button
                  type="button"
                  className={styles.pillRemove}
                  onClick={() => handleDelete(preset)}
                  title={t('room.delete_wave_hint')}
                  aria-label="delete"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        </div>
      </div>
      {canEdit && (
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => onSave()}
          title={t('room.save_wave_hint')}
        >
          + {t('room.save_wave')}
        </button>
      )}
      {canEdit && presets.length > 0 && (
        <div className={styles.hint}>{t('room.wave_double_click_hint')}</div>
      )}
    </section>
  );
}
