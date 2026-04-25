import { useTranslation } from 'react-i18next';

import {
  RowActionsMenu,
  type ActionItem,
} from '@/components/RowActionsMenu/RowActionsMenu';

import type { Member } from '@/types/room';

import styles from './PassengerList.module.scss';

interface PassengerListProps {
  passengers: Record<string, Member>;
  myUid: string;
  canEditOthers: boolean;
  canRemove: boolean;
  /** 把這位 passenger 改成 driver（只能 commander 或自己） */
  onPromoteToDriver: (uid: string) => void;
  onRemove: (uid: string) => void;
}

/**
 * 車身列表 · 比車頭名單簡單很多，因為車身不需要 march / rally / launch 等資訊。
 * 只顯示名稱 + 狀態 + 動作選單（指揮官升為車頭、踢除等）。
 */
export function PassengerList({
  passengers,
  myUid,
  canEditOthers,
  canRemove,
  onPromoteToDriver,
  onRemove,
}: PassengerListProps) {
  const { t } = useTranslation();
  const list = Object.entries(passengers);

  if (list.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.title}>
        {t('room.passenger_list')}
        <span className={styles.count}>// {list.length} ACTIVE</span>
      </div>
      <ul className={styles.list}>
        {list.map(([uid, m]) => {
          const isMe = uid === myUid;
          const items: ActionItem[] = [];
          if (isMe || canEditOthers) {
            items.push({
              label: t('room.promote_to_driver'),
              icon: '↑',
              onSelect: () => onPromoteToDriver(uid),
            });
          }
          if (canRemove && !isMe) {
            items.push({
              label: t('room.confirm_remove_short'),
              icon: '×',
              variant: 'danger',
              onSelect: () => onRemove(uid),
            });
          }
          return (
            <li key={uid} className={`${styles.row} ${isMe ? styles.self : ''}`}>
              <span className={styles.name}>{m.name}</span>
              {m.role === 'commander' && (
                <span className={styles.chip}>{t('room.commander')}</span>
              )}
              <span className={`${styles.status} ${styles[m.status]}`}>
                <span className={styles.dot} />
                {t(`room.status_${m.status}`)}
              </span>
              {items.length > 0 && <RowActionsMenu items={items} />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
