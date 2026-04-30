import { Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  findTimezoneOption,
  TIMEZONE_GROUPS,
  useTimezone,
} from '@/hooks/useTimezone';

/**
 * 時區切換 dropdown · 簡化版（給 EntryPage 用）。
 * Trigger 顯示 clock icon + 當前 offset short label；點開是按地區分組的 IANA 列表。
 * RoomPage 內部請改用 SettingsMenu 的 timezone submenu。
 */
export function TzSwitch() {
  const [tz, setTz] = useTimezone();
  const current = findTimezoneOption(tz);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Select timezone">
          <Clock />
          <span className="mono-nums text-xs">{current.offset}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[60vh] w-64 overflow-y-auto"
      >
        <DropdownMenuRadioGroup value={tz} onValueChange={setTz}>
          {TIMEZONE_GROUPS.map((group, idx) => (
            <div key={group.region}>
              {idx > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                {group.region}
              </DropdownMenuLabel>
              {group.items.map((item) => (
                <DropdownMenuRadioItem key={item.id} value={item.id}>
                  <span className="text-muted-foreground mono-nums w-20 shrink-0 text-right text-xs whitespace-nowrap">
                    {item.offset}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                </DropdownMenuRadioItem>
              ))}
            </div>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
