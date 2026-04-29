import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ActionItem {
  label: string;
  onSelect: () => void;
  variant?: 'default' | 'danger';
  icon?: string; // 簡單前綴符號
}

interface RowActionsMenuProps {
  items: ActionItem[];
}

/**
 * 列尾的 ⋯ 動作選單。
 * 用 shadcn DropdownMenu (Radix) → focus trap / keyboard nav / outside click / portal 全自動。
 */
export function RowActionsMenu({ items }: RowActionsMenuProps) {
  if (items.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="row actions"
          className="size-8"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        {items.map((item, i) => (
          <DropdownMenuItem
            key={i}
            variant={item.variant === 'danger' ? 'destructive' : 'default'}
            onSelect={() => item.onSelect()}
          >
            {item.icon && (
              <span className="inline-block w-3.5 text-center">{item.icon}</span>
            )}
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
