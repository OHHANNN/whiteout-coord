import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const menuRef = useRef<HTMLUListElement>(null);
  // 用 portal 渲染到 body 才能跳出 .tableWrap 的 overflow clip；位置即時算
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // 捲動 / resize 時關掉，省去重新定位的複雜度
    const handleScroll = () => setOpen(false);
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  // 開啟時根據 trigger 的位置算 menu 座標（right-anchor，跟原本 right: 0 對齊一致）
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const trigger = wrapRef.current?.querySelector('button');
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      right: window.innerWidth - r.right,
    });
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
      {open &&
        pos &&
        createPortal(
          <ul
            ref={menuRef}
            className={styles.menu}
            role="menu"
            style={{ top: pos.top, right: pos.right }}
          >
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
          </ul>,
          document.body
        )}
    </div>
  );
}
