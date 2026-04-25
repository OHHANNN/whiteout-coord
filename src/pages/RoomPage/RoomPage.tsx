import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/Button/Button';
import { CommanderPanel } from '@/components/CommanderPanel/CommanderPanel';
import { DriverTable } from '@/components/DriverTable/DriverTable';
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

const PIN_REGEX = /^[0-9]{8}$/;
const NAME_STORAGE_KEY = 'whiteout-coord:name';
const MUTE_STORAGE_KEY = 'whiteout-coord:muted';

export function RoomPage() {
  const { pin } = useParams<{ pin: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [storedName, setStoredName] = useLocalStorage<string>(NAME_STORAGE_KEY, '');
  const [muted, setMuted] = useLocalStorage<boolean>(MUTE_STORAGE_KEY, false);
  const [toast, setToast] = useState<{ msg: string; variant: 'success' | 'error' } | null>(null);

  const {
    loading,
    isCommander,
    meta,
    members,
    updateMeta,
    updateMyMember,
    updateMember,
    transferCommander,
    removeMember,
    leaveRoom,
  } = useRoom(pin, user?.uid, storedName);

  // 只有「rallying」的車頭才列入名單（指揮官關掉後不算車頭）
  const rallyingMembers = useMemo(() => {
    const result: Record<string, typeof members[string]> = {};
    for (const [uid, m] of Object.entries(members)) {
      if (m.rallying !== false) result[uid] = m;
    }
    return result;
  }, [members]);

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
      ? meta.targetLandingAt - me.marchSeconds * 1000
      : null;
  useLaunchAlert(myLaunchAtMs, !muted);

  // 非法 PIN → navigate 到進入頁（side-effect 必須在 useEffect 裡，不能在 render 中）
  const pinInvalid = !pin || !PIN_REGEX.test(pin);
  useEffect(() => {
    if (pinInvalid) navigate('/', { replace: true });
  }, [pinInvalid, navigate]);

  if (pinInvalid) return null;

  // 還沒取得名字 → 先 prompt
  if (!storedName) {
    return (
      <NamePrompt
        initialName=""
        onSubmit={(name) => setStoredName(name)}
        pin={pin}
      />
    );
  }

  if (loading || !user) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.loadingText}>{t('room.loading')}</div>
      </div>
    );
  }

  if (!meta) {
    // 這種情況罕見 — useRoom 會自動建立房間
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.loadingText}>{t('room.initializing')}</div>
      </div>
    );
  }

  const commanderName =
    Object.entries(members).find(([, m]) => m.role === 'commander')?.[1].name ?? '—';

  const handleLeave = async () => {
    await leaveRoom();
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

  const handleTransferCommander = (targetUid: string, targetName: string) => {
    const ok = window.confirm(t('room.confirm_transfer', { name: targetName }));
    if (!ok) return;
    transferCommander(targetUid).catch(() =>
      setToast({ msg: t('error.transfer_failed'), variant: 'error' })
    );
  };

  // 偵測指揮官是否離線過久 → 允許其他人接管
  const commanderMember = meta?.commanderId ? members[meta.commanderId] : null;
  const commanderAbsent = !!meta && !commanderMember;
  const commanderStale =
    !!commanderMember &&
    commanderMember.status === 'offline' &&
    Date.now() - (commanderMember.lastSeen ?? 0) > 90_000;
  const canClaimCommander = !!me && !isCommander && (commanderAbsent || commanderStale);

  const handleClaim = () => {
    if (!user?.uid) return;
    const ok = window.confirm(t('room.confirm_claim'));
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
            onUpdate={updateMeta}
          />

          <main className={styles.main}>
            <div className={styles.toolbar}>
              <h2 className={styles.title}>
                {t('room.driver_list')}
                <span className={styles.sub}>// {rallyingCount} ACTIVE</span>
              </h2>
              {me && !meta.locked && isCommander && (
                <div className={styles.myActions}>
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
              members={rallyingMembers}
              meta={meta}
              myUid={user.uid}
              onSetMarch={handleSetMarch}
              onSetSuicide={handleSetSuicide}
              onRemove={removeMember}
              onTransferCommander={
                isCommander ? handleTransferCommander : undefined
              }
              canRemove={isCommander}
              canEditOthers={isCommander}
            />

            {meta.locked && (
              <div className={styles.lockedBanner}>{t('room.locked_banner')}</div>
            )}
          </main>
        </div>
      </Panel>
    </div>
  );
}
