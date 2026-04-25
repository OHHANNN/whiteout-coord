import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { Countdown } from '@/components/Countdown';
import { WavePresets } from '@/components/WavePresets/WavePresets';
import { useNow } from '@/hooks/useServerTime';
import { formatTimeInput, formatUtcTime, parseUtcTimeOfDay } from '@/lib/time';

import type { RoomMeta } from '@/types/room';

import styles from './CommanderPanel.module.scss';

interface CommanderPanelProps {
  meta: RoomMeta;
  canEdit: boolean; // 只有指揮官可以編輯
  /** 當前使用者的「按下發車」時刻。車頭視角會把這個變成主要倒數。 */
  myLaunchAtMs?: number | null;
  onUpdate: (patch: Partial<RoomMeta>) => void;
  onSaveWave: (name?: string) => void;
  onLoadWave: (presetId: string) => void;
  onDeleteWave: (presetId: string) => void;
  onRenameWave: (presetId: string, name: string) => void;
}

export function CommanderPanel({
  meta,
  canEdit,
  myLaunchAtMs,
  onUpdate,
  onSaveWave,
  onLoadWave,
  onDeleteWave,
  onRenameWave,
}: CommanderPanelProps) {
  const { t } = useTranslation();
  const now = useNow(1000);

  // 本地 input 狀態（使用者 typing 時不要每次都寫進 Firebase）
  const [timeInput, setTimeInput] = useState('');
  const [label, setLabel] = useState(meta.targetLabel ?? '');
  const [x, setX] = useState(meta.targetX?.toString() ?? '');
  const [y, setY] = useState(meta.targetY?.toString() ?? '');

  // 當 meta 從 firebase 更新時，同步到 input（但不覆蓋正在 focus 的欄位）
  useEffect(() => {
    if (meta.targetLandingAt) {
      setTimeInput(formatUtcTime(meta.targetLandingAt).slice(0, 8));
    }
  }, [meta.targetLandingAt]);

  useEffect(() => {
    setLabel(meta.targetLabel ?? '');
  }, [meta.targetLabel]);

  useEffect(() => {
    setX(meta.targetX?.toString() ?? '');
  }, [meta.targetX]);

  useEffect(() => {
    setY(meta.targetY?.toString() ?? '');
  }, [meta.targetY]);

  const commitTime = (raw: string) => {
    const parsed = parseUtcTimeOfDay(raw, now);
    if (parsed) onUpdate({ targetLandingAt: parsed });
  };

  const nudgeTime = (deltaSec: number) => {
    if (meta.targetLandingAt == null) return;
    onUpdate({ targetLandingAt: meta.targetLandingAt + deltaSec * 1000 });
  };

  const setRelative = (deltaSec: number) => {
    if (meta.targetLandingAt != null) {
      // 已有目標 → 累加（保留現有秒數）
      onUpdate({ targetLandingAt: meta.targetLandingAt + deltaSec * 1000 });
      return;
    }
    // 沒有目標 → 從當下算、把秒數歸零（目標永遠 HH:MM:00 好看）
    const target = now + deltaSec * 1000;
    const rounded = Math.round(target / 60000) * 60000;
    onUpdate({ targetLandingAt: rounded });
  };

  const commitLabel = () => {
    if (label !== (meta.targetLabel ?? '')) {
      onUpdate({ targetLabel: label || null });
    }
  };

  const commitCoord = () => {
    const xNum = x ? Number(x) : null;
    const yNum = y ? Number(y) : null;
    onUpdate({
      targetX: Number.isFinite(xNum as number) ? xNum : null,
      targetY: Number.isFinite(yNum as number) ? yNum : null,
    });
  };

  const hasObjective = !!(meta.targetLabel || meta.targetX != null || meta.targetY != null);

  return (
    <aside className={styles.panel}>
      {/* === WAVES（多波預設）只有指揮官看得到 === */}
      <WavePresets
        meta={meta}
        canEdit={canEdit}
        onSave={onSaveWave}
        onLoad={onLoadWave}
        onDelete={onDeleteWave}
        onRename={onRenameWave}
      />

      {/* === TARGET section: 編輯控件只給指揮官、車頭看 read-only === */}
      {canEdit ? (
        <section>
          <div className={styles.title}>{t('room.target_landing')}</div>
          <div className={styles.controls}>
            <div className={styles.timeInputRow}>
              <input
                className={styles.timeInput}
                value={timeInput}
                placeholder="HH:MM:SS (UTC)"
                inputMode="numeric"
                maxLength={8}
                onChange={(e) => setTimeInput(formatTimeInput(e.target.value))}
                onBlur={() => commitTime(timeInput)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                disabled={meta.locked}
              />
              {meta.targetLandingAt != null && !meta.locked && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => {
                    setTimeInput('');
                    onUpdate({ targetLandingAt: null });
                  }}
                  title={t('room.clear_target')}
                  aria-label="clear target time"
                >
                  ×
                </button>
              )}
            </div>
            <div className={styles.btnRow}>
              {[-10, -1, 1, 10].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={styles.chip}
                  onClick={() => nudgeTime(d)}
                  disabled={meta.locked || meta.targetLandingAt == null}
                >
                  {d > 0 ? `+${d}s` : `${d}s`}
                </button>
              ))}
            </div>
            <div className={styles.btnRow}>
              {[
                { label: '+5m', sec: 5 * 60 },
                { label: '+10m', sec: 10 * 60 },
                { label: '+30m', sec: 30 * 60 },
                { label: '+1h', sec: 60 * 60 },
              ].map(({ label, sec }) => (
                <button
                  key={label}
                  type="button"
                  className={styles.chip}
                  onClick={() => setRelative(sec)}
                  disabled={meta.locked}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* === MY LAUNCH（車頭視角放大顯示自己的發車倒數） === */}
      {!canEdit && myLaunchAtMs != null && (
        <section>
          <div className={styles.title}>{t('room.my_launch')}</div>
          <Countdown
            targetAt={myLaunchAtMs}
            label={t('room.my_launch_hint')}
            size="xl"
          />
          <div className={styles.targetInfo}>
            @ {formatUtcTime(myLaunchAtMs)} UTC
          </div>
        </section>
      )}

      {/* === T-MINUS 落地倒數 === */}
      <section>
        <div className={styles.title}>{t('room.t_minus')}</div>
        <Countdown
          targetAt={meta.targetLandingAt}
          label={t('room.all_land_sim')}
          size={canEdit ? 'lg' : 'md'}
        />
        {meta.targetLandingAt != null ? (
          <div className={styles.targetInfo}>
            @ {formatUtcTime(meta.targetLandingAt)} UTC
            {meta.targetLandingAt - now > 24 * 3600 * 1000 && (
              <span className={styles.nextDay}>
                {' · '}
                {t('room.days_after', {
                  days:
                    Math.floor((meta.targetLandingAt - now) / (24 * 3600 * 1000)) + 1,
                })}
              </span>
            )}
          </div>
        ) : (
          !canEdit && (
            <div className={styles.targetInfo}>{t('room.waiting_target')}</div>
          )
        )}
      </section>

      {/* === OBJECTIVE: 指揮官可編輯、車頭只在有設定時顯示 read-only === */}
      {canEdit ? (
        <section>
          <div className={styles.title}>{t('room.objective')}</div>
          <input
            className={styles.input}
            value={label}
            placeholder="王城城門 · MAIN GATE"
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
            disabled={meta.locked}
            maxLength={40}
          />
          <div className={styles.coordRow}>
            <input
              className={styles.input}
              value={x}
              placeholder="X · 597"
              onChange={(e) => setX(e.target.value.replace(/\D/g, ''))}
              onBlur={commitCoord}
              disabled={meta.locked}
            />
            <input
              className={styles.input}
              value={y}
              placeholder="Y · 597"
              onChange={(e) => setY(e.target.value.replace(/\D/g, ''))}
              onBlur={commitCoord}
              disabled={meta.locked}
            />
          </div>
        </section>
      ) : (
        hasObjective && (
          <section>
            <div className={styles.title}>{t('room.objective')}</div>
            {meta.targetLabel && (
              <div className={styles.objectiveLabel}>{meta.targetLabel}</div>
            )}
            {meta.targetX != null && meta.targetY != null && (
              <div className={styles.coordReadonly}>
                X · {meta.targetX} &nbsp;·&nbsp; Y · {meta.targetY}
              </div>
            )}
          </section>
        )
      )}

      {canEdit && (
        <div className={styles.footer}>
          <Button
            variant={meta.locked ? 'danger' : 'primary'}
            block
            onClick={() => onUpdate({ locked: !meta.locked })}
          >
            {meta.locked ? t('room.unlock') : `▶ ${t('room.lock_and_start')}`}
          </Button>
        </div>
      )}
    </aside>
  );
}
