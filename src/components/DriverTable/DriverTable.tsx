import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { RowActionsMenu, type ActionItem } from '@/components/RowActionsMenu/RowActionsMenu';
import { useNow } from '@/hooks/useServerTime';
import { formatDuration, formatUtcTime, parseMarchInput } from '@/lib/time';

import type { DriverView, Member, RoomMeta } from '@/types/room';
import { getLaunchAtMs } from '@/types/room';

import styles from './DriverTable.module.scss';

interface DriverTableProps {
  members: Record<string, Member>;
  meta: RoomMeta;
  myUid: string;
  onSetMarch: (uid: string, seconds: number) => void;
  onSetSuicide: (uid: string, value: boolean) => void;
  onSetRally: (uid: string, seconds: number) => void;
  onSetOffset: (uid: string, seconds: number) => void;
  onSetType: (uid: string, type: 'driver' | 'passenger') => void;
  onSetCounterRally: (uid: string, value: boolean) => void;
  onRemove: (uid: string) => void;
  onTransferCommander?: (uid: string, name: string) => void;
  canRemove: boolean;
  canEditOthers: boolean;
}

function buildView(
  members: Record<string, Member>,
  targetLandingAt: number | null,
  myUid: string
): DriverView[] {
  return Object.entries(members)
    .map(([uid, member]) => {
      // launch = target - march - rally_window
      const launchAtMs = getLaunchAtMs(targetLandingAt, member);
      return {
        uid,
        member,
        launchAtMs,
        untilLaunchMs: launchAtMs,
      };
    })
    .sort((a, b) => {
      // 自己永遠排在最上面（不會被首發 / 行軍排序蓋掉，最關鍵的「我的距發車」要一眼可見）
      if ((a.uid === myUid) !== (b.uid === myUid)) {
        return a.uid === myUid ? -1 : 1;
      }
      // Suicide 其次
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
  const { t } = useTranslation();
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
          title={t('room.march_input_hint')}
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
  onSetRally,
  onSetOffset,
  onSetType,
  onSetCounterRally,
  onRemove,
  onTransferCommander,
  canRemove,
  canEditOthers,
}: DriverTableProps) {
  const { t } = useTranslation();
  const now = useNow(1000);

  const rows = useMemo(
    () => buildView(members, meta.targetLandingAt, myUid),
    [members, meta.targetLandingAt, myUid]
  );

  return (
    <div className={styles.tableWrap}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th>{t('room.col_driver')}</th>
          <th>{t('room.col_march')}</th>
          <th>{t('room.col_rally')}</th>
          <th>{t('room.col_offset')}</th>
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

          const isCounterRally = member.counterRally === true;
          const canEditThisRow = !meta.locked && (isMe || canEditOthers);
          return (
            <tr
              key={uid}
              className={`${isMe ? styles.self : ''} ${
                isCounterRally ? styles.counterRally : ''
              }`}
            >
              <td data-label={t('room.col_driver')}>
                <div className={styles.driverInfo}>
                  <span className={styles.name} title={member.name}>
                    {member.name}
                  </span>
                  {member.role === 'commander' && (
                    <span className={styles.chip}>{t('room.commander')}</span>
                  )}
                {/* SUICIDE：可編輯時顯示 toggle button、不可編輯但已是首發車時顯示靜態 chip */}
                {canEditThisRow ? (
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
                  {/* 反集結：純標記顯示（在 ⋯ menu 裡切換） */}
                  {isCounterRally && (
                    <span className={styles.counterRallyTag}>
                      ⚡ {t('room.counter_rally')}
                    </span>
                  )}
                </div>
              </td>

              <MarchCell
                marchSeconds={member.marchSeconds}
                editable={canEditThisMarch}
                onSet={(s) => onSetMarch(uid, s)}
                label={t('room.col_march')}
              />

              <td className={styles.mono} data-label={t('room.col_rally')}>
                {canEditThisMarch ? (
                  <div className={styles.rallyToggle}>
                    {[300, 600].map((sec) => {
                      const cur = member.rallyWindowSeconds ?? 300;
                      return (
                        <button
                          key={sec}
                          type="button"
                          className={`${styles.rallyBtn} ${cur === sec ? styles.rallyBtnOn : ''}`}
                          onClick={() => onSetRally(uid, sec)}
                        >
                          {sec / 60}m
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  `${(member.rallyWindowSeconds ?? 300) / 60}m`
                )}
              </td>

              <td className={styles.mono} data-label={t('room.col_offset')}>
                {(() => {
                  const offset = member.landingOffsetSeconds ?? 0;
                  const display = offset === 0 ? '0s' : offset > 0 ? `+${offset}s` : `${offset}s`;
                  if (!canEditThisMarch) {
                    return <span className={offset !== 0 ? styles.offsetActive : ''}>{display}</span>;
                  }
                  return (
                    <div className={styles.offsetCtrl}>
                      <button
                        type="button"
                        className={styles.miniBtn}
                        onClick={() => onSetOffset(uid, offset - 1)}
                      >
                        −
                      </button>
                      <span className={offset !== 0 ? styles.offsetActive : styles.offsetVal}>
                        {display}
                      </span>
                      <button
                        type="button"
                        className={styles.miniBtn}
                        onClick={() => onSetOffset(uid, offset + 1)}
                      >
                        +
                      </button>
                    </div>
                  );
                })()}
              </td>

              <td
                className={`${styles.mono} ${styles.launch}`}
                data-label={t('room.col_launch')}
              >
                {launchAtMs ? formatUtcTime(launchAtMs) : '--:--:--'}
              </td>

              <td
                className={`${styles.mono} ${styles.untilCell} ${isMe ? styles.untilSelf : ''} ${untilLaunchClass}`}
                data-label={t('room.col_until_launch')}
              >
                {untilLaunchSec == null
                  ? '--:--'
                  : untilLaunchMs! <= 0
                    ? 'LAUNCHED'
                    : formatDuration(untilLaunchSec)}
              </td>

              <td data-label={t('room.col_status')}>
                <div className={styles.statusRow}>
                  <span className={`${styles.status} ${styles[member.status]}`}>
                    <span className={styles.dot} />
                    {t(`room.status_${member.status}`)}
                  </span>
                  {(() => {
                    const items: ActionItem[] = [];
                    // 自己 / commander 都可以切換 反集結 標記
                    if (canEditThisRow) {
                      items.push({
                        label: isCounterRally
                          ? t('room.unset_counter_rally')
                          : t('room.set_counter_rally'),
                        icon: '⚡',
                        onSelect: () => onSetCounterRally(uid, !isCounterRally),
                      });
                    }
                    // 自己 / commander 都可以把這位車頭降為車身
                    if (isMe || canEditOthers) {
                      items.push({
                        label: t('room.demote_to_passenger'),
                        icon: '↓',
                        onSelect: () => onSetType(uid, 'passenger'),
                      });
                    }
                    if (!isMe && onTransferCommander && member.role !== 'commander') {
                      items.push({
                        label: t('room.transfer_commander_title'),
                        icon: '→',
                        onSelect: () => onTransferCommander(uid, member.name),
                      });
                    }
                    if (!isMe && canRemove) {
                      items.push({
                        label: t('room.confirm_remove_short'),
                        icon: '×',
                        variant: 'danger',
                        onSelect: () => onRemove(uid),
                      });
                    }
                    return items.length > 0 ? <RowActionsMenu items={items} /> : null;
                  })()}
                </div>
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={7} className={styles.empty}>
              {t('room.no_drivers_yet')}
            </td>
          </tr>
        )}
      </tbody>
    </table>
    </div>
  );
}
