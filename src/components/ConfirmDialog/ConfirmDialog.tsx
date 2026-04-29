import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

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
import { useMediaQuery } from '@/hooks/useMediaQuery';

export interface ConfirmOptions {
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

interface PendingState {
  options: ConfirmOptions;
  resolve: (v: boolean) => void;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * 全站 ConfirmProvider · 取代原生 window.confirm。
 * 提供 useConfirm hook、回傳 Promise<boolean>。
 *
 * Responsive Dialog 模式：
 *   桌機 (md+) → shadcn Dialog（置中 modal）
 *   手機       → shadcn Drawer（從底部滑上來，更好點）
 *
 * 兩者底層都是 Radix → focus trap / scroll lock / Esc / outside click 自動。
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [state, setState] = useState<PendingState | null>(null);

  const confirm: ConfirmFn = useCallback(
    (options) =>
      new Promise<boolean>((resolve) => {
        setState({ options, resolve });
      }),
    []
  );

  const respond = useCallback((value: boolean) => {
    setState((s) => {
      s?.resolve(value);
      return null;
    });
  }, []);

  const open = state !== null;
  const onOpenChange = (next: boolean) => {
    if (!next && state) respond(false);
  };

  const title = state?.options.title ?? t('common.confirm');
  const message = state?.options.message ?? '';
  const cancelText = state?.options.cancelText ?? t('common.cancel');
  const confirmText = state?.options.confirmText ?? t('common.confirm');
  const isDanger = state?.options.variant === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {state && (
            <DialogContent showCloseButton={false} className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="whitespace-pre-line text-foreground leading-relaxed">
                  {message}
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <Button variant="outline" onClick={() => respond(false)}>
                  {cancelText}
                </Button>
                <Button
                  variant={isDanger ? 'destructive' : 'default'}
                  onClick={() => respond(true)}
                  autoFocus
                >
                  {confirmText}
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={onOpenChange}>
          {state && (
            <DrawerContent className="mx-auto max-w-md">
              <DrawerHeader className="text-center">
                <DrawerTitle>{title}</DrawerTitle>
                <DrawerDescription className="whitespace-pre-line text-foreground leading-relaxed">
                  {message}
                </DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <Button
                  variant={isDanger ? 'destructive' : 'default'}
                  onClick={() => respond(true)}
                  autoFocus
                >
                  {confirmText}
                </Button>
                <Button variant="outline" onClick={() => respond(false)}>
                  {cancelText}
                </Button>
              </DrawerFooter>
            </DrawerContent>
          )}
        </Drawer>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return ctx;
}
