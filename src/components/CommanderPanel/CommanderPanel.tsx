import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { Countdown } from '@/components/Countdown';
import { useNow } from '@/hooks/useServerTime';
import { formatUtcTime, parseUtcTimeOfDay } from '@/lib/time';

import type { RoomMeta } from '@/types/room';

import styles from './CommanderPanel.module.scss';

interface CommanderPanelProps {
  meta: RoomMeta;
  canEdit: boolean; // 只有指揮官可以編輯
  onUpdate: (patch: Partial<RoomMeta>) => void;
}

export function CommanderPanel({ meta, canEdit, onUpdate }: CommanderPanelProps) {
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

  return (
    <aside className={styles.panel}>
      <section>
        <div className={styles.title}>{t('room.target_landing')}</div>
        <div className={styles.controls}>
          <div className={styles.timeInputRow}>
            <input
              className={styles.timeInput}
              value={timeInput}
              placeholder="HH:MM:SS (UTC)"
              onChange={(e) => setTimeInput(e.target.value)}
              onBlur={() => commitTime(timeInput)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              disabled={!canEdit || meta.locked}
            />
            {meta.targetLandingAt != null && canEdit && !meta.locked && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => {
                  setTimeInput('');
                  onUpdate({ targetLandingAt: null });
                }}
                title="清除目標時間"
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
                disabled={!canEdit || meta.locked || meta.targetLandingAt == null}
                title="微調 ± 秒數"
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
                disabled={!canEdit || meta.locked}
                title="從現在起 N 分/時後落地"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className={styles.title}>{t('room.t_minus')}</div>
        <Countdown
          targetAt={meta.targetLandingAt}
          label={t('room.all_land_sim')}
          size="lg"
        />
        {meta.targetLandingAt != null && (
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
        )}
      </section>

      <section>
        <div className={styles.title}>{t('room.objective')}</div>
        <input
          className={styles.input}
          value={label}
          placeholder="王城城門 · MAIN GATE"
          onChange={(e) => setLabel(e.target.value)}
          onBlur={commitLabel}
          disabled={!canEdit || meta.locked}
          maxLength={40}
        />
        <div className={styles.coordRow}>
          <input
            className={styles.input}
            value={x}
            placeholder="X · 597"
            onChange={(e) => setX(e.target.value.replace(/\D/g, ''))}
            onBlur={commitCoord}
            disabled={!canEdit || meta.locked}
          />
          <input
            className={styles.input}
            value={y}
            placeholder="Y · 597"
            onChange={(e) => setY(e.target.value.replace(/\D/g, ''))}
            onBlur={commitCoord}
            disabled={!canEdit || meta.locked}
          />
        </div>
      </section>

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
