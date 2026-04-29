import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from 'lucide-react';

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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { formatDuration, parseMarchInput } from '@/lib/time';

interface AddDriverModalProps {
  open: boolean;
  initialName?: string;
  initialMarchSeconds?: number;
  mode?: 'add' | 'edit';
  onClose: () => void;
  onSubmit: (name: string, marchSeconds: number) => Promise<void> | void;
}

/**
 * 指揮官代為新增 / 編輯 manual 車頭的 modal。
 * 表單只收名字 + 行軍時間，其他欄位留給 row 內 inline 編輯。
 */
export function AddDriverModal({
  open,
  initialName = '',
  initialMarchSeconds,
  mode = 'add',
  onClose,
  onSubmit,
}: AddDriverModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [marchInput, setMarchInput] = useState(
    initialMarchSeconds != null ? formatDuration(initialMarchSeconds) : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const adjustMarch = (delta: number) => {
    const cur = parseMarchInput(marchInput);
    const base = cur != null ? cur : 0;
    const next = Math.max(0, Math.min(600, base + delta));
    setMarchInput(formatDuration(next));
  };

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setMarchInput(
      initialMarchSeconds != null ? formatDuration(initialMarchSeconds) : ''
    );
    setError(null);
    setSubmitting(false);
  }, [open, initialName, initialMarchSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('room.add_driver_err_name'));
      return;
    }
    if (trimmed.length > 20) {
      setError(t('room.add_driver_err_name_too_long'));
      return;
    }
    const seconds = parseMarchInput(marchInput);
    if (seconds == null || seconds < 0 || seconds > 600) {
      setError(t('room.add_driver_err_march'));
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(trimmed, seconds);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !submitting) onClose();
      }}
    >
      <DialogContent
        onPointerDownOutside={(e) => {
          if (submitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (submitting) e.preventDefault();
        }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          window.setTimeout(() => nameRef.current?.focus(), 30);
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? t('room.edit_driver') : t('room.add_driver')}
          </DialogTitle>
          <DialogDescription>{t('room.add_driver_hint')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} id="manual-driver-form">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="manual-name">{t('room.col_driver')}</FieldLabel>
              <Input
                id="manual-name"
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder={t('entry.name_placeholder')}
                autoComplete="off"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="manual-march">{t('room.col_march')}</FieldLabel>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => adjustMarch(-1)}
                  aria-label="decrease"
                >
                  <Minus />
                </Button>
                <Input
                  id="manual-march"
                  type="text"
                  inputMode="numeric"
                  value={marchInput}
                  onChange={(e) => setMarchInput(e.target.value)}
                  placeholder="MM:SS"
                  className="mono-nums max-w-32 text-center"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => adjustMarch(1)}
                  aria-label="increase"
                >
                  <Plus />
                </Button>
              </div>
              <FieldDescription>{t('room.march_input_hint')}</FieldDescription>
            </Field>

            {error && (
              <p className="text-destructive text-sm break-words" role="alert">
                {error}
              </p>
            )}
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="manual-driver-form" disabled={submitting}>
            {mode === 'edit' ? t('common.confirm') : t('room.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
