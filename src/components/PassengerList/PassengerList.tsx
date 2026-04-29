import { useTranslation } from 'react-i18next';

import {
  RowActionsMenu,
  type ActionItem,
} from '@/components/RowActionsMenu/RowActionsMenu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { Member, MemberStatus } from '@/types/room';

interface PassengerListProps {
  passengers: Record<string, Member>;
  myUid: string;
  canEditOthers: boolean;
  canRemove: boolean;
  onPromoteToDriver: (uid: string) => void;
  onRemove: (uid: string) => void;
  /** 自己改名 + 類型（重用 NamePrompt） */
  onRenameMe?: () => void;
}

function statusDot(status: MemberStatus) {
  switch (status) {
    case 'ready':
      return 'bg-success';
    case 'adjusting':
      return 'bg-warning';
    default:
      return 'bg-muted-foreground/40';
  }
}

/**
 * 車身列表 · 比車頭名單簡單很多。只顯示名字 + status + 升為車頭 / 踢除動作。
 */
export function PassengerList({
  passengers,
  myUid,
  canEditOthers,
  canRemove,
  onPromoteToDriver,
  onRemove,
  onRenameMe,
}: PassengerListProps) {
  const { t } = useTranslation();
  const list = Object.entries(passengers);

  if (list.length === 0) return null;

  return (
    <section className="border-t pt-4">
      <h3 className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
        {t('room.passenger_list')}
        <span className="text-muted-foreground text-xs font-normal">
          · {list.length} active
        </span>
      </h3>
      <ul className="flex flex-col gap-1">
        {list.map(([uid, m]) => {
          const isMe = uid === myUid;
          const items: ActionItem[] = [];
          if (isMe && onRenameMe) {
            items.push({
              label: t('room.rename_self'),
              icon: '✎',
              onSelect: onRenameMe,
            });
          }
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
            <li
              key={uid}
              className={cn(
                'flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm',
                isMe && 'border-primary/40 bg-primary/5'
              )}
            >
              <span className="text-foreground min-w-0 flex-1 truncate font-medium">
                {m.name}
              </span>
              {m.role === 'commander' && (
                <Badge variant="secondary">{t('room.commander')}</Badge>
              )}
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <span
                  className={cn('size-1.5 rounded-full', statusDot(m.status))}
                />
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
