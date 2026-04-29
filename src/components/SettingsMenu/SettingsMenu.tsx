import {
  Check,
  Clock,
  Globe,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  findTimezoneOption,
  TIMEZONE_GROUPS,
  useTimezone,
} from '@/hooks/useTimezone';
import { LANGUAGES, getLanguage } from '@/i18n/languages';

interface SettingsMenuProps {
  muted: boolean;
  onToggleMute: (next: boolean) => void;
  onLeave: () => void;
}

/**
 * 整合所有右上角設定 · gear icon → dropdown：
 *   - 聲音 (toggle)
 *   - 主題 (Light / Dark / System)
 *   - 語言
 *   - 時區（IANA tz、按地區分組）
 *   - 離開房間（destructive）
 */
export function SettingsMenu({ muted, onToggleMute, onLeave }: SettingsMenuProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [tz, setTz] = useTimezone();
  const currentLang = getLanguage(i18n.language);
  const currentTz = findTimezoneOption(tz);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('settings.title')}>
          <Settings />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t('settings.title')}</DropdownMenuLabel>

        {/* 聲音 toggle */}
        <DropdownMenuItem
          className="gap-3 py-2"
          onSelect={() => onToggleMute(!muted)}
        >
          {muted ? <VolumeX /> : <Volume2 />}
          <span>{muted ? t('sound.off') : t('sound.on')}</span>
          {!muted && <Check className="ml-auto size-4" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* 主題 */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-3 py-2">
            {theme === 'dark' ? (
              <Moon />
            ) : theme === 'light' ? (
              <Sun />
            ) : (
              <Monitor />
            )}
            <span>{t('settings.theme')}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={theme ?? 'system'}
              onValueChange={(v) => setTheme(v)}
            >
              <DropdownMenuRadioItem value="light">
                <Sun />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon />
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor />
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* 語言 */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-3 py-2">
            <Globe />
            <span>{t('settings.language')}</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {currentLang.shortLabel}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={i18n.language}
              onValueChange={(v) => i18n.changeLanguage(v)}
            >
              {LANGUAGES.map((lang) => (
                <DropdownMenuRadioItem key={lang.code} value={lang.code}>
                  {lang.nativeLabel}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* 時區 */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-3 py-2">
            <Clock />
            <span>{t('settings.timezone')}</span>
            <span className="text-muted-foreground mono-nums ml-auto text-xs">
              {currentTz.offset}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[60vh] w-64 overflow-y-auto">
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
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          className="gap-3 py-2"
          onSelect={onLeave}
        >
          <LogOut />
          <span>{t('room.leave')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
