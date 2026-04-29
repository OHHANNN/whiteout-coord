import { useNow } from '@/hooks/useServerTime';
import { getTimezoneShortLabel, useTimezone } from '@/hooks/useTimezone';
import { formatTimeInTz } from '@/lib/time';
import { cn } from '@/lib/utils';

type Size = 'lg' | 'md' | 'sm';

interface UtcClockProps {
  size?: Size;
  showLabel?: boolean;
  className?: string;
}

/**
 * 顯示當前時間（秒級，已經過 Firebase server time 校正）。
 * 依使用者選的 timezone 顯示，label 顯示對應的 UTC±N。
 */
export function UtcClock({ size = 'lg', showLabel = true, className }: UtcClockProps) {
  const now = useNow(1000);
  const [tz] = useTimezone();
  const tzLabel = getTimezoneShortLabel(tz);

  const valueClass =
    size === 'lg'
      ? 'text-3xl sm:text-4xl font-bold'
      : size === 'md'
        ? 'text-xl font-bold'
        : 'text-sm font-semibold';

  return (
    <div className={cn('inline-flex flex-col items-center gap-1', className)}>
      <div className={cn('mono-nums text-foreground', valueClass)}>
        {formatTimeInTz(now, tz)}
      </div>
      {showLabel && (
        <div className="text-muted-foreground text-[10px] tracking-widest uppercase">
          {tzLabel}
        </div>
      )}
    </div>
  );
}
