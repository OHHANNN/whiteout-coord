/**
 * 時間格式化工具
 */

/** 將 ms 時間戳格式化為 HH:MM:SS (UTC) */
export function formatUtcTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/** 將秒數格式化為 MM:SS */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** 把 HH:MM:SS 或 HH:MM 字串解析成當日 UTC 時間戳（如果已過則加一天） */
export function parseUtcTimeOfDay(input: string, now: number): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(input.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const sec = m[3] ? Number(m[3]) : 0;
  if (h > 23 || min > 59 || sec > 59) return null;

  const d = new Date(now);
  const target = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    h,
    min,
    sec
  );
  // 如果目標時間已過，跳到明天
  return target < now ? target + 86400000 : target;
}
