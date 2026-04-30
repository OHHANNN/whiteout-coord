import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { LangSwitch } from '@/components/LangSwitch/LangSwitch';
import { NamePrompt } from '@/components/NamePrompt/NamePrompt';
import { Onboarding } from '@/components/Onboarding/Onboarding';
import { UtcClock } from '@/components/UtcClock/UtcClock';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useLocalStorage } from '@/hooks/useLocalStorage';

import type { ParticipantType } from '@/types/room';

const PIN_LENGTH = 8;
// 跟 RoomPage 共用同樣的 storage keys（直接寫進去，下一頁直接讀）
const SESSION_KEY = 'whiteout-coord:session';
const LAST_NAME_KEY = 'whiteout-coord:last-name';
const TYPE_STORAGE_KEY = 'whiteout-coord:type';

interface RoomSession {
  pin: string;
  name: string;
}

function generatePin(): string {
  const first = Math.floor(Math.random() * 9) + 1;
  const rest = Array.from({ length: PIN_LENGTH - 1 }, () =>
    Math.floor(Math.random() * 10)
  );
  return String(first) + rest.join('');
}

export function EntryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [, setSession] = useLocalStorage<RoomSession | null>(SESSION_KEY, null);
  const [lastUsedName, setLastUsedName] = useLocalStorage<string>(
    LAST_NAME_KEY,
    ''
  );
  const [storedType, setStoredType] = useLocalStorage<ParticipantType>(
    TYPE_STORAGE_KEY,
    'driver'
  );

  // 從 RoomPage 直接 URL 跳回來時、把 PIN 帶過來預填（?pin=xxxxxxxx）
  useEffect(() => {
    const queryPin = searchParams.get('pin');
    if (queryPin && /^\d{8}$/.test(queryPin)) {
      setPin(queryPin);
    }
  }, [searchParams]);

  const handleRandom = () => {
    setPin(generatePin());
    setError(null);
  };

  // 點 進入 → 不直接 navigate、開 NamePrompt drawer，讓使用者在不離開 EntryPage 下確認名字 / 角色
  const handleEnter = () => {
    if (pin.length !== PIN_LENGTH || !/^\d+$/.test(pin)) {
      setError(t('entry.pin_invalid'));
      return;
    }
    setError(null);
    setDrawerOpen(true);
  };

  const handleSubmitName = (name: string, type: ParticipantType) => {
    setSession({ pin, name });
    setLastUsedName(name);
    setStoredType(type);
    setDrawerOpen(false);
    navigate(`/room/${pin}`);
  };

  return (
    <div className="bg-background relative min-h-screen w-full">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
        <LangSwitch />
        <ThemeToggle />
      </div>

      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 p-4 sm:p-6">
        {/* Brand */}
        <div
          data-tour="brand"
          className="flex flex-col items-center gap-2 text-center"
        >
          <div className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
            {t('brand.kicker')}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('brand.title')}
          </h1>
          <div className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
            {t('brand.subtitle')}
          </div>
        </div>

        <UtcClock size="lg" />

        <Card className="w-full">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base">{t('entry.pin_label')}</CardTitle>
            <CardDescription>{t('brand.desc')}</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-3 px-4 sm:px-6">
            <div data-tour="pin-input">
            <InputOTP
              maxLength={PIN_LENGTH}
              value={pin}
              onChange={(v) => {
                setPin(v.replace(/\D/g, ''));
                setError(null);
              }}
              pattern="\d*"
              inputMode="numeric"
              autoFocus
              onComplete={() => setError(null)}
            >
              <InputOTPGroup>
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            </div>
            {error && (
              <div className="text-destructive text-center text-sm">{error}</div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-2 px-4 sm:px-6">
            <Button
              data-tour="random-pin"
              variant="outline"
              className="w-full"
              onClick={handleRandom}
            >
              {t('entry.random')}
            </Button>
            <Button
              data-tour="enter-room"
              className="w-full"
              onClick={handleEnter}
            >
              {t('entry.enter_room')} →
            </Button>
          </CardFooter>
        </Card>

        <p className="text-muted-foreground max-w-sm text-center text-xs leading-relaxed">
          {t('entry.hint')}
        </p>
      </main>

      {/* NamePrompt drawer 從底部滑上來、PIN 還在身後可隨時改 */}
      <NamePrompt
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        pin={pin}
        initialName={lastUsedName}
        initialType={storedType}
        onSubmit={handleSubmitName}
      />

      <Onboarding tour="entry" />
    </div>
  );
}
