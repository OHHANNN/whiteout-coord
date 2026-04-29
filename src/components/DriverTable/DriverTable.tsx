import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Zap } from 'lucide-react';

import {
  RowActionsMenu,
  type ActionItem,
} from '@/components/RowActionsMenu/RowActionsMenu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useNow } from '@/hooks/useServerTime';
import { useTimezone } from '@/hooks/useTimezone';
import { formatDuration, formatTimeInTz, parseMarchInput } from '@/lib/time';
import { cn } from '@/lib/utils';

import type { DriverView, Member, MemberStatus, RoomMeta } from '@/types/room';
import { getLaunchAtMs } from '@/types/room';

interface DriverTableProps {
  members: Record<string, Member>;
  meta: RoomMeta;
  myUid: string;
  onSetMarch: (uid: string, seconds: number) => void;
  onSetRally: (uid: string, seconds: number) => void;
  onSetOffset: (uid: string, seconds: number) => void;
  onSetType: (uid: string, type: 'driver' | 'passenger') => void;
  onSetCounterRally: (uid: string, value: boolean) => void;
  onRemove: (uid: string) => void;
  onTransferCommander?: (uid: string, name: string) => void;
  onEditManual?: (uid: string) => void;
  /** 自己改名 + 類型（重用 NamePrompt） */
  onRenameMe?: () => void;
  /** 房間目前是否處於「反集結模式」（任一人 counterRally === true）·
   *  非反集結 row 在 UI 上會降透明度提示「不參與當下作戰」 */
  hasCounterRally?: boolean;
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
      const launchAtMs = getLaunchAtMs(targetLandingAt, member);
      return { uid, member, launchAtMs, untilLaunchMs: launchAtMs };
    })
    .sort((a, b) => {
      // 自己永遠最上面，再依行軍長到短
      if ((a.uid === myUid) !== (b.uid === myUid)) {
        return a.uid === myUid ? -1 : 1;
      }
      return b.member.marchSeconds - a.member.marchSeconds;
    });
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
 * 行軍時間 cell：靜態顯示 or ± 控制 + mono input。
 */
function MarchCell({
  marchSeconds,
  editable,
  onSet,
}: {
  marchSeconds: number;
  editable: boolean;
  onSet: (seconds: number) => void;
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState(formatDuration(marchSeconds));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setInput(formatDuration(marchSeconds));
    }
  }, [marchSeconds]);

  if (!editable) {
    return <span className="mono-nums">{formatDuration(marchSeconds)}</span>;
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
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-7"
        onClick={() => onSet(marchSeconds - 1)}
        aria-label="decrease march"
      >
        <Minus />
      </Button>
      <input
        type="text"
        inputMode="numeric"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="MM:SS"
        title={t('room.march_input_hint')}
        className="border-input dark:bg-input/30 mono-nums text-foreground placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-ring/50 h-7 w-16 rounded-md border bg-transparent px-2 text-center text-xs shadow-xs outline-none focus-visible:ring-[3px]"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-7"
        onClick={() => onSet(marchSeconds + 1)}
        aria-label="increase march"
      >
        <Plus />
      </Button>
    </div>
  );
}

/**
 * 落地偏移 cell：靜態顯示 or ± 控制。
 */
function OffsetCell({
  offset,
  editable,
  onSet,
}: {
  offset: number;
  editable: boolean;
  onSet: (seconds: number) => void;
}) {
  const display = offset === 0 ? '0s' : offset > 0 ? `+${offset}s` : `${offset}s`;
  if (!editable) {
    return (
      <span
        className={cn(
          'mono-nums',
          offset !== 0 && 'text-warning font-medium'
        )}
      >
        {display}
      </span>
    );
  }
  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-7"
        onClick={() => onSet(offset - 1)}
        aria-label="decrease offset"
      >
        <Minus />
      </Button>
      <span
        className={cn(
          'mono-nums w-10 text-center text-xs',
          offset !== 0 ? 'text-warning font-medium' : 'text-muted-foreground'
        )}
      >
        {display}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-7"
        onClick={() => onSet(offset + 1)}
        aria-label="increase offset"
      >
        <Plus />
      </Button>
    </div>
  );
}

export function DriverTable({
  members,
  meta,
  myUid,
  onSetMarch,
  onSetRally,
  onSetOffset,
  onSetType,
  onSetCounterRally,
  onRemove,
  onTransferCommander,
  onEditManual,
  onRenameMe,
  hasCounterRally = false,
  canRemove,
  canEditOthers,
}: DriverTableProps) {
  const { t } = useTranslation();
  const now = useNow(1000);
  const [tz] = useTimezone();

  const rows = useMemo(
    () => buildView(members, meta.targetLandingAt, myUid),
    [members, meta.targetLandingAt, myUid]
  );

  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed py-12 text-center text-sm">
        {t('room.no_drivers_yet')}
      </div>
    );
  }

  // 共用 helper：依角色 + 狀態算出 ⋯ menu 動作清單
  const buildItems = (
    uid: string,
    member: Member,
    isMe: boolean,
    isCounterRally: boolean,
    canEditThisRow: boolean
  ): ActionItem[] => {
    const items: ActionItem[] = [];
    if (member.isManual) {
      if (canEditThisRow && onEditManual) {
        items.push({
          label: t('room.rename_driver'),
          icon: '✎',
          onSelect: () => onEditManual(uid),
        });
      }
      if (canEditThisRow) {
        items.push({
          label: isCounterRally
            ? t('room.unset_counter_rally')
            : t('room.set_counter_rally'),
          icon: '⚡',
          onSelect: () => onSetCounterRally(uid, !isCounterRally),
        });
      }
      if (canRemove) {
        items.push({
          label: t('room.confirm_remove_short'),
          icon: '×',
          variant: 'danger',
          onSelect: () => onRemove(uid),
        });
      }
      return items;
    }
    if (isMe && onRenameMe) {
      items.push({
        label: t('room.rename_self'),
        icon: '✎',
        onSelect: onRenameMe,
      });
    }
    if (canEditThisRow) {
      items.push({
        label: isCounterRally
          ? t('room.unset_counter_rally')
          : t('room.set_counter_rally'),
        icon: '⚡',
        onSelect: () => onSetCounterRally(uid, !isCounterRally),
      });
    }
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
    return items;
  };

  return (
    <>
      {/* === 桌機：shadcn Table === */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50 [&_tr]:border-b">
            <TableRow>
              <TableHead className="font-medium">{t('room.col_driver')}</TableHead>
              <TableHead className="font-medium">{t('room.col_march')}</TableHead>
              <TableHead className="font-medium">{t('room.col_rally')}</TableHead>
              <TableHead className="font-medium">{t('room.col_offset')}</TableHead>
              <TableHead className="font-medium">{t('room.col_launch')}</TableHead>
              <TableHead className="font-medium">
                {t('room.col_until_launch')}
              </TableHead>
              <TableHead className="font-medium">{t('room.col_status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ uid, member, launchAtMs }) => {
              const isMe = uid === myUid;
              const canEditThisRow = !meta.locked && (isMe || canEditOthers);
              const canEditThisMarch = canEditThisRow;
              const isCounterRally = member.counterRally === true;

              const untilLaunchMs = launchAtMs != null ? launchAtMs - now : null;
              const untilLaunchSec =
                untilLaunchMs != null
                  ? Math.max(0, Math.floor(untilLaunchMs / 1000))
                  : null;

              const untilLaunchClass =
                untilLaunchMs == null
                  ? 'text-muted-foreground'
                  : untilLaunchMs <= 0
                    ? 'text-success'
                    : untilLaunchSec! < 30
                      ? 'text-destructive animate-pulse font-semibold'
                      : untilLaunchSec! < 60
                        ? 'text-warning font-medium'
                        : 'text-foreground';

              // 反集結模式：非反集結 row 降透明度 → 視覺上提示「不參與當下作戰」
              const isPassive = hasCounterRally && !isCounterRally;
              const rowHighlight = isCounterRally
                ? 'bg-warning/10 border-l-4 border-l-warning'
                : isMe
                  ? 'bg-primary/5 border-l-4 border-l-primary'
                  : '';

              const items = buildItems(uid, member, isMe, isCounterRally, canEditThisRow);

            return (
              <TableRow key={uid} className={cn(rowHighlight, isPassive && 'opacity-50')}>
                {/* 車頭名稱 + chips */}
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="text-foreground max-w-[140px] truncate font-medium"
                      title={member.name}
                    >
                      {member.name}
                    </span>
                    {member.role === 'commander' && (
                      <Badge variant="secondary">{t('room.commander')}</Badge>
                    )}
                    {/* 反集結 tag（純標記、toggle 在 ⋯ menu） */}
                    {isCounterRally && (
                      <Badge
                        variant="outline"
                        className="border-warning text-warning"
                      >
                        <Zap />
                        {t('room.counter_rally')}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* 行軍 */}
                <TableCell>
                  <MarchCell
                    marchSeconds={member.marchSeconds}
                    editable={canEditThisMarch}
                    onSet={(s) => onSetMarch(uid, s)}
                  />
                </TableCell>

                {/* 集結 5m / 10m */}
                <TableCell>
                  {canEditThisMarch ? (
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      size="sm"
                      value={String(member.rallyWindowSeconds ?? 300)}
                      onValueChange={(v) => v && onSetRally(uid, Number(v))}
                    >
                      <ToggleGroupItem value="300" className="h-7 px-2 text-xs">
                        5m
                      </ToggleGroupItem>
                      <ToggleGroupItem value="600" className="h-7 px-2 text-xs">
                        10m
                      </ToggleGroupItem>
                    </ToggleGroup>
                  ) : (
                    <span className="mono-nums">
                      {(member.rallyWindowSeconds ?? 300) / 60}m
                    </span>
                  )}
                </TableCell>

                {/* 偏移 */}
                <TableCell>
                  <OffsetCell
                    offset={member.landingOffsetSeconds ?? 0}
                    editable={canEditThisMarch}
                    onSet={(s) => onSetOffset(uid, s)}
                  />
                </TableCell>

                {/* 發車 UTC */}
                <TableCell className="mono-nums text-foreground">
                  {launchAtMs ? formatTimeInTz(launchAtMs, tz) : '--:--:--'}
                </TableCell>

                {/* 距發車（自己列加大） */}
                <TableCell>
                  <span
                    className={cn(
                      'mono-nums',
                      isMe ? 'text-2xl font-bold tracking-tight' : 'text-base',
                      untilLaunchClass
                    )}
                  >
                    {untilLaunchSec == null
                      ? '--:--'
                      : untilLaunchMs! <= 0
                        ? 'LAUNCHED'
                        : formatDuration(untilLaunchSec)}
                  </span>
                </TableCell>

                {/* 狀態 + ⋯ 動作（⋯ 固定靠右、不受 status 寬度影響） */}
                <TableCell>
                  <div className="flex items-center justify-between gap-2">
                    {member.isManual ? (
                      <Badge variant="outline" className="border-dashed">
                        {t('room.manual_label')}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={cn(
                            'size-1.5 rounded-full',
                            statusDot(member.status)
                          )}
                        />
                        {t(`room.status_${member.status}`)}
                      </span>
                    )}
                    {items.length > 0 ? (
                      <RowActionsMenu items={items} />
                    ) : (
                      // 佔位讓 ⋯ 對齊（沒有動作可選的 row 也保持同寬）
                      <span className="size-8" aria-hidden />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>

    {/* === 手機：Card 列表 === */}
    <div className="md:hidden flex flex-col gap-3">
      {rows.map(({ uid, member, launchAtMs }) => {
        const isMe = uid === myUid;
        const canEditThisRow = !meta.locked && (isMe || canEditOthers);
        const canEditThisMarch = canEditThisRow;
        const isCounterRally = member.counterRally === true;

        const untilLaunchMs = launchAtMs != null ? launchAtMs - now : null;
        const untilLaunchSec =
          untilLaunchMs != null
            ? Math.max(0, Math.floor(untilLaunchMs / 1000))
            : null;

        const untilLaunchClass =
          untilLaunchMs == null
            ? 'text-muted-foreground'
            : untilLaunchMs <= 0
              ? 'text-success'
              : untilLaunchSec! < 30
                ? 'text-destructive animate-pulse font-semibold'
                : untilLaunchSec! < 60
                  ? 'text-warning font-medium'
                  : 'text-foreground';

        // self / counter-rally card 高亮：用 ring 不跟 card 既有 border 打架
        // ring 在 border 外側畫一圈、bg tint 提到 10%、dark / light 都明顯
        const cardHighlight = isCounterRally
          ? 'ring-2 ring-warning bg-warning/10'
          : isMe
            ? 'ring-2 ring-primary bg-primary/10'
            : '';
        // 反集結模式中、自己沒被標反集結 → 不參戰、降透明度
        const isPassive = hasCounterRally && !isCounterRally;

        const items = buildItems(uid, member, isMe, isCounterRally, canEditThisRow);

        return (
          <div
            key={uid}
            className={cn(
              'bg-card text-card-foreground flex flex-col gap-3 rounded-lg border p-4',
              cardHighlight,
              isPassive && 'opacity-50'
            )}
          >
            {/* 上方：名字 + chips + ⋯ */}
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
                <span
                  className="text-foreground truncate font-semibold"
                  title={member.name}
                >
                  {member.name}
                </span>
                {member.role === 'commander' && (
                  <Badge variant="secondary">{t('room.commander')}</Badge>
                )}
                {isCounterRally && (
                  <Badge
                    variant="outline"
                    className="border-warning text-warning"
                  >
                    <Zap />
                    {t('room.counter_rally')}
                  </Badge>
                )}
              </div>
              {items.length > 0 && <RowActionsMenu items={items} />}
            </div>

            {/* 中間：距發車。自己 row 大字、其他人縮小 */}
            <div
              className={cn(
                'flex flex-col items-center gap-1',
                isMe ? 'py-2' : 'py-1'
              )}
            >
              <span
                className={cn(
                  'mono-nums font-bold tracking-tight',
                  isMe ? 'text-3xl' : 'text-lg',
                  untilLaunchClass
                )}
              >
                {untilLaunchSec == null
                  ? '--:--'
                  : untilLaunchMs! <= 0
                    ? 'LAUNCHED'
                    : formatDuration(untilLaunchSec)}
              </span>
              <span className="text-muted-foreground text-[10px] tracking-widest uppercase">
                {t('room.col_until_launch')} ·{' '}
                {launchAtMs ? formatTimeInTz(launchAtMs, tz) : '--:--:--'}
              </span>
            </div>

            {/* 下方：行軍 / 集結 / 偏移 / 狀態 */}
            <div className="flex flex-col gap-2 border-t pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  {t('room.col_march')}
                </span>
                <MarchCell
                  marchSeconds={member.marchSeconds}
                  editable={canEditThisMarch}
                  onSet={(s) => onSetMarch(uid, s)}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  {t('room.col_rally')}
                </span>
                {canEditThisMarch ? (
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={String(member.rallyWindowSeconds ?? 300)}
                    onValueChange={(v) => v && onSetRally(uid, Number(v))}
                  >
                    <ToggleGroupItem value="300" className="h-7 px-3 text-xs">
                      5m
                    </ToggleGroupItem>
                    <ToggleGroupItem value="600" className="h-7 px-3 text-xs">
                      10m
                    </ToggleGroupItem>
                  </ToggleGroup>
                ) : (
                  <span className="mono-nums">
                    {(member.rallyWindowSeconds ?? 300) / 60}m
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  {t('room.col_offset')}
                </span>
                <OffsetCell
                  offset={member.landingOffsetSeconds ?? 0}
                  editable={canEditThisMarch}
                  onSet={(s) => onSetOffset(uid, s)}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  {t('room.col_status')}
                </span>
                {member.isManual ? (
                  <Badge variant="outline" className="border-dashed">
                    {t('room.manual_label')}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        statusDot(member.status)
                      )}
                    />
                    {t(`room.status_${member.status}`)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}
