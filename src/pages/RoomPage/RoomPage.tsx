import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { AddDriverModal } from '@/components/AddDriverModal/AddDriverModal';
import { BattleHistory } from '@/components/BattleHistory/BattleHistory';
import { Button } from '@/components/Button/Button';
import { CommanderPanel } from '@/components/CommanderPanel/CommanderPanel';
import { useConfirm } from '@/components/ConfirmDialog/ConfirmDialog';
import { DriverTable } from '@/components/DriverTable/DriverTable';
import { PassengerList } from '@/components/PassengerList/PassengerList';
import { LangSwitch } from '@/components/LangSwitch/LangSwitch';
import { MuteToggle } from '@/components/MuteToggle/MuteToggle';
import { NamePrompt } from '@/components/NamePrompt/NamePrompt';
import { Panel } from '@/components/Panel/Panel';
import { Toast } from '@/components/Toast/Toast';
import { UtcClock } from '@/components/UtcClock/UtcClock';

import { useAuth } from '@/hooks/useAuth';
import { useLaunchAlert } from '@/hooks/useLaunchAlert';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useRoom } from '@/hooks/useRoom';
import { beep, unlockAudio } from '@/lib/audio';

import styles from './RoomPage.module.scss';

import type { ParticipantType } from '@/types/room';

const PIN_REGEX = /^[0-9]{8}$/;
const NAME_STORAGE_KEY = 'whiteout-coord:name';
const TYPE_STORAGE_KEY = 'whiteout-coord:type';
const MUTE_STORAGE_KEY = 'whiteout-coord:muted';

export function RoomPage() {
  const { pin } = useParams<{ pin: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, error: authError } = useAuth();
  const confirm = useConfirm();
  const [storedName, setStoredName] = useLocalStorage<string>(NAME_STORAGE_KEY, '');
  const [storedType, setStoredType] = useLocalStorage<ParticipantType>(
    TYPE_STORAGE_KEY,
    'driver'
  );
  const [muted, setMuted] = useLocalStorage<boolean>(MUTE_STORAGE_KEY, false);
  const [toast, setToast] = useState<{ msg: string; variant: 'success' | 'error' } | null>(null);
  // null = 關閉；'add' = 開啟新增 modal；其他字串 = 編輯該 uid 的代管車頭
  const [driverModalState, setDriverModalState] = useState<'add' | string | null>(null);

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
    saveCurrentWave,
    loadWave,
    deleteWave,
    renameWave,
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
  // 發車 = 目標落地 + 偏移 − 行軍 − 集結
  const myLaunchAtMs =
    me && me.rallying !== false && meta?.targetLandingAt != null
      ? meta.targetLandingAt +
        (me.landingOffsetSeconds ?? 0) * 1000 -
        (me.marchSeconds + (me.rallyWindowSeconds ?? 300)) * 1000
      : null;
  useLaunchAlert(myLaunchAtMs, !muted);

  // 非法 PIN → navigate 到進入頁（side-effect 必須在 useEffect 裡，不能在 render 中）
  const pinInvalid = !pin || !PIN_REGEX.test(pin);
  useEffect(() => {
    if (pinInvalid) navigate('/', { replace: true });
  }, [pinInvalid, navigate]);

  // 偵測「我曾經是 member、現在不見了」= 被踢出 → 跳回進入頁
  // wasMemberRef：曾經在房內、即使被踢出後仍為 true
  // isLeavingRef：自己主動離開（按「離開」按鈕）→ 跳過踢出偵測
  const wasMemberRef = useRef(false);
  const isLeavingRef = useRef(false);
  useEffect(() => {
    if (!user || !meta || isLeavingRef.current) return;
    if (members[user.uid]) {
      wasMemberRef.current = true;
      return;
    }
    if (wasMemberRef.current) {
      // 我曾經在、現在不見 → 被指揮官踢
      setToast({ msg: t('room.kicked'), variant: 'error' });
      const id = window.setTimeout(() => navigate('/', { replace: true }), 1800);
      return () => window.clearTimeout(id);
    }
    return;
  }, [members, user, meta, navigate, t]);

  // 自動清除：指揮官進房 3 秒後一次性檢查、踢掉離線 > 24h 的車頭
  // 用 ref 避免 members 變動時無限重跑
  const cleanedRef = useRef(false);
  useEffect(() => {
    if (!isCommander || !meta || cleanedRef.current) return;

    const id = window.setTimeout(() => {
      if (cleanedRef.current) return;
      cleanedRef.current = true;

      const STALE_MS = 5 * 60 * 60 * 1000; // 5 小時（對齊決戰王城活動長度）
      const now = Date.now();
      const staleRealUids: string[] = [];

      // 1. 找出真人車頭裡離線過久的（manual 不參與時間判斷 → 永遠不在這份清單）
      Object.entries(members).forEach(([uid, m]) => {
        if (uid === meta.commanderId) return;
        if (m.isManual) return;
        if (m.status !== 'offline') return;
        if (!m.lastSeen) return;
        if (now - m.lastSeen > STALE_MS) staleRealUids.push(uid);
      });

      const toRemove: string[] = [...staleRealUids];

      // 2. 把這次要清的真人扣掉後，commander 以外是否還有真人留著？
      //    都沒有 → 連 manual 一起清空（避免代管條目永遠殘留)
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
      setToast({
        msg: t('room.auto_cleaned', { count: toRemove.length }),
        variant: 'success',
      });
    }, 3000);

    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCommander, meta?.commanderId]);

  // 非法 PIN → 已在 effect 中導向進入頁，這裡 hard return 讓 TS narrow type
  if (pinInvalid || !pin) return null;

  // 還沒取得名字 → 先 prompt
  if (!storedName) {
    return (
      <NamePrompt
        initialName=""
        initialType={storedType}
        onSubmit={(name, type) => {
          setStoredType(type);
          setStoredName(name);
        }}
        pin={pin}
      />
    );
  }

  // 認證失敗 → 顯示錯誤 + 重試
  if (authError) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.errorBox}>
          <div className={styles.errorTitle}>{t('error.auth_failed')}</div>
          <div className={styles.errorDetail}>{authError.message}</div>
          <button
            type="button"
            className={styles.errorBtn}
            onClick={() => window.location.reload()}
          >
            ↻ {t('error.retry')}
          </button>
        </div>
      </div>
    );
  }

  // 訂閱房間出錯（rules 拒絕、網路問題）
  if (roomError) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.errorBox}>
          <div className={styles.errorTitle}>{t('error.room_load_failed')}</div>
          <div className={styles.errorDetail}>{roomError.message}</div>
          <button
            type="button"
            className={styles.errorBtn}
            onClick={() => navigate('/')}
          >
            ← {t('error.back_to_entry')}
          </button>
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.loadingText}>{t('room.loading')}</div>
        <button
          type="button"
          className={styles.escapeBtn}
          onClick={() => navigate('/', { replace: true })}
        >
          ← {t('error.back_to_entry')}
        </button>
      </div>
    );
  }

  if (!meta) {
    // 這種情況罕見 — useRoom 會自動建立房間
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.loadingText}>{t('room.initializing')}</div>
        <button
          type="button"
          className={styles.escapeBtn}
          onClick={() => navigate('/', { replace: true })}
        >
          ← {t('error.back_to_entry')}
        </button>
      </div>
    );
  }

  const commanderName =
    Object.entries(members).find(([, m]) => m.role === 'commander')?.[1].name ?? '—';

  const handleLeave = async () => {
    // 指揮官 + 房裡還有其他人 → 加強警告
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
      // 即使 Firebase 寫入失敗也讓使用者離開頁面、不要卡住
    }
    setStoredName(storedName); // 保留名字方便下次
    navigate('/', { replace: true });
  };

  const handleShare = async () => {
    // 分享完整網址，對方點連結直接進房（不用手動輸 PIN）
    const url = `${window.location.origin}${import.meta.env.BASE_URL}room/${pin}`;
    const title = t('brand.title');
    const text = `${title} · PIN ${pin}`;

    // 手機優先用原生 share 選單
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // User cancelled or failed → fall through to clipboard
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setToast({ msg: `✓ ${t('room.copied')}`, variant: 'success' });
    } catch {
      setToast({ msg: `✗ ${t('room.copy_failed')}`, variant: 'error' });
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

  const handleSetSuicide = (targetUid: string, value: boolean) => {
    if (targetUid === user?.uid) {
      updateMyMember({ isSuicide: value });
    } else if (isCommander) {
      updateMember(targetUid, { isSuicide: value });
    }
  };

  const handleSetRally = (targetUid: string, seconds: number) => {
    const next = seconds === 600 ? 600 : 300; // 只接受 5 或 10 分鐘
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

  const handleTransferCommander = async (targetUid: string, targetName: string) => {
    const ok = await confirm({
      message: t('room.confirm_transfer', { name: targetName }),
      confirmText: t('room.commander'),
    });
    if (!ok) return;
    transferCommander(targetUid).catch(() =>
      setToast({ msg: t('error.transfer_failed'), variant: 'error' })
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
      setToast({ msg: t('error.remove_failed'), variant: 'error' })
    );
  };

  // 代管車頭：新增 / 編輯共用同一個 modal
  const editingManualMember =
    driverModalState && driverModalState !== 'add'
      ? members[driverModalState]
      : null;

  const handleSubmitManual = async (name: string, marchSeconds: number) => {
    // 失敗時 throw 帶 i18n 訊息的 Error，modal 會顯示在 inline error 區
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
      setToast({ msg: t('error.transfer_failed'), variant: 'error' })
    );
  };

  // 靜音 toggle / 任何點擊都順便解鎖 AudioContext（瀏覽器要求使用者互動才允許播放）
  const handleToggleMute = (next: boolean) => {
    setMuted(next);
    if (!next) {
      unlockAudio();
      // 從靜音切到開啟時 → 立刻播一聲 test beep 讓使用者確認音效有作用
      window.setTimeout(() => beep(880, 0.18, 0.4), 120);
    }
  };
  const handlePageClick = () => {
    if (!muted) unlockAudio();
  };

  return (
    <div className={styles.page} onClick={handlePageClick}>
      <Toast
        message={toast?.msg ?? null}
        variant={toast?.variant}
        onClose={() => setToast(null)}
      />
      <AddDriverModal
        open={driverModalState !== null}
        mode={driverModalState === 'add' ? 'add' : 'edit'}
        initialName={editingManualMember?.name}
        initialMarchSeconds={editingManualMember?.marchSeconds}
        onClose={() => setDriverModalState(null)}
        onSubmit={handleSubmitManual}
      />
      <Panel label={`ROOM · ${pin}`} labelRight="BRIDGE // LIVE">
        <header className={styles.header}>
          <div className={styles.headLeft}>
            <div className={styles.pinBadge}>
              <span className={styles.liveDot} />
              PIN · {pin.slice(0, 4)}·{pin.slice(4)}
            </div>
            <div className={styles.meta}>
              <span>
                {t('room.commander')}{' '}
                <b className={commanderAbsent || commanderStale ? styles.locked : ''}>
                  {commanderAbsent ? t('room.commander_left') : commanderName}
                </b>
                {commanderStale && (
                  <span className={styles.locked}>
                    {' '}
                    · {t('room.commander_offline')}
                  </span>
                )}
              </span>
              <span>
                {t('room.drivers_online', {
                  count: rallyingCount,
                  online: onlineCount,
                })}
              </span>
              {meta.locked && <span className={styles.locked}>🔒 LOCKED</span>}
              {canClaimCommander && (
                <Button variant="primary" size="sm" onClick={handleClaim}>
                  {t('room.claim_commander')}
                </Button>
              )}
            </div>
          </div>
          <div className={styles.headRight}>
            <UtcClock size="sm" showLabel={false} />
            <MuteToggle muted={muted} onChange={handleToggleMute} />
            <LangSwitch />
            <Button variant="ghost" size="sm" onClick={handleShare}>
              {t('room.share_pin')}
            </Button>
            <Button variant="danger" size="sm" onClick={handleLeave}>
              {t('room.leave')}
            </Button>
          </div>
        </header>

        <div className={styles.body}>
          <CommanderPanel
            meta={meta}
            canEdit={isCommander}
            myLaunchAtMs={myLaunchAtMs}
            onUpdate={(patch) => {
              // 從未鎖 → 鎖定 = 啟動戰報 snapshot
              if (patch.locked === true && !meta.locked) {
                startBattle().catch(() =>
                  setToast({ msg: t('error.start_battle_failed'), variant: 'error' })
                );
                return;
              }
              updateMeta(patch);
            }}
            onSaveWave={(name) =>
              saveCurrentWave(name).catch(() =>
                setToast({ msg: t('error.save_wave_failed'), variant: 'error' })
              )
            }
            onLoadWave={(id) =>
              loadWave(id).catch(() =>
                setToast({ msg: t('error.load_wave_failed'), variant: 'error' })
              )
            }
            onDeleteWave={(id) =>
              deleteWave(id).catch(() =>
                setToast({ msg: t('error.delete_wave_failed'), variant: 'error' })
              )
            }
            onRenameWave={(id, name) =>
              renameWave(id, name).catch(() =>
                setToast({ msg: t('error.rename_wave_failed'), variant: 'error' })
              )
            }
          />

          <main className={styles.main}>
            <div className={styles.toolbar}>
              <h2 className={styles.title}>
                {t('room.driver_list')}
                <span className={styles.sub}>// {rallyingCount} ACTIVE</span>
              </h2>
              {me && !meta.locked && isCommander && (
                <div className={styles.myActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDriverModalState('add')}
                    title={t('room.add_driver_hint')}
                  >
                    {t('room.add_driver_btn')}
                  </Button>
                  <label className={styles.check} title={t('room.rallying_hint')}>
                    <input
                      type="checkbox"
                      checked={me.rallying !== false}
                      onChange={(e) =>
                        updateMyMember({ rallying: e.target.checked })
                      }
                    />
                    {t('room.rallying_check')}
                  </label>
                </div>
              )}
            </div>

            {me?.rallying === false && (
              <div className={styles.coordinatorBanner}>
                {t('room.coordinator_only')} · {t('room.coordinator_desc')}
              </div>
            )}

            <DriverTable
              members={driverMembers}
              meta={meta}
              myUid={user.uid}
              onSetMarch={handleSetMarch}
              onSetSuicide={handleSetSuicide}
              onSetRally={handleSetRally}
              onSetOffset={handleSetOffset}
              onSetType={handleSetType}
              onSetCounterRally={handleSetCounterRally}
              onRemove={handleRemoveMember}
              onTransferCommander={
                isCommander ? handleTransferCommander : undefined
              }
              onEditManual={
                isCommander ? (uid) => setDriverModalState(uid) : undefined
              }
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
            />

            {meta.locked && (
              <div className={styles.lockedBanner}>{t('room.locked_banner')}</div>
            )}

            <BattleHistory
              meta={meta}
              canDelete={isCommander}
              onDelete={(id) =>
                deleteBattle(id).catch(() =>
                  setToast({
                    msg: t('error.delete_battle_failed'),
                    variant: 'error',
                  })
                )
              }
            />
          </main>
        </div>
      </Panel>
    </div>
  );
}
