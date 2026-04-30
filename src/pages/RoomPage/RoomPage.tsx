import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { History, Lock, Share2 } from 'lucide-react';

import { AddDriverModal } from '@/components/AddDriverModal/AddDriverModal';
import { BattleHistory } from '@/components/BattleHistory/BattleHistory';
import { CommanderPanel } from '@/components/CommanderPanel/CommanderPanel';
import { useConfirm } from '@/components/ConfirmDialog/ConfirmDialog';
import { DriverTable } from '@/components/DriverTable/DriverTable';
import { NamePrompt } from '@/components/NamePrompt/NamePrompt';
import { Onboarding } from '@/components/Onboarding/Onboarding';
import { SettingsMenu } from '@/components/SettingsMenu/SettingsMenu';
import { PassengerList } from '@/components/PassengerList/PassengerList';
import { UtcClock } from '@/components/UtcClock/UtcClock';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useCountdownAlert } from '@/hooks/useCountdownAlert';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useRoom } from '@/hooks/useRoom';
import { beep, unlockAudio } from '@/lib/audio';
import { cn } from '@/lib/utils';

import type { ParticipantType } from '@/types/room';

const PIN_REGEX = /^[0-9]{8}$/;
// session：把「名字」綁定到「特定 PIN」。進入不同 PIN 一定會跳 NamePrompt 確認。
// 離開 / 被踢時清空 session、其他路徑（直接改 URL、跨房間連結）也會被 PIN 不匹配條件擋下來。
const SESSION_KEY = 'whiteout-coord:session';
// 上次輸入過的名字寫在 'whiteout-coord:last-name'，由 EntryPage drawer 流程讀寫，RoomPage 不需要引用。
const TYPE_STORAGE_KEY = 'whiteout-coord:type';
const MUTE_STORAGE_KEY = 'whiteout-coord:muted';

interface RoomSession {
  pin: string;
  name: string;
}

export function RoomPage() {
  const { pin } = useParams<{ pin: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, error: authError } = useAuth();
  const confirm = useConfirm();
  const [session, setSession] = useLocalStorage<RoomSession | null>(
    SESSION_KEY,
    null
  );
  const [storedType, setStoredType] = useLocalStorage<ParticipantType>(
    TYPE_STORAGE_KEY,
    'driver'
  );

  // 只有當 session.pin 跟現在 URL 的 pin 一樣時才當「已確認名字」用
  // 任何 PIN 不匹配（直接改網址、跨房間分享、refresh 進不同 PIN）都會 fall through 到 NamePrompt
  const storedName = session && session.pin === pin ? session.name : '';
  const [muted, setMuted] = useLocalStorage<boolean>(MUTE_STORAGE_KEY, false);
  // null = 關閉；'add' = 開啟新增 modal；其他字串 = 編輯該 uid 的代管車頭
  const [driverModalState, setDriverModalState] = useState<'add' | string | null>(null);
  // 自己改名 + 角色切換用 NamePrompt
  const [renameMeOpen, setRenameMeOpen] = useState(false);
  // 戰報歷史 sheet（從右側滑入）
  const [battleHistoryOpen, setBattleHistoryOpen] = useState(false);
  // SettingsMenu 觸發的「重看教學 / 進階教學」forceRun
  const [tourReplay, setTourReplay] = useState<
    'commander' | 'driver' | 'advanced' | null
  >(null);

  const {
    loading,
    isCommander,
    meta,
    members,
    error: roomError,
    updateMeta,
    updateMyMember,
    updateMember,
    transferCommander,
    removeMember,
    leaveRoom,
    addManualMember,
    startBattle,
    deleteBattle,
  } = useRoom(pin, user?.uid, storedName, storedType);

  // 「rallying」中拆成兩組：車頭（driver）/ 車身（passenger）
  const rallyingMembers = useMemo(() => {
    const result: Record<string, typeof members[string]> = {};
    for (const [uid, m] of Object.entries(members)) {
      if (m.rallying !== false) result[uid] = m;
    }
    return result;
  }, [members]);

  const driverMembers = useMemo(() => {
    const result: Record<string, typeof members[string]> = {};
    for (const [uid, m] of Object.entries(rallyingMembers)) {
      if ((m.participantType ?? 'driver') === 'driver') result[uid] = m;
    }
    return result;
  }, [rallyingMembers]);

  const passengerMembers = useMemo(() => {
    const result: Record<string, typeof members[string]> = {};
    for (const [uid, m] of Object.entries(rallyingMembers)) {
      if ((m.participantType ?? 'driver') === 'passenger') result[uid] = m;
    }
    return result;
  }, [rallyingMembers]);

  const onlineCount = useMemo(
    () =>
      Object.values(rallyingMembers).filter((m) => m.status !== 'offline').length,
    [rallyingMembers]
  );
  const rallyingCount = Object.keys(rallyingMembers).length;

  // === 以下 hook 必須在所有 early return 之前呼叫（React rules of hooks）===
  const me = user?.uid ? members[user.uid] : null;
  const myLaunchAtMs =
    me && me.rallying !== false && meta?.targetLandingAt != null
      ? meta.targetLandingAt +
        (me.landingOffsetSeconds ?? 0) * 1000 -
        (me.marchSeconds + (me.rallyWindowSeconds ?? 300)) * 1000
      : null;
  // 自己的落地時間（含 offset），用於抵達倒數提醒
  const myArrivalAtMs =
    meta?.targetLandingAt != null
      ? meta.targetLandingAt + (me?.landingOffsetSeconds ?? 0) * 1000
      : null;
  // 反集結模式：當有人標為 counterRally 時，「不是反集結」的車頭不參加當下倒數
  // → 這個作戰是給反集結者的、其他人不需要 alert（他們可能在城內守城）
  const hasCounterRally = useMemo(
    () => Object.values(members).some((m) => m.counterRally === true),
    [members]
  );
  const iAmCounterRally = me?.counterRally === true;
  const alertEnabled = !muted && (!hasCounterRally || iAmCounterRally);

  useCountdownAlert(alertEnabled ? myLaunchAtMs : null, alertEnabled);
  // 抵達倒數提醒：跟 launch 至少差 10 秒才獨立 alert，避免 launch / arrival 過近時兩組嗶音重疊
  const launchArrivalGapMs =
    myLaunchAtMs != null && myArrivalAtMs != null
      ? myArrivalAtMs - myLaunchAtMs
      : null;
  const arrivalAlertTarget =
    launchArrivalGapMs == null || launchArrivalGapMs > 10_000
      ? myArrivalAtMs
      : null;
  useCountdownAlert(alertEnabled ? arrivalAlertTarget : null, alertEnabled);

  const pinInvalid = !pin || !PIN_REGEX.test(pin);
  useEffect(() => {
    if (pinInvalid) navigate('/', { replace: true });
  }, [pinInvalid, navigate]);

  // 偵測「我曾經是 member、現在不見了」= 被踢出 → 跳回進入頁
  // 加 grace period：Firebase reconnect 時 members 可能短暫變空、不能立刻判定被踢
  // 必須 members 連續「不包含自己」超過 1.5 秒才確認是真的被踢
  const wasMemberRef = useRef(false);
  const isLeavingRef = useRef(false);
  useEffect(() => {
    if (!user || !meta || isLeavingRef.current) return;
    if (members[user.uid]) {
      wasMemberRef.current = true;
      return;
    }
    if (!wasMemberRef.current) return;

    // 已經是 member 了卻消失 → 啟動 1.5s grace timer 確認真的被踢、不是 reconnect 抖動
    const confirmTimer = window.setTimeout(() => {
      setSession(null);
      toast.error(t('room.kicked'));
      window.setTimeout(() => navigate('/', { replace: true }), 1800);
    }, 1500);
    return () => window.clearTimeout(confirmTimer);
    // setStoredName 來自 useLocalStorage、會在 storage 變動時 re-create、加進 deps 會無限重跑 → 故意省略
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, user, meta, navigate, t]);

  // 自動清除：指揮官進房 3 秒後一次性檢查、清掉離線 > 5h 的車頭
  const cleanedRef = useRef(false);
  useEffect(() => {
    if (!isCommander || !meta || cleanedRef.current) return;

    const id = window.setTimeout(() => {
      if (cleanedRef.current) return;
      cleanedRef.current = true;

      const STALE_MS = 5 * 60 * 60 * 1000;
      const now = Date.now();
      const staleRealUids: string[] = [];

      Object.entries(members).forEach(([uid, m]) => {
        if (uid === meta.commanderId) return;
        if (m.isManual) return;
        if (m.status !== 'offline') return;
        if (!m.lastSeen) return;
        if (now - m.lastSeen > STALE_MS) staleRealUids.push(uid);
      });

      const toRemove: string[] = [...staleRealUids];

      const remainingNonCommanderReal = Object.entries(members).filter(
        ([uid, m]) =>
          uid !== meta.commanderId &&
          !m.isManual &&
          !staleRealUids.includes(uid)
      ).length;

      if (staleRealUids.length > 0 && remainingNonCommanderReal === 0) {
        Object.entries(members).forEach(([uid, m]) => {
          if (m.isManual) toRemove.push(uid);
        });
      }

      if (toRemove.length === 0) return;
      toRemove.forEach((uid) =>
        removeMember(uid).catch(() => {
          /* 寫入失敗不影響主流程，logger 會記 */
        })
      );
      toast.success(t('room.auto_cleaned', { count: toRemove.length }));
    }, 3000);

    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCommander, meta?.commanderId]);

  if (pinInvalid || !pin) return null;

  // 還沒取得名字（session 沒綁這個 PIN，例如直接打 URL 或剛被踢）
  // → 導回 EntryPage 並把 PIN 帶過去、由那邊的 drawer 流程處理
  if (!storedName) {
    return <Navigate to={`/?pin=${pin}`} replace />;
  }

  if (authError) {
    return (
      <ErrorScreen
        title={t('error.auth_failed')}
        detail={authError.message}
        actionLabel={`↻ ${t('error.retry')}`}
        onAction={() => window.location.reload()}
      />
    );
  }

  if (roomError) {
    return (
      <ErrorScreen
        title={t('error.room_load_failed')}
        detail={roomError.message}
        actionLabel={`← ${t('error.back_to_entry')}`}
        onAction={() => navigate('/')}
      />
    );
  }

  if (loading || !user) {
    return (
      <LoadingScreen
        text={t('room.loading')}
        backLabel={`← ${t('error.back_to_entry')}`}
        onBack={() => navigate('/', { replace: true })}
      />
    );
  }

  if (!meta) {
    return (
      <LoadingScreen
        text={t('room.initializing')}
        backLabel={`← ${t('error.back_to_entry')}`}
        onBack={() => navigate('/', { replace: true })}
      />
    );
  }

  const commanderName =
    Object.entries(members).find(([, m]) => m.role === 'commander')?.[1].name ?? '—';

  const handleLeave = async () => {
    const others = user?.uid
      ? Object.keys(members).filter((uid) => uid !== user.uid).length
      : 0;
    const isCommanderWithOthers = isCommander && others > 0;
    const ok = await confirm({
      message: isCommanderWithOthers
        ? t('room.confirm_leave_as_commander')
        : t('room.confirm_leave'),
      variant: isCommanderWithOthers ? 'danger' : 'default',
      confirmText: t('room.leave'),
    });
    if (!ok) return;

    isLeavingRef.current = true;
    try {
      await leaveRoom();
    } catch {
      /* 即使 Firebase 寫入失敗也讓使用者離開頁面、不要卡住 */
    }
    // 清掉當前 session、下次進房會再 prompt（lastUsedName 留著當預設值）
    setSession(null);
    navigate('/', { replace: true });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${import.meta.env.BASE_URL}room/${pin}`;
    const title = t('brand.title');
    const text = `${title} · PIN ${pin}`;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('room.copied'));
    } catch {
      toast.error(t('room.copy_failed'));
    }
  };

  const handleSetMarch = (targetUid: string, seconds: number) => {
    const next = Math.max(0, Math.min(600, Math.floor(seconds)));
    if (targetUid === user?.uid) {
      updateMyMember({ marchSeconds: next });
    } else if (isCommander) {
      updateMember(targetUid, { marchSeconds: next });
    }
  };

  const handleSetRally = (targetUid: string, seconds: number) => {
    const next = seconds === 600 ? 600 : 300;
    if (targetUid === user?.uid) {
      updateMyMember({ rallyWindowSeconds: next });
    } else if (isCommander) {
      updateMember(targetUid, { rallyWindowSeconds: next });
    }
  };

  const handleSetOffset = (targetUid: string, seconds: number) => {
    const next = Math.max(-60, Math.min(60, Math.round(seconds)));
    if (targetUid === user?.uid) {
      updateMyMember({ landingOffsetSeconds: next });
    } else if (isCommander) {
      updateMember(targetUid, { landingOffsetSeconds: next });
    }
  };

  const handleSetType = (targetUid: string, type: ParticipantType) => {
    if (targetUid === user?.uid) {
      setStoredType(type);
      updateMyMember({ participantType: type });
    } else if (isCommander) {
      updateMember(targetUid, { participantType: type });
    }
  };

  const handleSetCounterRally = (targetUid: string, value: boolean) => {
    if (targetUid === user?.uid) {
      updateMyMember({ counterRally: value });
    } else if (isCommander) {
      updateMember(targetUid, { counterRally: value });
    }
  };

  const handleSetTroopRatio = (
    targetUid: string,
    ratio: { shield: number; spear: number; archer: number }
  ) => {
    if (targetUid === user?.uid) {
      updateMyMember({ troopRatio: ratio });
    } else if (isCommander) {
      updateMember(targetUid, { troopRatio: ratio });
    }
  };

  const handleTransferCommander = async (targetUid: string, targetName: string) => {
    const ok = await confirm({
      message: t('room.confirm_transfer', { name: targetName }),
      confirmText: t('room.commander'),
    });
    if (!ok) return;
    transferCommander(targetUid).catch(() =>
      toast.error(t('error.transfer_failed'))
    );
  };

  const handleRemoveMember = async (targetUid: string) => {
    const member = members[targetUid];
    if (!member) return;
    const ok = await confirm({
      message: member.isManual
        ? t('room.confirm_remove_manual', { name: member.name })
        : t('room.confirm_remove', { name: member.name }),
      variant: 'danger',
    });
    if (!ok) return;
    removeMember(targetUid).catch(() =>
      toast.error(t('error.remove_failed'))
    );
  };

  // 代管車頭：新增 / 編輯共用 modal
  const editingManualMember =
    driverModalState && driverModalState !== 'add'
      ? members[driverModalState]
      : null;

  const handleSubmitManual = async (name: string, marchSeconds: number) => {
    if (driverModalState === 'add') {
      try {
        await addManualMember(name, marchSeconds);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        throw new Error(`${t('error.add_driver_failed')} · ${detail}`);
      }
    } else if (driverModalState && editingManualMember) {
      try {
        await updateMember(driverModalState, {
          name: name.slice(0, 20),
          marchSeconds: Math.max(0, Math.min(600, Math.floor(marchSeconds))),
        });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        throw new Error(`${t('error.rename_driver_failed')} · ${detail}`);
      }
    }
  };

  // 偵測指揮官是否離線過久 → 允許其他人接管
  const commanderMember = meta?.commanderId ? members[meta.commanderId] : null;
  const commanderAbsent = !!meta && !commanderMember;
  const commanderStale =
    !!commanderMember &&
    commanderMember.status === 'offline' &&
    Date.now() - (commanderMember.lastSeen ?? 0) > 90_000;
  const canClaimCommander = !!me && !isCommander && (commanderAbsent || commanderStale);

  const handleClaim = async () => {
    if (!user?.uid) return;
    const ok = await confirm({
      message: t('room.confirm_claim'),
      confirmText: t('room.claim_commander'),
    });
    if (!ok) return;
    transferCommander(user.uid).catch(() =>
      toast.error(t('error.transfer_failed'))
    );
  };

  const handleToggleMute = (next: boolean) => {
    setMuted(next);
    if (!next) {
      unlockAudio();
      window.setTimeout(() => beep(880, 0.18, 0.4), 120);
    }
  };
  const handlePageClick = () => {
    if (!muted) unlockAudio();
  };

  return (
    <div
      className="bg-background min-h-screen w-full"
      onClick={handlePageClick}
    >
      <AddDriverModal
        open={driverModalState !== null}
        mode={driverModalState === 'add' ? 'add' : 'edit'}
        initialName={editingManualMember?.name}
        initialMarchSeconds={editingManualMember?.marchSeconds}
        onClose={() => setDriverModalState(null)}
        onSubmit={handleSubmitManual}
      />

      {/* 自己改名 + 改類型 · 重用 NamePrompt */}
      {pin && me && (
        <NamePrompt
          open={renameMeOpen}
          onOpenChange={setRenameMeOpen}
          pin={pin}
          initialName={me.name}
          initialType={me.participantType ?? 'driver'}
          onSubmit={(name, type) => {
            updateMyMember({ name, participantType: type });
            setSession({ pin, name });
            setRenameMeOpen(false);
          }}
        />
      )}

      {/* sticky header */}
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 w-full border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          {/* PIN badge */}
          <div data-tour="pin-badge" className="flex items-center gap-2">
            <span className="bg-success size-2 animate-pulse rounded-full" />
            <span className="text-foreground mono-nums text-sm font-semibold tracking-wider">
              {pin.slice(0, 4)}·{pin.slice(4)}
            </span>
          </div>

          <Separator orientation="vertical" className="hidden sm:block h-6" />

          {/* commander info */}
          <div className="text-muted-foreground hidden min-w-0 flex-1 items-center gap-3 text-xs sm:flex">
            <span className="truncate">
              <span className="mr-2">{t('room.commander')}</span>
              <span
                className={cn(
                  'text-foreground font-medium',
                  (commanderAbsent || commanderStale) && 'text-warning'
                )}
              >
                {commanderAbsent ? t('room.commander_left') : commanderName}
              </span>
              {commanderStale && (
                <span className="text-warning"> · {t('room.commander_offline')}</span>
              )}
            </span>
            <span className="whitespace-nowrap">
              {t('room.drivers_online', {
                count: rallyingCount,
                online: onlineCount,
              })}
            </span>
            {meta.locked && (
              <Badge variant="outline" className="border-warning text-warning">
                <Lock className="size-3" />
                LOCKED
              </Badge>
            )}
            {canClaimCommander && (
              <Button size="sm" onClick={handleClaim}>
                {t('room.claim_commander')}
              </Button>
            )}
          </div>

          {/* fill spacer on mobile */}
          <div className="flex-1 sm:hidden" />

          {/* right: clock + share + settings */}
          <div className="flex items-center gap-1">
            <UtcClock size="sm" showLabel={false} />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              aria-label={t('room.share_pin')}
              title={t('room.share_pin')}
            >
              <Share2 />
            </Button>
            <SettingsMenu
              muted={muted}
              onToggleMute={handleToggleMute}
              onLeave={handleLeave}
              onReplayTour={() =>
                setTourReplay(isCommander ? 'commander' : 'driver')
              }
              onAdvancedTour={() => setTourReplay('advanced')}
            />
          </div>
        </div>

        {/* mobile commander info row */}
        <div className="text-muted-foreground flex items-center gap-3 px-4 pb-2 text-xs sm:hidden">
          <span>
            <span className="mr-2">{t('room.commander')}</span>
            <span
              className={cn(
                'text-foreground font-medium',
                (commanderAbsent || commanderStale) && 'text-warning'
              )}
            >
              {commanderAbsent ? t('room.commander_left') : commanderName}
            </span>
          </span>
          <span>
            {t('room.drivers_online', {
              count: rallyingCount,
              online: onlineCount,
            })}
          </span>
          {meta.locked && (
            <Badge variant="outline" className="border-warning text-warning">
              <Lock className="size-3" />
              LOCKED
            </Badge>
          )}
        </div>
      </header>

      {/* body */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <CommanderPanel
            meta={meta}
            canEdit={isCommander}
            myArrivalAtMs={myArrivalAtMs}
            onUpdate={(patch) => {
              if (patch.locked === true && !meta.locked) {
                startBattle().catch(() =>
                  toast.error(t('error.start_battle_failed'))
                );
                return;
              }
              updateMeta(patch);
            }}
          />

          <section className="flex min-w-0 flex-col gap-4">
            {/* toolbar — 用 Card 樣式跟左欄對齊 */}
            <div className="bg-card text-card-foreground flex flex-wrap items-center justify-between gap-3 rounded-xl border px-6 py-5 shadow-sm">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-semibold">{t('room.driver_list')}</h2>
                <span className="text-muted-foreground text-sm">
                  · {rallyingCount} active
                </span>
              </div>
              <div className="flex items-center gap-3">
                {(meta.battleOrder?.length ?? 0) > 0 && (
                  <Button
                    data-tour="battle-history"
                    variant="outline"
                    size="sm"
                    onClick={() => setBattleHistoryOpen(true)}
                    title={t('room.battle_history')}
                  >
                    <History />
                    {t('room.battle_history')}
                    <span className="text-muted-foreground mono-nums ml-1">
                      {meta.battleOrder?.length ?? 0}
                    </span>
                  </Button>
                )}
                {me && !meta.locked && isCommander && (
                  <>
                    <Button
                      data-tour="add-driver"
                      variant="outline"
                      size="sm"
                      onClick={() => setDriverModalState('add')}
                      title={t('room.add_driver_hint')}
                    >
                      {t('room.add_driver_btn')}
                    </Button>
                    <div
                      data-tour="rallying-checkbox"
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        id="rallying"
                        checked={me.rallying !== false}
                        onCheckedChange={(c) =>
                          updateMyMember({ rallying: c !== false })
                        }
                      />
                      <Label
                        htmlFor="rallying"
                        className="text-sm font-normal cursor-pointer"
                        title={t('room.rallying_hint')}
                      >
                        {t('room.rallying_check')}
                      </Label>
                    </div>
                  </>
                )}
              </div>
            </div>

            {me?.rallying === false && (
              <div className="border-primary/30 bg-primary/5 text-muted-foreground rounded-md border border-dashed p-3 text-center text-sm">
                <span className="text-foreground font-medium">
                  {t('room.coordinator_only')}
                </span>{' '}
                · {t('room.coordinator_desc')}
              </div>
            )}

            {/* 反集結模式提示（任一人 counterRally === true）*/}
            {hasCounterRally && (
              <div className="border-warning/40 bg-warning/10 text-muted-foreground rounded-md border border-dashed p-3 text-center text-sm">
                <span className="text-warning font-medium">
                  {t('room.counter_rally_mode')}
                </span>{' '}
                ·{' '}
                {iAmCounterRally
                  ? t('room.counter_rally_active_self')
                  : t('room.counter_rally_passive_self')}
              </div>
            )}

            <DriverTable
              members={driverMembers}
              meta={meta}
              myUid={user.uid}
              onSetMarch={handleSetMarch}
              onSetRally={handleSetRally}
              onSetOffset={handleSetOffset}
              onSetType={handleSetType}
              onSetCounterRally={handleSetCounterRally}
              onSetTroopRatio={handleSetTroopRatio}
              onRemove={handleRemoveMember}
              onTransferCommander={
                isCommander ? handleTransferCommander : undefined
              }
              onEditManual={
                isCommander ? (uid) => setDriverModalState(uid) : undefined
              }
              onRenameMe={() => setRenameMeOpen(true)}
              hasCounterRally={hasCounterRally}
              canRemove={isCommander}
              canEditOthers={isCommander}
            />

            <PassengerList
              passengers={passengerMembers}
              myUid={user.uid}
              canEditOthers={isCommander}
              canRemove={isCommander}
              onPromoteToDriver={(uid) => handleSetType(uid, 'driver')}
              onRemove={handleRemoveMember}
              onRenameMe={() => setRenameMeOpen(true)}
            />

            {meta.locked && (
              <div className="border-warning bg-warning/10 text-warning rounded-md border p-3 text-center text-sm">
                {t('room.locked_banner')}
              </div>
            )}
          </section>
        </div>
      </main>

      <BattleHistory
        meta={meta}
        canDelete={isCommander}
        onDelete={(id) =>
          deleteBattle(id).catch(() =>
            toast.error(t('error.delete_battle_failed'))
          )
        }
        open={battleHistoryOpen}
        onOpenChange={setBattleHistoryOpen}
      />

      {/* Onboarding · 第一次進房自動跳對應 tour、之後可從 settings 重看 */}
      {tourReplay ? (
        <Onboarding
          key={tourReplay}
          tour={tourReplay}
          forceRun
          onForceFinish={() => setTourReplay(null)}
        />
      ) : (
        <Onboarding tour={isCommander ? 'commander' : 'driver'} />
      )}
    </div>
  );
}

// === Helper components for loading / error screens ===

function LoadingScreen({
  text,
  backLabel,
  onBack,
}: {
  text: string;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="text-muted-foreground text-sm tracking-widest uppercase animate-pulse">
        {text}
      </div>
      <Button variant="outline" size="sm" onClick={onBack}>
        {backLabel}
      </Button>
    </div>
  );
}

function ErrorScreen({
  title,
  detail,
  actionLabel,
  onAction,
}: {
  title: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="border-destructive bg-card flex w-full max-w-md flex-col gap-4 rounded-lg border p-6 text-center">
        <h1 className="text-destructive text-base font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm break-words">{detail}</p>
        <Button onClick={onAction}>{actionLabel}</Button>
      </div>
    </div>
  );
}
