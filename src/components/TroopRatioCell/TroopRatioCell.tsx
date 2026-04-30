import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Shield, Sword, Target } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { TroopRatio } from '@/types/room';

interface TroopRatioCellProps {
  ratio: TroopRatio | null | undefined;
  editable: boolean;
  onSet: (ratio: TroopRatio) => void;
}

const ZERO: TroopRatio = { shield: 0, spear: 0, archer: 0 };

function isUnset(r: TroopRatio | null | undefined): boolean {
  if (!r) return true;
  return r.shield === 0 && r.spear === 0 && r.archer === 0;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(99, Math.floor(n)));
}

/**
 * 兵種比例顯示 + 編輯 cell。
 * - 唯讀：badge 顯示 "5:2:3"，hover/long-press 顯示 tooltip 拆解
 * - 可編輯：點擊 badge 開 popover，內含 3 個 ± 控制 + 清除
 *   未設定（全 0 / undefined）→ 顯示「—」、可點擊新增
 */
export function TroopRatioCell({ ratio, editable, onSet }: TroopRatioCellProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const r = ratio ?? ZERO;
  const unset = isUnset(r);

  // 顯示文字：未設定就 —、否則 5:2:3
  const display = unset ? '—' : `${r.shield}:${r.spear}:${r.archer}`;

  // 拆解的 tooltip 文案：盾兵 5 · 矛兵 2 · 弓兵 3
  const tooltipText = unset
    ? t('room.troop_unset')
    : `${t('room.troop_shield')} ${r.shield} · ${t('room.troop_spear')} ${r.spear} · ${t('room.troop_archer')} ${r.archer}`;

  const handleAdjust = (key: keyof TroopRatio, delta: number) => {
    onSet({ ...r, [key]: clamp(r[key] + delta) });
  };

  const handleInput = (key: keyof TroopRatio, raw: string) => {
    const n = raw.replace(/\D/g, '').slice(0, 2);
    onSet({ ...r, [key]: clamp(parseInt(n || '0', 10) || 0) });
  };

  const triggerNode = (
    <span
      className={cn(
        'mono-nums inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs',
        unset
          ? 'border-dashed text-muted-foreground'
          : 'border-border text-foreground',
        editable && 'hover:bg-accent cursor-pointer'
      )}
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
    >
      {display}
    </span>
  );

  // 唯讀模式：只用 Tooltip 顯示拆解
  if (!editable) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{triggerNode}</TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    );
  }

  // 可編輯：Popover 打開有 3 個 ± row + 清除按鈕
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>{triggerNode}</PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="text-foreground mb-2 text-sm font-medium">
          {t('room.troop_ratio')}
        </div>

        <RatioRow
          icon={<Shield className="size-4" />}
          label={t('room.troop_shield')}
          value={r.shield}
          onAdjust={(d) => handleAdjust('shield', d)}
          onInput={(v) => handleInput('shield', v)}
        />
        <RatioRow
          icon={<Sword className="size-4" />}
          label={t('room.troop_spear')}
          value={r.spear}
          onAdjust={(d) => handleAdjust('spear', d)}
          onInput={(v) => handleInput('spear', v)}
        />
        <RatioRow
          icon={<Target className="size-4" />}
          label={t('room.troop_archer')}
          value={r.archer}
          onAdjust={(d) => handleAdjust('archer', d)}
          onInput={(v) => handleInput('archer', v)}
        />

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-2 h-7 w-full text-xs"
          onClick={() => onSet(ZERO)}
        >
          {t('room.troop_clear')}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

interface RatioRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  onAdjust: (delta: number) => void;
  onInput: (raw: string) => void;
}

function RatioRow({ icon, label, value, onAdjust, onInput }: RatioRowProps) {
  return (
    <div className="mb-2 flex items-center gap-2 last:mb-0">
      <span className="text-muted-foreground inline-flex w-16 items-center gap-1.5 text-xs">
        {icon}
        {label}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-7"
        onClick={() => onAdjust(-1)}
        aria-label="decrease"
      >
        <Minus />
      </Button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onInput(e.target.value)}
        className="border-input bg-background mono-nums w-12 rounded-md border px-2 py-1 text-center text-sm"
        maxLength={2}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-7"
        onClick={() => onAdjust(1)}
        aria-label="increase"
      >
        <Plus />
      </Button>
    </div>
  );
}
