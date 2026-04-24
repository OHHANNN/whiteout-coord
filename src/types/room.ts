/**
 * Firebase Realtime DB schema
 * /rooms/{pin}/meta + /rooms/{pin}/members/{uid}
 */

export type MemberRole = 'commander' | 'driver';
export type MemberStatus = 'ready' | 'adjusting' | 'offline';

export interface RoomMeta {
  createdAt: number;
  commanderId: string; // uid of commander
  targetLandingAt: number | null; // epoch ms (UTC)
  locked: boolean;
  targetLabel: string | null;
  targetX: number | null;
  targetY: number | null;
  lastActivityAt: number;
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
