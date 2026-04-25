/**
 * Firebase Realtime DB schema
 * /rooms/{pin}/meta + /rooms/{pin}/members/{uid}
 */

export type MemberRole = 'commander' | 'driver';
export type MemberStatus = 'ready' | 'adjusting' | 'offline';
/**
 * 集結參與類型：
 *   driver    = 車頭，發起自己的集結（有 march / rally / offset / launch）
 *   passenger = 車身，只加入別人的集結（不需要 launch 計算）
 */
export type ParticipantType = 'driver' | 'passenger';

/**
 * 波次預設 · commander 預先存好的目標時間 / 建築 / 座標。
 * 切換到某波時，數值會被「載入」到 RoomMeta 的 target* 欄位、所有人即時同步。
 */
export interface WavePreset {
  id: string;
  /** 顯示名稱（可選，例如「先鋒衝鋒」） */
  name?: string;
  targetLandingAt: number | null;
  targetLabel: string | null;
  targetX: number | null;
  targetY: number | null;
}

/**
 * 戰報中單一車頭的快照
 */
export interface BattleDriver {
  uid: string;
  name: string;
  marchSeconds: number;
  /** 集結窗口長度（秒）。舊戰報沒這欄位 → 預設 300 */
  rallyWindowSeconds?: number;
  /** 計算後的發車時間 (= 落地 − 行軍 − 集結) */
  plannedLaunchAt: number | null;
  /** 預計落地時間 (= 房間 targetLandingAt，未來若加 suicide offset 可在這設不同值) */
  arrivalAtMs?: number | null;
  isSuicide: boolean;
  /** 鎖定那一刻的狀態 */
  status: MemberStatus;
}

/**
 * 戰報快照 · commander 鎖定時自動產生
 */
export interface BattleSnapshot {
  id: string;
  /** 鎖定的時刻 */
  lockedAt: number;
  /** 預計落地時間 */
  targetLandingAt: number | null;
  targetLabel: string | null;
  targetX: number | null;
  targetY: number | null;
  /** 對應的 wave preset 名稱（如果當前 target 跟某 preset 一致） */
  waveName: string | null;
  /** 所有出集結車頭的快照 */
  drivers: BattleDriver[];
}

export interface RoomMeta {
  createdAt: number;
  commanderId: string; // uid of commander
  targetLandingAt: number | null; // epoch ms (UTC)
  locked: boolean;
  targetLabel: string | null;
  targetX: number | null;
  targetY: number | null;
  lastActivityAt: number;
  /** 已存的波次預設集 (id → preset) */
  wavePresets?: Record<string, WavePreset>;
  /** 顯示順序 */
  wavePresetOrder?: string[];

  /** 已完成的戰報快照集 (id → snapshot) */
  battles?: Record<string, BattleSnapshot>;
  /** 戰報顯示順序（按時間舊→新） */
  battleOrder?: string[];
}

export interface Member {
  name: string;
  role: MemberRole;
  isSuicide: boolean;
  marchSeconds: number;
  status: MemberStatus;
  lastSeen: number;
  /**
   * 是否參與集結。預設 true（所有車頭都出）。
   * 指揮官可以設為 false 來當純調度員（不出現在車頭名單、不列入計算）。
   */
  rallying: boolean;
  /**
   * 集結窗口長度（秒）。WoS 內可選 5 分鐘 (300) 或 10 分鐘 (600)。
   * launch_time = target_landing − march_time − rally_window_time
   * 缺欄位時預設 300。
   */
  rallyWindowSeconds?: number;
  /**
   * 落地偏移（秒）。預設 0 = 跟主目標同時落地。
   * 負值 = 提前落地（首發車吸盾 -2s）；正值 = 延後落地。
   * 實際落地 = target_landing + landingOffsetSeconds
   * 發車   = target_landing + landingOffsetSeconds − march − rally
   */
  landingOffsetSeconds?: number;
  /**
   * 集結參與類型。預設 'driver'（車頭）。
   * 'passenger' = 車身，只加入別人的集結，不出現在車頭名單。
   */
  participantType?: ParticipantType;
}

export interface Room {
  pin: string;
  meta: RoomMeta;
  members: Record<string, Member>;
}

// ====== 衍生計算用 ======

export interface DriverView {
  uid: string;
  member: Member;
  launchAtMs: number | null; // 發車時間 epoch ms
  untilLaunchMs: number | null; // 距發車毫秒
}

/**
 * 統一計算車頭的「按下發動集結」時刻。
 * launch = target_landing + landingOffset − march − rally_window
 */
export function getLaunchAtMs(
  targetLandingAt: number | null | undefined,
  member:
    | Pick<Member, 'marchSeconds' | 'rallyWindowSeconds' | 'landingOffsetSeconds'>
    | null
    | undefined
): number | null {
  if (targetLandingAt == null || !member) return null;
  const rally = member.rallyWindowSeconds ?? 300;
  const offset = member.landingOffsetSeconds ?? 0;
  return targetLandingAt + offset * 1000 - (member.marchSeconds + rally) * 1000;
}

/** 該車頭實際落地時刻（含偏移） */
export function getArrivalAtMs(
  targetLandingAt: number | null | undefined,
  member: Pick<Member, 'landingOffsetSeconds'> | null | undefined
): number | null {
  if (targetLandingAt == null || !member) return null;
  return targetLandingAt + (member.landingOffsetSeconds ?? 0) * 1000;
}
