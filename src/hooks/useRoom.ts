import { useEffect, useRef, useState } from 'react';
import {
  get,
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';

import { database } from '@/lib/firebase';
import { logError, logInfo } from '@/lib/logger';

import type {
  BattleDriver,
  BattleSnapshot,
  Member,
  MemberStatus,
  RoomMeta,
  WavePreset,
} from '@/types/room';

interface UseRoomState {
  loading: boolean;
  exists: boolean;
  isCommander: boolean;
  meta: RoomMeta | null;
  members: Record<string, Member>;
  error: Error | null;
}

interface UseRoomActions {
  updateMeta: (patch: Partial<RoomMeta>) => Promise<void>;
  updateMyMember: (patch: Partial<Member>) => Promise<void>;
  /** 指揮官專用：編輯任意車頭。非指揮官呼叫會被 security rules 擋下。 */
  updateMember: (targetUid: string, patch: Partial<Member>) => Promise<void>;
  /** 把指揮權轉給另一位車頭（multi-path atomic update） */
  transferCommander: (newCommanderUid: string) => Promise<void>;
  removeMember: (uid: string) => Promise<void>;
  leaveRoom: () => Promise<void>;

  // === 波次預設管理 ===
  /** 把當前 target* 欄位存成新的 wave preset（自動命名 Wave N） */
  saveCurrentWave: (name?: string) => Promise<void>;
  /** 把指定 preset 載入當前 target*（所有人即時同步） */
  loadWave: (presetId: string) => Promise<void>;
  /** 刪除指定 preset */
  deleteWave: (presetId: string) => Promise<void>;
  /** 重新命名 preset */
  renameWave: (presetId: string, name: string) => Promise<void>;

  // === 戰報 ===
  /** 鎖定 + 將當下狀態 snapshot 為一份戰報（atomic） */
  startBattle: () => Promise<void>;
  /** 刪除某筆戰報 */
  deleteBattle: (battleId: string) => Promise<void>;
}

const initialState: UseRoomState = {
  loading: true,
  exists: false,
  isCommander: false,
  meta: null,
  members: {},
  error: null,
};

/**
 * 核心 hook：進入房間 / 建立房間 / 訂閱即時資料 / 處理離線狀態。
 *
 * - pin: 8 位數字 PIN
 * - uid: 當前使用者 uid（來自 useAuth）
 * - name: 使用者名稱（若為空字串則先不 join，等使用者設好名字）
 */
export function useRoom(
  pin: string | undefined,
  uid: string | undefined,
  name: string
): UseRoomState & UseRoomActions {
  const [state, setState] = useState<UseRoomState>(initialState);
  const joinedRef = useRef(false);

  // ---------- 訂閱 room ----------
  useEffect(() => {
    if (!pin || !uid) return;

    const roomRef = ref(database, `rooms/${pin}`);
    const unsub = onValue(
      roomRef,
      (snap) => {
        const data = snap.val() as {
          meta?: RoomMeta;
          members?: Record<string, Member>;
        } | null;

        if (!data || !data.meta) {
          setState({
            loading: false,
            exists: false,
            isCommander: false,
            meta: null,
            members: {},
            error: null,
          });
          return;
        }

        setState({
          loading: false,
          exists: true,
          isCommander: data.meta.commanderId === uid,
          meta: data.meta,
          members: data.members ?? {},
          error: null,
        });
      },
      (err) => {
        logError('useRoom · onValue error', err);
        setState((s) => ({ ...s, loading: false, error: err }));
      }
    );

    return () => unsub();
  }, [pin, uid]);

  // ---------- 建立房間 or 加入現有房間 ----------
  useEffect(() => {
    if (!pin || !uid || !name || state.loading || joinedRef.current) return;

    // 切換房間時 cleanup 會把 cancelled 設為 true，
    // 每個 await 之後檢查、unmount 後就不寫 Firebase / 不 setState
    let cancelled = false;

    (async () => {
      try {
        const metaRef = ref(database, `rooms/${pin}/meta`);
        const metaSnap = await get(metaRef);
        if (cancelled) return;

        // 房間不存在 → 建立（自己成為 commander）
        if (!metaSnap.exists()) {
          const now = Date.now();
          const meta: RoomMeta = {
            createdAt: now,
            commanderId: uid,
            targetLandingAt: null,
            locked: false,
            targetLabel: null,
            targetX: null,
            targetY: null,
            lastActivityAt: now,
          };
          const member: Member = {
            name,
            role: 'commander',
            isSuicide: false,
            marchSeconds: 60,
            status: 'ready',
            lastSeen: now,
            rallying: true,
          };
          await set(ref(database, `rooms/${pin}`), {
            meta,
            members: { [uid]: member },
          });
          if (cancelled) return;
          logInfo('useRoom · created', pin);
        } else {
          // 房間存在 → 以 driver 加入（或更新自己 name）
          const myRef = ref(database, `rooms/${pin}/members/${uid}`);
          const mySnap = await get(myRef);
          if (cancelled) return;
          const existingMember = mySnap.val() as Member | null;

          const now = Date.now();
          const member: Member = {
            name,
            role:
              (metaSnap.val() as RoomMeta).commanderId === uid
                ? 'commander'
                : (existingMember?.role ?? 'driver'),
            isSuicide: existingMember?.isSuicide ?? false,
            marchSeconds: existingMember?.marchSeconds ?? 60,
            status: 'ready',
            lastSeen: now,
            rallying: existingMember?.rallying ?? true,
          };
          await set(myRef, member);
          if (cancelled) return;
          logInfo('useRoom · joined', pin);
        }

        joinedRef.current = true;

        // presence：斷線時自動標 offline
        const myRef = ref(database, `rooms/${pin}/members/${uid}`);
        onDisconnect(myRef).update({
          status: 'offline' satisfies MemberStatus,
          lastSeen: serverTimestamp(),
        });

        // lastActivityAt 用 serverTimestamp
        await update(ref(database, `rooms/${pin}/meta`), {
          lastActivityAt: serverTimestamp(),
        });
      } catch (err) {
        if (cancelled) return;
        logError('useRoom · join/create failed', err);
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      }
    })();

    return () => {
      // unmount / pin uid name 變動 → 中斷飛行中的 async work
      cancelled = true;
    };
    // state.loading intentionally included: 等訂閱抓到資料再決定建/加入
  }, [pin, uid, name, state.loading]);

  // ---------- cleanup：離頁時標自己 offline + 取消 onDisconnect ----------
  useEffect(() => {
    return () => {
      if (!pin || !uid || !joinedRef.current) return;
      const myRef = ref(database, `rooms/${pin}/members/${uid}`);
      onDisconnect(myRef).cancel();
      update(myRef, { status: 'offline', lastSeen: Date.now() }).catch(() => {
        /* noop */
      });
    };
  }, [pin, uid]);

  // ---------- 連線恢復時重新註冊 onDisconnect ----------
  // Firebase 的 onDisconnect 只 fire 一次，斷線重連後會被清空。
  // 必須在每次 reconnect 後重新註冊、不然下次真的關 tab 不會標 offline。
  useEffect(() => {
    if (!pin || !uid) return;
    const connectedRef = ref(database, '.info/connected');
    const myRef = ref(database, `rooms/${pin}/members/${uid}`);

    // 只在「曾經斷線過 → 又連上」時動作。避免初次連線觸發。
    let seenDisconnect = false;

    const unsub = onValue(connectedRef, (snap) => {
      const isConnected = snap.val() === true;
      if (!isConnected) {
        seenDisconnect = true;
        return;
      }
      // isConnected === true
      if (!seenDisconnect) return; // 初次連線（非 reconnect）
      if (!joinedRef.current) return; // 還沒 join 完成
      seenDisconnect = false;

      logInfo('useRoom · reconnected · re-registering onDisconnect');
      onDisconnect(myRef).update({
        status: 'offline' satisfies MemberStatus,
        lastSeen: serverTimestamp(),
      });
      // 把自己狀態恢復成 ready（前一輪的 onDisconnect 把我設成 offline 了）
      update(myRef, {
        status: 'ready' satisfies MemberStatus,
        lastSeen: serverTimestamp(),
      }).catch(() => {
        /* noop */
      });
    });

    return () => unsub();
  }, [pin, uid]);

  // ---------- actions ----------
  const updateMeta = async (patch: Partial<RoomMeta>) => {
    if (!pin) return;
    try {
      await update(ref(database, `rooms/${pin}/meta`), {
        ...patch,
        lastActivityAt: serverTimestamp(),
      });
    } catch (err) {
      logError('useRoom · updateMeta rejected', err, patch);
      throw err;
    }
  };

  const updateMyMember = async (patch: Partial<Member>) => {
    if (!pin || !uid) return;
    try {
      await update(ref(database, `rooms/${pin}/members/${uid}`), {
        ...patch,
        lastSeen: Date.now(),
      });
    } catch (err) {
      logError('useRoom · updateMyMember rejected', err, patch);
      throw err;
    }
  };

  const updateMember = async (targetUid: string, patch: Partial<Member>) => {
    if (!pin) return;
    try {
      // 指揮官代改他人資料，不 overwrite lastSeen（那是車頭自己的 presence 指標）
      await update(ref(database, `rooms/${pin}/members/${targetUid}`), patch);
    } catch (err) {
      logError('useRoom · updateMember rejected', err, { targetUid, patch });
      throw err;
    }
  };

  const transferCommander = async (newCommanderUid: string) => {
    if (!pin || !state.meta) return;
    const oldCommanderId = state.meta.commanderId;
    if (oldCommanderId === newCommanderUid) return;

    try {
      // multi-path atomic update：commanderId 換、新指揮官 role 升、舊指揮官 role 降
      const updates: Record<string, unknown> = {
        [`rooms/${pin}/meta/commanderId`]: newCommanderUid,
        [`rooms/${pin}/meta/lastActivityAt`]: serverTimestamp(),
        [`rooms/${pin}/members/${newCommanderUid}/role`]: 'commander',
      };
      // 舊指揮官還在房間裡（沒明確離開）→ 降為 driver
      if (state.members[oldCommanderId]) {
        updates[`rooms/${pin}/members/${oldCommanderId}/role`] = 'driver';
      }
      await update(ref(database), updates);
      logInfo('useRoom · transferCommander', {
        from: oldCommanderId,
        to: newCommanderUid,
      });
    } catch (err) {
      logError('useRoom · transferCommander rejected', err);
      throw err;
    }
  };

  const removeMember = async (targetUid: string) => {
    if (!pin) return;
    try {
      await set(ref(database, `rooms/${pin}/members/${targetUid}`), null);
    } catch (err) {
      logError('useRoom · removeMember rejected', err);
      throw err;
    }
  };

  const leaveRoom = async () => {
    if (!pin || !uid) return;
    try {
      const myRef = ref(database, `rooms/${pin}/members/${uid}`);
      onDisconnect(myRef).cancel();
      await set(myRef, null);
      joinedRef.current = false;
    } catch (err) {
      logError('useRoom · leaveRoom rejected', err);
      throw err;
    }
  };

  // === Wave preset actions ===

  const saveCurrentWave = async (name?: string) => {
    if (!pin || !state.meta) return;
    const presetId = `w${Date.now()}`;
    const order = state.meta.wavePresetOrder ?? [];
    // Firebase 不吃 undefined，全部 ?? null 處理
    const newPreset: WavePreset = {
      id: presetId,
      name: name?.trim() || `Wave ${order.length + 1}`,
      targetLandingAt: state.meta.targetLandingAt ?? null,
      targetLabel: state.meta.targetLabel ?? null,
      targetX: state.meta.targetX ?? null,
      targetY: state.meta.targetY ?? null,
    };
    try {
      await update(ref(database), {
        [`rooms/${pin}/meta/wavePresets/${presetId}`]: newPreset,
        [`rooms/${pin}/meta/wavePresetOrder`]: [...order, presetId],
        [`rooms/${pin}/meta/lastActivityAt`]: serverTimestamp(),
      });
    } catch (err) {
      logError('useRoom · saveCurrentWave rejected', err);
      throw err;
    }
  };

  const loadWave = async (presetId: string) => {
    if (!pin || !state.meta) return;
    const preset = state.meta.wavePresets?.[presetId];
    if (!preset) return;
    try {
      await update(ref(database, `rooms/${pin}/meta`), {
        targetLandingAt: preset.targetLandingAt ?? null,
        targetLabel: preset.targetLabel ?? null,
        targetX: preset.targetX ?? null,
        targetY: preset.targetY ?? null,
        // 切換波次後解除鎖定，準備新一波
        locked: false,
        lastActivityAt: serverTimestamp(),
      });
    } catch (err) {
      logError('useRoom · loadWave rejected', err);
      throw err;
    }
  };

  const deleteWave = async (presetId: string) => {
    if (!pin || !state.meta) return;
    const order = state.meta.wavePresetOrder ?? [];
    try {
      await update(ref(database), {
        [`rooms/${pin}/meta/wavePresets/${presetId}`]: null,
        [`rooms/${pin}/meta/wavePresetOrder`]: order.filter((id) => id !== presetId),
        [`rooms/${pin}/meta/lastActivityAt`]: serverTimestamp(),
      });
    } catch (err) {
      logError('useRoom · deleteWave rejected', err);
      throw err;
    }
  };

  const renameWave = async (presetId: string, name: string) => {
    if (!pin) return;
    try {
      await update(
        ref(database, `rooms/${pin}/meta/wavePresets/${presetId}`),
        { name: name.slice(0, 40) }
      );
    } catch (err) {
      logError('useRoom · renameWave rejected', err);
      throw err;
    }
  };

  // === Battle snapshot ===

  const startBattle = async () => {
    if (!pin || !state.meta) return;
    const battleId = `b${Date.now()}`;
    const lockedAt = Date.now();

    // 找出當前 target 對應的 wave preset 名稱（沒有就 null）
    let waveName: string | null = null;
    if (state.meta.wavePresets && state.meta.targetLandingAt != null) {
      for (const id of Object.keys(state.meta.wavePresets)) {
        const p = state.meta.wavePresets[id];
        if (
          p.targetLandingAt === state.meta.targetLandingAt &&
          (p.targetLabel ?? null) === (state.meta.targetLabel ?? null)
        ) {
          waveName = p.name ?? null;
          break;
        }
      }
    }

    // Snapshot 所有出集結車頭
    const drivers: BattleDriver[] = Object.entries(state.members)
      .filter(([, m]) => m.rallying !== false)
      .map(([uid, m]) => ({
        uid,
        name: m.name,
        marchSeconds: m.marchSeconds,
        plannedLaunchAt:
          state.meta!.targetLandingAt != null
            ? state.meta!.targetLandingAt - m.marchSeconds * 1000
            : null,
        isSuicide: m.isSuicide,
        status: m.status,
      }));

    const snapshot: BattleSnapshot = {
      id: battleId,
      lockedAt,
      targetLandingAt: state.meta.targetLandingAt ?? null,
      targetLabel: state.meta.targetLabel ?? null,
      targetX: state.meta.targetX ?? null,
      targetY: state.meta.targetY ?? null,
      waveName,
      drivers,
    };

    const order = state.meta.battleOrder ?? [];
    try {
      await update(ref(database), {
        [`rooms/${pin}/meta/battles/${battleId}`]: snapshot,
        [`rooms/${pin}/meta/battleOrder`]: [...order, battleId],
        [`rooms/${pin}/meta/locked`]: true,
        [`rooms/${pin}/meta/lastActivityAt`]: serverTimestamp(),
      });
      logInfo('useRoom · startBattle', battleId, drivers.length);
    } catch (err) {
      logError('useRoom · startBattle rejected', err);
      throw err;
    }
  };

  const deleteBattle = async (battleId: string) => {
    if (!pin || !state.meta) return;
    const order = state.meta.battleOrder ?? [];
    try {
      await update(ref(database), {
        [`rooms/${pin}/meta/battles/${battleId}`]: null,
        [`rooms/${pin}/meta/battleOrder`]: order.filter((id) => id !== battleId),
        [`rooms/${pin}/meta/lastActivityAt`]: serverTimestamp(),
      });
    } catch (err) {
      logError('useRoom · deleteBattle rejected', err);
      throw err;
    }
  };

  return {
    ...state,
    updateMeta,
    updateMyMember,
    updateMember,
    transferCommander,
    removeMember,
    leaveRoom,
    saveCurrentWave,
    loadWave,
    deleteWave,
    renameWave,
    startBattle,
    deleteBattle,
  };
}
