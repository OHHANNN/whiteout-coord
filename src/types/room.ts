/**
 * Firebase Realtime DB schema
 * /rooms/{pin}/meta + /rooms/{pin}/members/{uid}
 */

export type MemberRole = 'commander' | 'driver';
export type MemberStatus = 'ready' | 'adjusting' | 'offline';

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
