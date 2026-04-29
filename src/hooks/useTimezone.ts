import { getDateTimePartsInTz } from '@/lib/time';
import { useLocalStorage } from './useLocalStorage';

const TZ_STORAGE_KEY = 'whiteout-coord:timezone';

/**
 * 全站時區偏好。預設 'UTC'（不偏好任何時區、跟遊戲事件公告一致）。
 * 值是 IANA timezone identifier，例如：'Asia/Taipei' / 'America/New_York'。
 */
export function useTimezone(): [string, (tz: string) => void] {
  return useLocalStorage<string>(TZ_STORAGE_KEY, 'UTC');
}

export interface TimezoneOption {
  /** IANA timezone */
  id: string;
  /** 顯示名稱（城市） */
  label: string;
  /** UTC 偏移文字（如 'UTC+8'） */
  offset: string;
}

export interface TimezoneGroup {
  region: string;
  items: TimezoneOption[];
}

/**
 * 預設時區清單（按地區分組）。Whiteout Survival 玩家分布在歐美亞、UTC 為事件基準。
 */
export const TIMEZONE_GROUPS: TimezoneGroup[] = [
  {
    region: 'Universal',
    items: [{ id: 'UTC', label: 'UTC', offset: 'UTC+0' }],
  },
  {
    region: 'Asia',
    items: [
      { id: 'Asia/Taipei', label: 'Taipei', offset: 'UTC+8' },
      { id: 'Asia/Hong_Kong', label: 'Hong Kong', offset: 'UTC+8' },
      { id: 'Asia/Shanghai', label: 'Shanghai', offset: 'UTC+8' },
      { id: 'Asia/Singapore', label: 'Singapore', offset: 'UTC+8' },
      { id: 'Asia/Tokyo', label: 'Tokyo', offset: 'UTC+9' },
      { id: 'Asia/Seoul', label: 'Seoul', offset: 'UTC+9' },
      { id: 'Asia/Bangkok', label: 'Bangkok', offset: 'UTC+7' },
      { id: 'Asia/Jakarta', label: 'Jakarta', offset: 'UTC+7' },
      { id: 'Asia/Kolkata', label: 'Kolkata', offset: 'UTC+5:30' },
      { id: 'Asia/Dubai', label: 'Dubai', offset: 'UTC+4' },
    ],
  },
  {
    region: 'Europe',
    items: [
      { id: 'Europe/London', label: 'London', offset: 'UTC+0/+1' },
      { id: 'Europe/Paris', label: 'Paris', offset: 'UTC+1/+2' },
      { id: 'Europe/Berlin', label: 'Berlin', offset: 'UTC+1/+2' },
      { id: 'Europe/Madrid', label: 'Madrid', offset: 'UTC+1/+2' },
      { id: 'Europe/Moscow', label: 'Moscow', offset: 'UTC+3' },
    ],
  },
  {
    region: 'Americas',
    items: [
      { id: 'America/New_York', label: 'New York', offset: 'UTC-5/-4' },
      { id: 'America/Chicago', label: 'Chicago', offset: 'UTC-6/-5' },
      { id: 'America/Los_Angeles', label: 'Los Angeles', offset: 'UTC-8/-7' },
      { id: 'America/Toronto', label: 'Toronto', offset: 'UTC-5/-4' },
      { id: 'America/Mexico_City', label: 'Mexico City', offset: 'UTC-6' },
      { id: 'America/Sao_Paulo', label: 'São Paulo', offset: 'UTC-3' },
    ],
  },
  {
    region: 'Oceania',
    items: [
      { id: 'Australia/Sydney', label: 'Sydney', offset: 'UTC+10/+11' },
      { id: 'Australia/Perth', label: 'Perth', offset: 'UTC+8' },
      { id: 'Pacific/Auckland', label: 'Auckland', offset: 'UTC+12/+13' },
    ],
  },
];

/** 根據 id 反查顯示用 metadata（找不到就回 UTC fallback） */
export function findTimezoneOption(id: string): TimezoneOption {
  for (const group of TIMEZONE_GROUPS) {
    const hit = group.items.find((it) => it.id === id);
    if (hit) return hit;
  }
  return { id: 'UTC', label: 'UTC', offset: 'UTC+0' };
}

/**
 * 取目前 timezone 在當下相對 UTC 的「UTC±N」短標。
 *
 * 自己用 Intl 算 offset（不靠 timeZoneName: 'shortOffset'，因為某些瀏覽器需要其他
 * date/time 欄位才會輸出 timeZoneName 組件，不夠穩定）：
 *   - 把同一個 ts 在 tz 與 UTC 各自展開成 (Y/M/D h:m:s)
 *   - 兩邊用 Date.UTC 拼成假 ms、相減 = tz 的偏移
 */
export function getTimezoneShortLabel(tz: string): string {
  if (tz === 'UTC') return 'UTC';
  try {
    const now = Date.now();
    const u = getDateTimePartsInTz(now, 'UTC');
    const z = getDateTimePartsInTz(now, tz);
    const utcMs = Date.UTC(u.year, u.month - 1, u.day, u.hour, u.minute, u.second);
    const tzMs = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
    const offsetMin = Math.round((tzMs - utcMs) / 60000);
    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const hours = Math.floor(abs / 60);
    const mins = abs % 60;
    return mins === 0
      ? `UTC${sign}${hours}`
      : `UTC${sign}${hours}:${String(mins).padStart(2, '0')}`;
  } catch {
    return tz;
  }
}
