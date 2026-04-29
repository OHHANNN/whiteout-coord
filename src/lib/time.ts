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

/**
 * 將 ms 時間戳依指定 IANA timezone 格式化為 HH:MM:SS。
 * 'UTC' = 走 formatUtcTime（避免 Intl 的潛在差異）
 */
export function formatTimeInTz(ts: number, tz: string): string {
  if (tz === 'UTC') return formatUtcTime(ts);
  const fmt = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: tz,
  });
  // en-GB 在某些瀏覽器會輸出 "24:00:00" 而非 "00:00:00"，自己拼比較穩
  const parts = fmt.formatToParts(new Date(ts));
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? '00';
  let hh = get('hour');
  if (hh === '24') hh = '00';
  return `${hh}:${get('minute')}:${get('second')}`;
}

/**
 * 取出某個時間戳在指定 IANA timezone 的「當地年/月/日 + 時/分/秒」結構。
 * 用於 commander 輸入 HH:MM:SS 時：先決定那天是哪天、再把使用者新的 HH:MM:SS 套回去算 UTC。
 */
export function getDateTimePartsInTz(
  ts: number,
  tz: string
): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const d = new Date(ts);
  if (tz === 'UTC') {
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
    };
  }
  const fmt = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: tz,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  let hour = get('hour');
  if (hour === 24) hour = 0;
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour,
    minute: get('minute'),
    second: get('second'),
  };
}

/**
 * 給定指定 timezone 的 (year, month(1-12), day, hh, mm, ss)、回傳對應的 UTC ms。
 * 用 Intl 算 offset：先構造一個假設是 UTC 的時間戳、再看那個 ts 在 tz 顯示為何、算差值。
 */
export function utcMsFromLocalParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  tz: string
): number {
  if (tz === 'UTC') {
    return Date.UTC(year, month - 1, day, hour, minute, second);
  }
  // 假設 (y,m,d,h,m,s) 是 UTC，用它來探測 tz 在那個時刻 vs UTC 差幾分鐘
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const fmt = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: tz,
  });
  const parts = fmt.formatToParts(new Date(utcGuess));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  let h = get('hour');
  if (h === 24) h = 0;
  const tzAsUtcMs = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    h,
    get('minute'),
    get('second')
  );
  // tzAsUtcMs 是「假設 utcGuess 是 UTC，但被 tz 解讀後的時刻當作 UTC 寫回」
  // diff = tz 顯示時間 − UTC 時間 = tz 的偏移（毫秒）
  const offset = tzAsUtcMs - utcGuess;
  // 真正想要的 UTC = 「使用者輸入的 local time（已當作 UTC 算成 utcGuess）」− offset
  return utcGuess - offset;
}

/** 將秒數格式化為 MM:SS（< 1h）或 HH:MM:SS（>= 1h） */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 3600) {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * 自動格式化目標時間輸入：純數字會插入冒號變 HH:MM:SS。
 *   "1"        → "1"
 *   "12"       → "12"
 *   "120"      → "12:0"
 *   "1208"     → "12:08"
 *   "120812"   → "12:08:12"
 *   "12:08:12" → "12:08:12"（已格式化也吃）
 *   超過 6 位數字會自動截斷
 */
export function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4)}`;
}

/**
 * 解析使用者輸入的行軍時間。支援：
 *   "1:30"   → 90 秒
 *   "01:30"  → 90 秒
 *   "90"     → 90 秒（純數字當秒）
 *   ""       → null
 */
export function parseMarchInput(input: string): number | null {
  const s = input.trim();
  if (!s) return null;

  const colon = /^(\d{1,3}):(\d{1,2})$/.exec(s);
  if (colon) {
    const m = Number(colon[1]);
    const sec = Number(colon[2]);
    if (sec >= 60) return null;
    return m * 60 + sec;
  }

  if (/^\d+$/.test(s)) {
    return Number(s);
  }
  return null;
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
