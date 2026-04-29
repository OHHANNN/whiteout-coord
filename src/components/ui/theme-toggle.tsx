import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Light / dark / system 主題切換。
 * next-themes 寫入 .dark class on <html>、shadcn @custom-variant dark 對應。
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => setTheme('light')}
          data-state={theme === 'light' ? 'checked' : undefined}
        >
          <Sun />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setTheme('dark')}
          data-state={theme === 'dark' ? 'checked' : undefined}
        >
          <Moon />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setTheme('system')}
          data-state={theme === 'system' ? 'checked' : undefined}
        >
          <Monitor />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
