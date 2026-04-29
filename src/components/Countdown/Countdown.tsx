import { useNow } from '@/hooks/useServerTime';
import { formatDuration } from '@/lib/time';
import { cn } from '@/lib/utils';

interface CountdownProps {
  /** 目標時間（epoch ms）。若為 null 顯示 --:--。 */
  targetAt: number | null;
  /** 小標題、顯示在數字下方 */
  label?: string;
  /** 數字字級 */
  size?: 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  md: 'text-2xl sm:text-3xl',
  lg: 'text-3xl sm:text-4xl',
  xl: 'text-4xl sm:text-5xl',
} as const;

/**
 * 從當前校正時間算到目標時間的 MM:SS 倒數。
 * < 60s warning (amber)、< 30s danger (destructive 紅閃)
 */
export function Countdown({
  targetAt,
  label,
  size = 'md',
  className,
}: CountdownProps) {
  const now = useNow(1000);

  if (targetAt == null) {
    return (
      <div className={cn('flex flex-col items-center gap-1.5', className)}>
        <div
          className={cn(
            'mono-nums text-muted-foreground font-semibold tracking-tight',
            SIZE_MAP[size]
          )}
        >
          --:--
        </div>
        {label && (
          <div className="text-muted-foreground text-[10px] tracking-widest uppercase">
            {label}
          </div>
        )}
      </div>
    );
  }

  const remainingMs = targetAt - now;
  // 用 round 跟 useCountdownAlert 對齊：display 跳到 5 的瞬間就嗶
  const remainingSec = Math.max(0, Math.round(remainingMs / 1000));

  // landed / danger / warning / normal · 全部走 semantic token，會跟 theme 切換
  const valueClass =
    remainingMs <= 0
      ? 'text-success'
      : remainingSec < 30
        ? 'text-destructive animate-pulse'
        : remainingSec < 60
          ? 'text-warning'
          : 'text-foreground';

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div
        className={cn(
          'mono-nums font-semibold tracking-tight tabular-nums',
          SIZE_MAP[size],
          valueClass
        )}
      >
        {remainingMs <= 0 ? 'LANDED' : formatDuration(remainingSec)}
      </div>
      {label && (
        <div className="text-muted-foreground text-[10px] tracking-widest uppercase">
          {label}
        </div>
      )}
    </div>
  );
}
