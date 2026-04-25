import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useConfirm } from '@/components/ConfirmDialog/ConfirmDialog';
import { formatDuration, formatUtcTime } from '@/lib/time';

import type { BattleSnapshot, RoomMeta } from '@/types/room';

import styles from './BattleHistory.module.scss';

interface BattleHistoryProps {
  meta: RoomMeta;
  canDelete: boolean;
  onDelete: (battleId: string) => void;
}

/**
 * 房間內已完成的戰報列表。
 * - 預設摺疊（避免佔螢幕）
 * - 點 header 展開、列出每筆戰報的概要
 * - 點某筆 → 展開看完整車頭名單
 */
export function BattleHistory({ meta, canDelete, onDelete }: BattleHistoryProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [expanded, setExpanded] = useState(false);
  const [openBattleId, setOpenBattleId] = useState<string | null>(null);

  const order = meta.battleOrder ?? [];
  const battles: BattleSnapshot[] = [...order]
    .reverse() // 最新的在最上面
    .map((id) => meta.battles?.[id])
    .filter((b): b is BattleSnapshot => !!b);

  if (battles.length === 0) return null;

  const handleDelete = async (battle: BattleSnapshot) => {
    const ok = await confirm({
      message: t('room.confirm_delete_battle'),
      variant: 'danger',
    });
    if (!ok) return;
    onDelete(battle.id);
    if (openBattleId === battle.id) setOpenBattleId(null);
  };

  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className={styles.headerTitle}>
          ▌ {t('room.battle_history')}
          <span className={styles.count}>// {battles.length}</span>
        </span>
        <span className={styles.chevron}>{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className={styles.list}>
          {battles.map((battle) => {
            const isOpen = openBattleId === battle.id;
            const target = battle.targetLandingAt
              ? formatUtcTime(battle.targetLandingAt)
              : '--:--:--';
            const lockedAt = formatUtcTime(battle.lockedAt);
            const onlineCount = battle.drivers.filter(
              (d) => d.status !== 'offline'
            ).length;

            return (
              <div key={battle.id} className={styles.item}>
                <button
                  type="button"
                  className={styles.itemHeader}
                  onClick={() => setOpenBattleId(isOpen ? null : battle.id)}
                  aria-expanded={isOpen}
                >
                  <div className={styles.itemMeta}>
                    <span
                      className={`${styles.waveTag} ${!battle.waveName ? styles.waveTagEmpty : ''}`}
                    >
                      {battle.waveName ?? t('room.battle_no_wave')}
                    </span>
                    <span className={styles.itemTarget}>
                      → {target}
                      {battle.targetLabel && (
                        <span className={styles.itemLabel}>
                          {' · '}
                          {battle.targetLabel}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className={styles.itemRight}>
                    <span className={styles.itemDrivers}>
                      {t('room.battle_drivers', {
                        count: battle.drivers.length,
                        online: onlineCount,
                      })}
                    </span>
                    <span className={styles.itemLocked}>
                      {t('room.battle_locked_at', { time: lockedAt })}
                    </span>
                    <span className={styles.chevron}>{isOpen ? '▾' : '▸'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className={styles.detail}>
                    <table className={styles.driverTable}>
                      <thead>
                        <tr>
                          <th>{t('room.col_driver')}</th>
                          <th>{t('room.col_march')}</th>
                          <th>{t('room.col_launch')}</th>
                          <th>{t('room.col_status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...battle.drivers]
                          .sort((a, b) => {
                            if (a.isSuicide !== b.isSuicide) {
                              return a.isSuicide ? -1 : 1;
                            }
                            return b.marchSeconds - a.marchSeconds;
                          })
                          .map((d) => (
                            <tr key={d.uid}>
                              <td>
                                <span className={styles.driverName}>{d.name}</span>
                                {d.isSuicide && (
                                  <span className={styles.suicide}>SUICIDE</span>
                                )}
                              </td>
                              <td className={styles.mono}>
                                {formatDuration(d.marchSeconds)}
                              </td>
                              <td className={styles.mono}>
                                {d.plannedLaunchAt
                                  ? formatUtcTime(d.plannedLaunchAt)
                                  : '--:--:--'}
                              </td>
                              <td>
                                <span
                                  className={`${styles.status} ${styles[d.status]}`}
                                >
                                  ●{' '}
                                  {t(`room.status_${d.status}`)}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>

                    {canDelete && (
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(battle)}
                      >
                        × {t('room.delete_battle')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
