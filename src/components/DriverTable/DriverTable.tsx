import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNow } from '@/hooks/useServerTime';
import { formatDuration, formatUtcTime, parseMarchInput } from '@/lib/time';

import type { DriverView, Member, RoomMeta } from '@/types/room';

import styles from './DriverTable.module.scss';

interface DriverTableProps {
  members: Record<string, Member>;
  meta: RoomMeta;
  myUid: string;
  onSetMarch: (uid: string, seconds: number) => void;
  onSetSuicide: (uid: string, value: boolean) => void;
  onRemove: (uid: string) => void;
  onTransferCommander?: (uid: string, name: string) => void;
  canRemove: boolean;
  canEditOthers: boolean;
}

function buildView(
  members: Record<string, Member>,
  targetLandingAt: number | null
): DriverView[] {
  return Object.entries(members)
    .map(([uid, member]) => {
      const launchAtMs =
        targetLandingAt != null ? targetLandingAt - member.marchSeconds * 1000 : null;
      return {
        uid,
        member,
        launchAtMs,
        untilLaunchMs: launchAtMs,
      };
    })
    .sort((a, b) => {
      // Suicide 永遠排最上面
      if (a.member.isSuicide !== b.member.isSuicide) {
        return a.member.isSuicide ? -1 : 1;
      }
      return b.member.marchSeconds - a.member.marchSeconds;
    });
}

/**
 * 行軍時間 cell：靜態顯示 or 可編輯（± + 直接輸入）。
 * 每一列自己管 local input state，不會互相干擾。
 */
function MarchCell({
  marchSeconds,
  editable,
  onSet,
  label,
}: {
  marchSeconds: number;
  editable: boolean;
  onSet: (seconds: number) => void;
  label: string;
}) {
  const [input, setInput] = useState(formatDuration(marchSeconds));
  const focusedRef = useRef(false);

  // Firebase 上的值變動時同步到 input（但不覆蓋正在編輯的欄位）
  useEffect(() => {
    if (!focusedRef.current) {
      setInput(formatDuration(marchSeconds));
    }
  }, [marchSeconds]);

  if (!editable) {
    return (
      <td className={styles.mono} data-label={label}>
        {formatDuration(marchSeconds)}
      </td>
    );
  }

  const commit = () => {
    focusedRef.current = false;
    const parsed = parseMarchInput(input);
    if (parsed == null) {
      setInput(formatDuration(marchSeconds));
      return;
    }
    onSet(parsed);
  };

  return (
    <td className={styles.mono} data-label={label}>
      <div className={styles.marchEdit}>
        <button
          type="button"
          className={styles.miniBtn}
          onClick={() => onSet(marchSeconds - 1)}
          aria-label="decrease march"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          className={styles.marchInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="MM:SS"
          title="輸入行軍時間，例如 1:30 或 90"
        />
        <button
          type="button"
          className={styles.miniBtn}
          onClick={() => onSet(marchSeconds + 1)}
          aria-label="increase march"
        >
          +
        </button>
      </div>
    </td>
  );
}

export function DriverTable({
  members,
  meta,
  myUid,
  onSetMarch,
  onSetSuicide,
  onRemove,
  onTransferCommander,
  canRemove,
  canEditOthers,
}: DriverTableProps) {
  const { t } = useTranslation();
  const now = useNow(1000);

  const rows = useMemo(
    () => buildView(members, meta.targetLandingAt),
    [members, meta.targetLandingAt]
  );

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>{t('room.col_driver')}</th>
          <th>{t('room.col_march')}</th>
          <th>{t('room.col_launch')}</th>
          <th>{t('room.col_until_launch')}</th>
          <th>{t('room.col_status')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ uid, member, launchAtMs }) => {
          const isMe = uid === myUid;
          const canEditThisMarch = !meta.locked && (isMe || canEditOthers);
          const untilLaunchMs = launchAtMs != null ? launchAtMs - now : null;
          const untilLaunchSec =
            untilLaunchMs != null ? Math.max(0, Math.floor(untilLaunchMs / 1000)) : null;

          const untilLaunchClass =
            untilLaunchMs == null
              ? ''
              : untilLaunchMs <= 0
                ? styles.launched
                : untilLaunchSec! < 30
                  ? styles.danger
                  : untilLaunchSec! < 60
                    ? styles.warning
                    : '';

          return (
            <tr key={uid} className={isMe ? styles.self : ''}>
              <td data-label={t('room.col_driver')}>
                <span className={styles.name}>{member.name}</span>
                {member.role === 'commander' && (
                  <span className={styles.chip}>{t('room.commander')}</span>
                )}
                {/* SUICIDE：可編輯時顯示 toggle button、不可編輯但已是首發車時顯示靜態 chip */}
                {!meta.locked && (isMe || canEditOthers) ? (
                  <button
                    type="button"
                    className={`${styles.suicideBtn} ${
                      member.isSuicide ? styles.suicideBtnOn : ''
                    }`}
                    onClick={() => onSetSuicide(uid, !member.isSuicide)}
                    title={
                      member.isSuicide
                        ? t('room.unset_suicide')
                        : t('room.set_suicide')
                    }
                  >
                    {member.isSuicide ? '★ ' : '+ '}
                    {t('room.role_suicide')}
                  </button>
                ) : (
                  member.isSuicide && (
                    <span className={styles.suicide}>
                      {t('room.role_suicide')}
                    </span>
                  )
                )}
              </td>

              <MarchCell
                marchSeconds={member.marchSeconds}
                editable={canEditThisMarch}
                onSet={(s) => onSetMarch(uid, s)}
                label={t('room.col_march')}
              />

              <td
                className={`${styles.mono} ${styles.launch}`}
                data-label={t('room.col_launch')}
              >
                {launchAtMs ? formatUtcTime(launchAtMs) : '--:--:--'}
              </td>

              <td
                className={`${styles.mono} ${untilLaunchClass}`}
                data-label={t('room.col_until_launch')}
              >
                {untilLaunchSec == null
                  ? '--:--'
                  : untilLaunchMs! <= 0
                    ? 'LAUNCHED'
                    : formatDuration(untilLaunchSec)}
              </td>

              <td data-label={t('room.col_status')}>
                <span className={`${styles.status} ${styles[member.status]}`}>
                  <span className={styles.dot} />
                  {t(`room.status_${member.status}`)}
                </span>
                {onTransferCommander && !isMe && member.role !== 'commander' && (
                  <button
                    type="button"
                    className={styles.transferBtn}
                    onClick={() => onTransferCommander(uid, member.name)}
                    title={t('room.transfer_commander_title')}
                  >
                    → {t('room.commander')}
                  </button>
                )}
                {canRemove && !isMe && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => onRemove(uid)}
                    title="Remove"
                  >
                    ×
                  </button>
                )}
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={5} className={styles.empty}>
              No drivers yet · 尚無車頭
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
