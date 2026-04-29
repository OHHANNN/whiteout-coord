import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Trash2 } from 'lucide-react';

import { useConfirm } from '@/components/ConfirmDialog/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTimezone } from '@/hooks/useTimezone';
import { formatDuration, formatTimeInTz } from '@/lib/time';
import { cn } from '@/lib/utils';

import type { BattleSnapshot, MemberStatus, RoomMeta } from '@/types/room';

interface BattleHistoryProps {
  meta: RoomMeta;
  canDelete: boolean;
  onDelete: (battleId: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function statusColor(status: MemberStatus) {
  switch (status) {
    case 'ready':
      return 'text-success';
    case 'adjusting':
      return 'text-warning';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * 已完成的戰報抽屜 · Sheet 從右側滑入。
 * 不會擠到主畫面，桌機 / 手機都能看完整。
 */
export function BattleHistory({
  meta,
  canDelete,
  onDelete,
  open,
  onOpenChange,
}: BattleHistoryProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [tz] = useTimezone();
  const [openBattleId, setOpenBattleId] = useState<string | null>(null);

  const order = meta.battleOrder ?? [];
  const battles: BattleSnapshot[] = [...order]
    .reverse()
    .map((id) => meta.battles?.[id])
    .filter((b): b is BattleSnapshot => !!b);

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            {t('room.battle_history')}
            <Badge variant="secondary" className="font-mono">
              {battles.length}
            </Badge>
          </SheetTitle>
          <SheetDescription>{t('room.battle_history_desc')}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {battles.length === 0 ? (
            <div className="text-muted-foreground p-8 text-center text-sm">
              {t('room.no_battles_yet')}
            </div>
          ) : (
            <div className="flex flex-col">
              {battles.map((battle) => {
                const isOpen = openBattleId === battle.id;
                const target = battle.targetLandingAt
                  ? formatTimeInTz(battle.targetLandingAt, tz)
                  : '--:--:--';
                const lockedAt = formatTimeInTz(battle.lockedAt, tz);
                const onlineCount = battle.drivers.filter(
                  (d) => d.status !== 'offline'
                ).length;

                return (
                  <div
                    key={battle.id}
                    className="not-first:border-t border-border"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenBattleId(isOpen ? null : battle.id)}
                      aria-expanded={isOpen}
                      className="hover:bg-accent flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mono-nums text-foreground font-medium">
                          → {target}
                        </span>
                        {battle.targetLabel && (
                          <span className="text-muted-foreground">
                            · {battle.targetLabel}
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
                        <span>
                          {t('room.battle_drivers', {
                            count: battle.drivers.length,
                            online: onlineCount,
                          })}
                        </span>
                        <span>
                          {t('room.battle_locked_at', { time: lockedAt })}
                        </span>
                        <ChevronRight
                          className={cn(
                            'size-4 transition-transform',
                            isOpen && 'rotate-90'
                          )}
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="bg-muted/30 border-t border-border p-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('room.col_driver')}</TableHead>
                              <TableHead>{t('room.col_march')}</TableHead>
                              <TableHead>{t('room.col_rally')}</TableHead>
                              <TableHead>{t('room.col_launch')}</TableHead>
                              <TableHead>{t('room.col_arrival')}</TableHead>
                              <TableHead>{t('room.col_status')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...battle.drivers]
                              .sort((a, b) => b.marchSeconds - a.marchSeconds)
                              .map((d) => {
                                const rally = d.rallyWindowSeconds ?? 300;
                                const arrival =
                                  d.arrivalAtMs ?? battle.targetLandingAt;
                                return (
                                  <TableRow key={d.uid}>
                                    <TableCell>
                                      <span className="text-foreground font-medium">
                                        {d.name}
                                      </span>
                                    </TableCell>
                                    <TableCell className="mono-nums">
                                      {formatDuration(d.marchSeconds)}
                                    </TableCell>
                                    <TableCell className="mono-nums">
                                      {rally / 60}m
                                    </TableCell>
                                    <TableCell className="mono-nums">
                                      {d.plannedLaunchAt
                                        ? formatTimeInTz(d.plannedLaunchAt, tz)
                                        : '--:--:--'}
                                    </TableCell>
                                    <TableCell className="mono-nums text-primary font-medium">
                                      {arrival
                                        ? formatTimeInTz(arrival, tz)
                                        : '--:--:--'}
                                    </TableCell>
                                    <TableCell
                                      className={cn(
                                        'text-xs',
                                        statusColor(d.status)
                                      )}
                                    >
                                      ● {t(`room.status_${d.status}`)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>

                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(battle)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 mt-3"
                          >
                            <Trash2 />
                            {t('room.delete_battle')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
