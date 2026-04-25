import { useEffect, useRef, useState } from 'react';

import styles from './RowActionsMenu.module.scss';

export interface ActionItem {
  label: string;
  onSelect: () => void;
  variant?: 'default' | 'danger';
  icon?: string; // 簡單的前綴符號
}

interface RowActionsMenuProps {
  items: ActionItem[];
}

/**
 * 列尾的 ⋯ 動作選單。click 開、外點 / Esc 關。
 * 用於 DriverTable 把多個 row-level actions 收進一個 popover、避免狀態欄擁擠。
 */
export function RowActionsMenu({ items }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="row actions"
      >
        ⋯
      </button>
      {open && (
        <ul className={styles.menu} role="menu">
          {items.map((item, i) => (
            <li key={i} role="none">
              <button
                type="button"
                role="menuitem"
                className={`${styles.item} ${item.variant === 'danger' ? styles.itemDanger : ''}`}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
