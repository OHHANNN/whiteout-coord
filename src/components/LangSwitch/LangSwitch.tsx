import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LANGUAGES, getLanguage } from '@/i18n/languages';

/**
 * 語系切換 dropdown · shadcn DropdownMenu。
 * 主要用在 EntryPage（沒有完整的 SettingsMenu，所以拉一個簡化的 picker）。
 * RoomPage 內部請改用 SettingsMenu 的 language submenu。
 */
export function LangSwitch() {
  const { i18n } = useTranslation();
  // resolvedLanguage：i18next 實際 matched 的 lng（en-US → en）
  const current = getLanguage(i18n.resolvedLanguage ?? i18n.language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Select language">
          <Globe />
          <span>{current.shortLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => {
          const isActive = lang.code === current.code;
          return (
            <DropdownMenuItem
              key={lang.code}
              onSelect={() => i18n.changeLanguage(lang.code)}
            >
              {isActive ? (
                <Check className="size-4" />
              ) : (
                <span className="size-4" />
              )}
              <span>{lang.nativeLabel}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
