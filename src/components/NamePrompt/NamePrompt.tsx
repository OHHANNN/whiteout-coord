import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Car, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useMediaQuery } from '@/hooks/useMediaQuery';

import type { ParticipantType } from '@/types/room';

interface NamePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pin: string;
  initialName?: string;
  initialType?: ParticipantType;
  onSubmit: (name: string, type: ParticipantType) => void;
}

/**
 * 進房前的名字 + 角色確認 · Responsive Dialog 模式：
 *   桌機 (md+) → shadcn Dialog（置中）
 *   手機       → shadcn Drawer（從底部滑上來）
 */
export function NamePrompt({
  open,
  onOpenChange,
  pin,
  initialName = '',
  initialType = 'driver',
  onSubmit,
}: NamePromptProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [name, setName] = useState(initialName);
  const [type, setType] = useState<ParticipantType>(initialType);

  // 每次重新打開時 reset 表單
  useEffect(() => {
    if (open) {
      setName(initialName);
      setType(initialType);
    }
  }, [open, initialName, initialType]);

  const disabled = name.trim().length === 0;

  const submit = () => {
    if (disabled) return;
    onSubmit(name.trim().slice(0, 20), type);
  };

  const title = t('entry.enter_name_title');
  const desc: ReactNode = (
    <span className="mono-nums tracking-wider">
      PIN · {pin.slice(0, 4)}·{pin.slice(4)}
    </span>
  );

  const body = (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="callsign">{t('entry.enter_name_sub')}</FieldLabel>
        <Input
          id="callsign"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('entry.name_placeholder')}
          maxLength={20}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled) submit();
          }}
        />
      </Field>

      <FieldSet>
        <FieldLegend variant="label">
          {t('entry.type_driver')} / {t('entry.type_passenger')}
        </FieldLegend>
        <ToggleGroup
          type="single"
          value={type}
          onValueChange={(v) => v && setType(v as ParticipantType)}
          variant="outline"
          className="w-full"
        >
          <ToggleGroupItem
            value="driver"
            aria-label={t('entry.type_driver')}
            className="h-auto flex-1 flex-col gap-1 py-3"
          >
            <Car className="size-5" />
            <div className="text-sm font-medium">{t('entry.type_driver')}</div>
            <div className="text-muted-foreground text-xs">
              {t('entry.type_driver_hint')}
            </div>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="passenger"
            aria-label={t('entry.type_passenger')}
            className="h-auto flex-1 flex-col gap-1 py-3"
          >
            <User className="size-5" />
            <div className="text-sm font-medium">
              {t('entry.type_passenger')}
            </div>
            <div className="text-muted-foreground text-xs">
              {t('entry.type_passenger_hint')}
            </div>
          </ToggleGroupItem>
        </ToggleGroup>
        <FieldDescription>
          {type === 'driver'
            ? t('entry.type_driver_hint')
            : t('entry.type_passenger_hint')}
        </FieldDescription>
      </FieldSet>
    </FieldGroup>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{desc}</DialogDescription>
          </DialogHeader>
          {body}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={submit} disabled={disabled}>
              → {t('entry.enter_room')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // 手機 → Drawer
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="text-center">
          <DrawerTitle className="text-base">{title}</DrawerTitle>
          <DrawerDescription>{desc}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2">{body}</div>

        <DrawerFooter>
          <Button onClick={submit} disabled={disabled}>
            → {t('entry.enter_room')}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
