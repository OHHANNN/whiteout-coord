import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, X } from 'lucide-react';

import { Countdown } from '@/components/Countdown';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { getServerTime, useNow } from '@/hooks/useServerTime';
import { useTimezone, getTimezoneShortLabel } from '@/hooks/useTimezone';
import {
  formatTimeInTz,
  getDateTimePartsInTz,
  utcMsFromLocalParts,
} from '@/lib/time';

import type { RoomMeta } from '@/types/room';

interface CommanderPanelProps {
  meta: RoomMeta;
  canEdit: boolean;
  /** 當前使用者自己的落地時刻 (target landing + landingOffset)。和 useCountdownAlert 對齊，避免 display vs beep 漂移 */
  myArrivalAtMs?: number | null;
  onUpdate: (patch: Partial<RoomMeta>) => void;
}

export function CommanderPanel({
  meta,
  canEdit,
  myArrivalAtMs,
  onUpdate,
}: CommanderPanelProps) {
  const { t } = useTranslation();
  const now = useNow(1000);
  const [tz] = useTimezone();
  const tzLabel = getTimezoneShortLabel(tz);

  // 時間拆三段（HH / MM / SS），使用者可以單獨改某一格、不用整串重打
  const [h, setH] = useState('');
  const [m, setM] = useState('');
  const [s, setS] = useState('');
  const hRef = useRef<HTMLInputElement>(null);
  const mRef = useRef<HTMLInputElement>(null);
  const sRef = useRef<HTMLInputElement>(null);

  const [label, setLabel] = useState(meta.targetLabel ?? '');

  // meta 從 firebase 更新時同步三個 input（依使用者選的 tz 顯示）
  useEffect(() => {
    if (meta.targetLandingAt) {
      const parts = getDateTimePartsInTz(meta.targetLandingAt, tz);
      setH(String(parts.hour).padStart(2, '0'));
      setM(String(parts.minute).padStart(2, '0'));
      setS(String(parts.second).padStart(2, '0'));
    } else {
      setH('');
      setM('');
      setS('');
    }
  }, [meta.targetLandingAt, tz]);

  useEffect(() => {
    setLabel(meta.targetLabel ?? '');
  }, [meta.targetLabel]);

  // 自動跳下一格時要 skip 那個格子的 onBlur commit、不然會用舊 state 覆蓋
  const skipBlurRef = useRef(false);

  // 同 day 計算（在「使用者選的 tz」中算當天，不跨天）
  // clamp 範圍：H 0-23、M 0-59、S 0-59
  // override 用來避免 React state 還沒更新的 race（auto-advance 時呼叫端傳新值進來）
  // 永遠存 UTC ms 進 firebase；不同 tz 的人讀回時各自 format 成自己的時區。
  const commitTime = (override?: Partial<{ h: string; m: string; s: string }>) => {
    const useH = override?.h ?? h;
    const useM = override?.m ?? m;
    const useS = override?.s ?? s;
    if (!useH && !useM && !useS) return;
    const hh = Math.min(23, Math.max(0, parseInt(useH || '0', 10) || 0));
    const mm = Math.min(59, Math.max(0, parseInt(useM || '0', 10) || 0));
    const ss = Math.min(59, Math.max(0, parseInt(useS || '0', 10) || 0));
    // 取「現在這一刻在使用者 tz 中是哪一天」
    // 用 getServerTime() 直接拿最新時間、避免 useNow(1000) 落後 ~1 秒
    // 造成跨午夜邊緣判錯日期（例如 23:59:59.999 wall clock 但 useNow 還停在前一秒）
    const nowMs = getServerTime();
    const today = getDateTimePartsInTz(nowMs, tz);
    let target = utcMsFromLocalParts(
      today.year,
      today.month,
      today.day,
      hh,
      mm,
      ss,
      tz
    );
    // 若算出來已經過去（例如現在 23:30 user 輸入 00:05），代表是「下一個 00:05」→ +1 天
    if (target < nowMs) {
      target += 86_400_000;
    }
    onUpdate({ targetLandingAt: target });
    // 同步顯示成 clamp 後的 padded 值（例如打 "25" 變 "23"）
    setH(String(hh).padStart(2, '0'));
    setM(String(mm).padStart(2, '0'));
    setS(String(ss).padStart(2, '0'));
  };

  // 單一段位輸入：只取數字、最多 2 位、依欄位 clamp、滿 2 位自動跳下一格
  const handlePart = (
    field: 'h' | 'm' | 's',
    nextRef: React.RefObject<HTMLInputElement | null> | null,
    value: string,
    max: number
  ) => {
    let cleaned = value.replace(/\D/g, '').slice(0, 2);
    // 即時 clamp：輸入超過 max 直接限制（例如 H 打 "25" 顯示 "23"）
    if (cleaned.length === 2 && parseInt(cleaned, 10) > max) {
      cleaned = String(max);
    }
    if (field === 'h') setH(cleaned);
    else if (field === 'm') setM(cleaned);
    else setS(cleaned);

    if (cleaned.length === 2 && nextRef?.current) {
      // 自動跳格 → 用顯式 override 直接 commit、避免讀到 stale state
      // 同時告訴接下來那個 onBlur 不要再 commit（不然會用舊值覆蓋）
      skipBlurRef.current = true;
      commitTime({ [field]: cleaned });
      nextRef.current.focus();
      nextRef.current.select();
    }
  };

  // onBlur handler：如果是 auto-advance 觸發的、跳過 commit
  const handleBlur = () => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    commitTime();
  };

  const nudgeTime = (deltaSec: number) => {
    if (meta.targetLandingAt == null) return;
    onUpdate({ targetLandingAt: meta.targetLandingAt + deltaSec * 1000 });
  };

  const setRelative = (deltaSec: number) => {
    if (meta.targetLandingAt != null) {
      onUpdate({ targetLandingAt: meta.targetLandingAt + deltaSec * 1000 });
      return;
    }
    onUpdate({ targetLandingAt: now + deltaSec * 1000 });
  };

  const commitLabel = () => {
    if (label !== (meta.targetLabel ?? '')) {
      onUpdate({ targetLabel: label || null });
    }
  };

  const hasObjective = !!meta.targetLabel;
  // T-MINUS display 用「自己的落地」(target + landingOffset)、跟 useCountdownAlert 對齊
  // 沒帶 prop 就 fallback 到 meta.targetLandingAt
  const arrivalDisplayAt = myArrivalAtMs ?? meta.targetLandingAt;

  // === driver 視角：簡化卡片，發車倒數已經在 driver row 大字顯示 → 這裡只放 T-MINUS ===
  if (!canEdit) {
    return (
      <aside className="flex flex-col gap-4">
        {/* T-MINUS 落地倒數（OBJECTIVE 顯示在右上） */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-muted-foreground shrink-0 text-xs font-medium tracking-widest whitespace-nowrap uppercase">
              {t('room.t_minus')}
            </CardTitle>
            {hasObjective && meta.targetLabel && (
              <div className="text-foreground min-w-0 flex-1 truncate text-right text-sm font-medium">
                {meta.targetLabel}
              </div>
            )}
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            <Countdown
              targetAt={arrivalDisplayAt}
              label={t('room.all_land_sim')}
              size="md"
            />
            {arrivalDisplayAt != null ? (
              <div className="text-muted-foreground mono-nums text-xs">
                @ {formatTimeInTz(arrivalDisplayAt, tz)} {tzLabel}
              </div>
            ) : (
              <div className="text-muted-foreground text-xs">
                {t('room.waiting_target')}
              </div>
            )}
          </CardContent>
        </Card>
      </aside>
    );
  }

  // === commander 視角：完整控制面板 ===
  return (
    <aside className="flex flex-col gap-4">

      {/* TARGET 控制 */}
      <Card data-tour="target-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            {t('room.target_landing')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {/* HH : MM : SS 三段獨立輸入、可單獨改任一格 */}
          <div className="flex items-center gap-1">
            <Input
              ref={hRef}
              value={h}
              onChange={(e) => handlePart('h', mRef, e.target.value, 23)}
              onBlur={handleBlur}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              placeholder="HH"
              inputMode="numeric"
              maxLength={2}
              disabled={meta.locked}
              aria-label="hour"
              className="mono-nums w-14 text-center text-base"
            />
            <span className="text-muted-foreground select-none">:</span>
            <Input
              ref={mRef}
              value={m}
              onChange={(e) => handlePart('m', sRef, e.target.value, 59)}
              onBlur={handleBlur}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              placeholder="MM"
              inputMode="numeric"
              maxLength={2}
              disabled={meta.locked}
              aria-label="minute"
              className="mono-nums w-14 text-center text-base"
            />
            <span className="text-muted-foreground select-none">:</span>
            <Input
              ref={sRef}
              value={s}
              onChange={(e) => handlePart('s', null, e.target.value, 59)}
              onBlur={handleBlur}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              placeholder="SS"
              inputMode="numeric"
              maxLength={2}
              disabled={meta.locked}
              aria-label="second"
              className="mono-nums w-14 text-center text-base"
            />
            <span className="text-muted-foreground ml-1 text-xs">{tzLabel}</span>
            {meta.targetLandingAt != null && !meta.locked && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                onClick={() => {
                  setH('');
                  setM('');
                  setS('');
                  onUpdate({ targetLandingAt: null });
                }}
                title={t('room.clear_target')}
                aria-label="clear target time"
              >
                <X />
              </Button>
            )}
          </div>

          <Separator className="my-1" />

          {/* nudge -10/-1/+1/+10 秒（包 onboarding 用 wrapper、time-shortcuts 涵蓋下面 +5m..+30m 也可以） */}
          <div data-tour="time-shortcuts" className="grid grid-cols-4 gap-1.5">
            {[-10, -1, 1, 10].map((d) => (
              <Button
                key={d}
                variant="outline"
                size="sm"
                onClick={() => nudgeTime(d)}
                disabled={meta.locked || meta.targetLandingAt == null}
              >
                {d > 0 ? `+${d}s` : `${d}s`}
              </Button>
            ))}
          </div>

          {/* shortcut +5m / +6m / +10m / +30m */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: '+5m', sec: 5 * 60, key: 'shortcut_5m' },
              { label: '+6m', sec: 6 * 60, key: 'shortcut_6m_counter' },
              { label: '+10m', sec: 10 * 60, key: 'shortcut_10m' },
              { label: '+30m', sec: 30 * 60, key: 'shortcut_30m' },
            ].map(({ label: lbl, sec, key }) => (
              <Button
                key={lbl}
                variant="outline"
                size="sm"
                onClick={() => setRelative(sec)}
                disabled={meta.locked}
                title={t(`room.${key}`)}
              >
                {lbl}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* T-MINUS 落地倒數（OBJECTIVE 標籤輸入放在右上） */}
      <Card data-tour="t-minus">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-muted-foreground shrink-0 text-xs font-medium tracking-widest whitespace-nowrap uppercase">
            {t('room.t_minus')}
          </CardTitle>
          <Input
            id="objective-label"
            value={label}
            placeholder={t('room.objective_placeholder')}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
            disabled={meta.locked}
            maxLength={40}
            aria-label={t('room.objective')}
            className="h-7 min-w-0 flex-1 text-center text-xs"
          />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2">
          <Countdown
            targetAt={arrivalDisplayAt}
            label={t('room.all_land_sim')}
            size="lg"
          />
          {arrivalDisplayAt != null ? (
            <div className="text-muted-foreground mono-nums text-xs text-center">
              @ {formatTimeInTz(arrivalDisplayAt, tz)} {tzLabel}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Separator />

      {/* LOCK / UNLOCK */}
      <Button
        data-tour="lock-start"
        size="lg"
        variant={meta.locked ? 'destructive' : 'default'}
        onClick={() => onUpdate({ locked: !meta.locked })}
        className="w-full"
      >
        {meta.locked ? (
          <>
            <Lock />
            {t('room.unlock')}
          </>
        ) : (
          <>▶ {t('room.lock_and_start')}</>
        )}
      </Button>
    </aside>
  );
}
